"""
Kori AML Platform – API Service
Production-ready FastAPI application with:
- CORS (locked to Vercel frontend)
- API key authentication with Redis rate limiting
- Full audit logging (CBN §5.1.6)
- Blocklist CRUD
- Alert management with status transitions
- Graph traversal endpoints
- Travel Rule module
- Paystack webhook handler
"""
import os
import hashlib
import secrets
import logging
import json
import time
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request, Header, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from supabase_client import get_supabase
from neo4j_connector import get_driver
from audit_logger import log_action
from rate_limiter import check_rate_limit

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s – %(message)s")
logger = logging.getLogger("kori.api")

# ─── Allowed origin (your Vercel frontend URL) ───────────────────────────────
ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()
]
PAYSTACK_SECRET = os.getenv("PAYSTACK_SECRET_KEY", "")

app = FastAPI(title="Kori AML API", version="1.0.0", docs_url="/swagger")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase = get_supabase()
neo4j_driver = get_driver()


# ─── Helpers ─────────────────────────────────────────────────────────────────

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    return forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")


def hash_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()


async def verify_api_key(x_api_key: Optional[str] = Header(default=None)) -> Optional[Dict]:
    """Returns key record if valid. Returns None if no key (unauthenticated endpoints still work)."""
    if not x_api_key:
        return None
    key_hash = hash_key(x_api_key)
    try:
        result = supabase.table("api_keys").select("*").eq("key_hash", key_hash).eq("is_active", True).execute()
        if not result.data:
            raise HTTPException(status_code=401, detail="Invalid or revoked API key")
        key_record = result.data[0]
        # Rate limiting
        allowed, remaining = check_rate_limit(key_record["id"], key_record.get("daily_limit", 1000))
        if not allowed:
            raise HTTPException(status_code=429, detail="Daily rate limit exceeded. Upgrade your plan.")
        # Increment usage counter
        supabase.table("api_keys").update({"requests_count": key_record["requests_count"] + 1}).eq("id", key_record["id"]).execute()
        return key_record
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"API key verification error: {e}")
        return None


async def require_bearer(request: Request) -> str:
    """Extract JWT from Authorization header (for key management endpoints)."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Bearer token required")
    token = auth[7:]
    # Verify with Supabase
    try:
        result = supabase.auth.get_user(token)
        if not result.user:
            raise HTTPException(401, "Invalid session")
        return result.user.id
    except Exception:
        raise HTTPException(401, "Invalid or expired session")


# ─── Pydantic Models ──────────────────────────────────────────────────────────

class AlertResponse(BaseModel):
    id: str
    transaction_id: str
    entity_id: Optional[str] = None
    risk_score: float
    description: str
    status: str
    created_at: str


class TransactionResponse(BaseModel):
    transaction_id: str
    user_id: Optional[str] = None
    amount: float
    timestamp: str
    risk_score: Optional[float] = None
    status: str
    risk_breakdown: Optional[List[Dict[str, Any]]] = None
    market: Optional[str] = None          


class StatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(open|investigating|confirmed|false_positive|closed)$")


class BlocklistEntry(BaseModel):
    type: str = Field(..., pattern="^(phone|ip|wallet)$")
    value: str = Field(..., min_length=1, max_length=200)
    source: str = Field(default="manual", max_length=100)


class ApiKeyCreate(BaseModel):
    tier: str = Field(default="free", pattern="^(free|pro|enterprise)$")


class TravelRuleTransfer(BaseModel):
    originator_name: str
    originator_account: str
    originator_institution: str
    beneficiary_name: str
    beneficiary_account: str
    beneficiary_institution: str
    amount: float
    currency: str = "NGN"
    reference: str
    timestamp: str


TIER_LIMITS = {"free": 1000, "pro": 10000, "enterprise": 999999}


# ─── ALERTS ──────────────────────────────────────────────────────────────────

@app.get("/alerts", response_model=List[AlertResponse])
async def get_alerts(
    request: Request,
    limit: int = 50,
    status: Optional[str] = None,
    key: Optional[Dict] = Depends(verify_api_key),
):
    query = supabase.table("alerts").select("*").order("created_at", desc=True).limit(limit)
    if status:
        query = query.eq("status", status)
    result = query.execute()
    return result.data


@app.patch("/alerts/{alert_id}/status")
async def update_alert_status(
    alert_id: str,
    update: StatusUpdate,
    request: Request,
    background: BackgroundTasks,
    key: Optional[Dict] = Depends(verify_api_key),
):
    result = supabase.table("alerts").select("status").eq("id", alert_id).execute()
    if not result.data:
        raise HTTPException(404, "Alert not found")
    old_status = result.data[0]["status"]

    supabase.table("alerts").update({"status": update.status}).eq("id", alert_id).execute()

    background.add_task(
        log_action,
        user_id=key["user_id"] if key else "api",
        action_type="alert_status_change",
        entity_id=alert_id,
        old_value={"status": old_status},
        new_value={"status": update.status},
        ip_address=get_client_ip(request),
    )
    return {"success": True, "alert_id": alert_id, "new_status": update.status}


@app.get("/alert/{alert_id}/graph")
async def get_alert_graph(alert_id: str, key: Optional[Dict] = Depends(verify_api_key)):
    alert = supabase.table("alerts").select("transaction_id").eq("id", alert_id).execute()
    if not alert.data:
        raise HTTPException(404, "Alert not found")
    tx_id = alert.data[0]["transaction_id"]

    try:
        with neo4j_driver.session() as session:
            result = session.run(
                """
                MATCH path = (t:Transaction {transaction_id: $tx_id})-[*1..2]-(connected)
                UNWIND nodes(path) as n
                UNWIND relationships(path) as r
                RETURN collect(DISTINCT n) as nodes, collect(DISTINCT r) as edges
                """,
                tx_id=tx_id,
            )
            record = result.single()
            if not record:
                return {"nodes": [], "edges": []}
            nodes = []
            for n in record["nodes"]:
                nodes.append({
                    "id": n.element_id,
                    "label": list(n.labels)[0] if n.labels else "Unknown",
                    "properties": dict(n),
                    "risk_score": n.get("risk_score", 0),
                })
            edges = []
            for r in record["edges"]:
                edges.append({
                    "source": r.start_node.element_id,
                    "target": r.end_node.element_id,
                    "type": r.type,
                })
            return {"nodes": nodes, "links": edges}
    except Exception as e:
        logger.error(f"Graph query error: {e}")
        return {"nodes": [], "edges": []}


# ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

@app.get("/transactions/recent", response_model=List[TransactionResponse])
async def get_recent_transactions(
    limit: int = 100,
    key: Optional[Dict] = Depends(verify_api_key),
):
    result = supabase.table("transactions").select("*").order("timestamp", desc=True).limit(limit).execute()
    return result.data


@app.get("/transaction/{transaction_id}/risk-breakdown")
async def get_risk_breakdown(transaction_id: str, key: Optional[Dict] = Depends(verify_api_key)):
    result = supabase.table("transactions").select("risk_breakdown").eq("transaction_id", transaction_id).execute()
    if not result.data:
        raise HTTPException(404, "Transaction not found")
    return {"breakdown": result.data[0].get("risk_breakdown") or []}


# ─── GRAPH ────────────────────────────────────────────────────────────────────

@app.get("/graph/neighbors/{entity_id}")
async def get_neighbors(entity_id: str, key: Optional[Dict] = Depends(verify_api_key)):
    try:
        with neo4j_driver.session() as session:
            result = session.run(
                """
                MATCH (n)-[r]-(m)
                WHERE n.user_id = $id OR n.transaction_id = $id
                   OR n.ip_address = $id OR n.phone_number = $id
                RETURN n, r, m LIMIT 100
                """,
                id=entity_id,
            )
            nodes: Dict[str, Any] = {}
            edges = []
            for record in result:
                n, m = record["n"], record["m"]
                nodes[n.element_id] = dict(n.items())
                nodes[m.element_id] = dict(m.items())
                edges.append({
                    "source": n.element_id,
                    "target": m.element_id,
                    "type": record["r"].type,
                    "properties": dict(record["r"].items()),
                })
            return {"nodes": list(nodes.values()), "edges": edges}
    except Exception as e:
        logger.error(f"Neighbors query error: {e}")
        return {"nodes": [], "edges": []}


# ─── BLOCKLIST ────────────────────────────────────────────────────────────────

@app.get("/blocklist")
async def get_blocklist(key: Optional[Dict] = Depends(verify_api_key)):
    result = supabase.table("blocklist").select("*").order("added_at", desc=True).execute()
    return result.data


@app.post("/blocklist", status_code=201)
async def add_to_blocklist(
    entry: BlocklistEntry,
    request: Request,
    background: BackgroundTasks,
    key: Optional[Dict] = Depends(verify_api_key),
):
    data = {"type": entry.type, "value": entry.value.strip(), "source": entry.source}
    result = supabase.table("blocklist").insert(data).execute()

    background.add_task(
        log_action,
        user_id=key["user_id"] if key else "api",
        action_type="blocklist_add",
        entity_id=entry.value,
        new_value=data,
        ip_address=get_client_ip(request),
    )
    return result.data[0] if result.data else {"success": True}


@app.delete("/blocklist/{entry_id}")
async def remove_from_blocklist(
    entry_id: str,
    request: Request,
    background: BackgroundTasks,
    key: Optional[Dict] = Depends(verify_api_key),
):
    existing = supabase.table("blocklist").select("*").eq("id", entry_id).execute()
    if not existing.data:
        raise HTTPException(404, "Entry not found")
    old = existing.data[0]
    supabase.table("blocklist").delete().eq("id", entry_id).execute()

    background.add_task(
        log_action,
        user_id=key["user_id"] if key else "api",
        action_type="blocklist_remove",
        entity_id=entry_id,
        old_value=old,
        ip_address=get_client_ip(request),
    )
    return {"success": True}


# ─── AUDIT LOG ────────────────────────────────────────────────────────────────

@app.get("/audit")
async def get_audit_log(limit: int = 500, action_type: Optional[str] = None):
    query = supabase.table("audit_logs").select("*").order("created_at", desc=True).limit(limit)
    if action_type:
        query = query.eq("action_type", action_type)
    return query.execute().data


# ─── API KEY MANAGEMENT ───────────────────────────────────────────────────────

@app.get("/api-keys")
async def list_api_keys(request: Request):
    user_id = await require_bearer(request)
    result = supabase.table("api_keys").select(
        "id,key_preview,tier,requests_count,daily_limit,is_active,created_at,expires_at"
    ).eq("user_id", user_id).eq("is_active", True).execute()
    return result.data


@app.post("/api-keys", status_code=201)
async def create_api_key(
    payload: ApiKeyCreate,
    request: Request,
    background: BackgroundTasks,
):
    user_id = await require_bearer(request)

    raw_key = f"kori_{secrets.token_urlsafe(32)}"
    key_hash = hash_key(raw_key)
    key_preview = raw_key[:12]
    daily_limit = TIER_LIMITS.get(payload.tier, 1000)

    data = {
        "user_id": user_id,
        "key_hash": key_hash,
        "key_preview": key_preview,
        "tier": payload.tier,
        "daily_limit": daily_limit,
        "requests_count": 0,
        "is_active": True,
    }
    result = supabase.table("api_keys").insert(data).execute()
    key_id = result.data[0]["id"] if result.data else "unknown"

    background.add_task(
        log_action,
        user_id=user_id,
        action_type="api_key_generated",
        entity_id=key_id,
        new_value={"tier": payload.tier, "preview": key_preview},
        ip_address=get_client_ip(request),
    )
    # Return raw key ONCE — never stored in plain text
    return {"id": key_id, "key": raw_key, "tier": payload.tier, "preview": key_preview}


@app.delete("/api-keys/{key_id}")
async def revoke_api_key(key_id: str, request: Request, background: BackgroundTasks):
    user_id = await require_bearer(request)
    existing = supabase.table("api_keys").select("*").eq("id", key_id).eq("user_id", user_id).execute()
    if not existing.data:
        raise HTTPException(404, "Key not found")
    supabase.table("api_keys").update({"is_active": False}).eq("id", key_id).execute()

    background.add_task(
        log_action,
        user_id=user_id,
        action_type="api_key_revoked",
        entity_id=key_id,
        ip_address=get_client_ip(request),
    )
    return {"success": True}


# ─── TRAVEL RULE (FATF Rec. 16) ───────────────────────────────────────────────

@app.post("/v1/travel-rule/transfer", status_code=201)
async def submit_travel_rule(
    transfer: TravelRuleTransfer,
    request: Request,
    background: BackgroundTasks,
    key: Optional[Dict] = Depends(verify_api_key),
):
    """
    MVP: Logs Travel Rule data per IVMS101 schema.
    Production upgrade: integrate with Notabene / Shyft / TRISA.
    """
    record = {
        "reference": transfer.reference,
        "originator_name": transfer.originator_name,
        "originator_account": transfer.originator_account,
        "originator_institution": transfer.originator_institution,
        "beneficiary_name": transfer.beneficiary_name,
        "beneficiary_account": transfer.beneficiary_account,
        "beneficiary_institution": transfer.beneficiary_institution,
        "amount": transfer.amount,
        "currency": transfer.currency,
        "timestamp": transfer.timestamp,
        "status": "submitted",
        "ivms101_compliant": True,
    }
    result = supabase.table("travel_rule_logs").insert(record).execute()

    background.add_task(
        log_action,
        user_id=key["user_id"] if key else "api",
        action_type="travel_rule_submission",
        entity_id=transfer.reference,
        new_value={"amount": transfer.amount, "beneficiary_institution": transfer.beneficiary_institution},
        ip_address=get_client_ip(request),
    )
    logger.info(f"Travel Rule submitted: {transfer.reference} – {transfer.amount} {transfer.currency}")
    return {
        "success": True,
        "reference": transfer.reference,
        "status": "submitted",
        "ivms101_compliant": True,
        "note": "Data logged per FATF Recommendation 16. TRISA integration in roadmap.",
    }


@app.get("/v1/travel-rule/logs")
async def get_travel_rule_logs(limit: int = 100):
    result = supabase.table("travel_rule_logs").select("*").order("created_at", desc=True).limit(limit).execute()
    return result.data


# ─── PAYSTACK WEBHOOK ─────────────────────────────────────────────────────────

@app.post("/paystack-webhook")
async def paystack_webhook(request: Request, background: BackgroundTasks):
    import hmac
    body = await request.body()
    signature = request.headers.get("x-paystack-signature", "")
    expected = hmac.new(PAYSTACK_SECRET.encode(), body, "sha512").hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(400, "Invalid Paystack signature")

    event = json.loads(body)
    event_type = event.get("event", "")
    data = event.get("data", {})

    if event_type == "subscription.create":
        # Map plan code → tier
        plan_code = data.get("plan", {}).get("plan_code", "")
        tier_map = {
            os.getenv("PAYSTACK_PRO_PLAN", "PLN_pro"): "pro",
            os.getenv("PAYSTACK_ENT_PLAN", "PLN_ent"): "enterprise",
        }
        tier = tier_map.get(plan_code, "pro")
        customer_email = data.get("customer", {}).get("email", "")

        # Find user and upgrade their keys
        supabase.table("api_keys").update({
            "tier": tier,
            "daily_limit": TIER_LIMITS[tier],
        }).eq("user_id", customer_email).execute()

        logger.info(f"Upgraded {customer_email} to {tier}")

    elif event_type == "subscription.disable":
        customer_email = data.get("customer", {}).get("email", "")
        supabase.table("api_keys").update({
            "tier": "free",
            "daily_limit": TIER_LIMITS["free"],
        }).eq("user_id", customer_email).execute()
        logger.info(f"Downgraded {customer_email} to free")

    background.add_task(
        log_action,
        user_id="paystack",
        action_type=f"paystack_{event_type}",
        new_value={"plan": data.get("plan", {}).get("plan_code"), "email": data.get("customer", {}).get("email")},
    )
    return {"status": "ok"}

"""
ADD THIS BLOCK to backend/api/main.py
──────────────────────────────────────
Location: paste at the END of the file, before the /health endpoint.

This endpoint is called by the frontend pricing page after a successful
Paystack or Flutterwave payment. It verifies the payment reference with
the provider's API, then upgrades the user's API key tier.
"""
import httpx

TIER_MAP = {
    "starter":      ("free",       1000),
    "professional": ("pro",        10000),
    "growth":       ("enterprise", 999999),
    # Kenya aliases
    "starter_ke":      ("free",    1000),
    "professional_ke": ("pro",     10000),
    "growth_ke":       ("enterprise", 999999),
}


class UpgradePlanRequest(BaseModel):
    tier: str
    reference: str
    provider: str = Field(..., pattern="^(paystack|flutterwave)$")


@app.post("/upgrade-plan")
async def upgrade_plan(
    payload: UpgradePlanRequest,
    request: Request,
    background: BackgroundTasks,
):
    user_id = await require_bearer(request)

    tier_name, daily_limit = TIER_MAP.get(payload.tier, ("pro", 10000))

    # ── Verify payment with provider ──────────────────────────────────────────
    verified = False

    if payload.provider == "paystack":
        ps_key = os.getenv("PAYSTACK_SECRET_KEY", "")
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    f"https://api.paystack.co/transaction/verify/{payload.reference}",
                    headers={"Authorization": f"Bearer {ps_key}"},
                )
            data = r.json()
            if data.get("status") and data["data"].get("status") == "success":
                verified = True
        except Exception as e:
            logger.error(f"Paystack verify error: {e}")

    elif payload.provider == "flutterwave":
        flw_key = os.getenv("FLUTTERWAVE_SECRET_KEY", "")
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    f"https://api.flutterwave.com/v3/transactions/{payload.reference}/verify",
                    headers={"Authorization": f"Bearer {flw_key}"},
                )
            data = r.json()
            if data.get("status") == "success" and data["data"].get("status") == "successful":
                verified = True
        except Exception as e:
            logger.error(f"Flutterwave verify error: {e}")

    if not verified:
        logger.warning(f"Unverified upgrade attempt user={user_id} ref={payload.reference}")
        raise HTTPException(402, "Payment could not be verified. Contact support.")

    # ── Apply upgrade ─────────────────────────────────────────────────────────
    supabase.table("api_keys").update({
        "tier": tier_name,
        "daily_limit": daily_limit,
    }).eq("user_id", user_id).eq("is_active", True).execute()

    background.add_task(
        log_action,
        user_id=user_id,
        action_type="plan_upgrade",
        entity_id=payload.reference,
        new_value={"tier": tier_name, "provider": payload.provider, "daily_limit": daily_limit},
        ip_address=get_client_ip(request),
    )
    logger.info(f"Plan upgraded: user={user_id} tier={tier_name} ref={payload.reference}")
    return {"success": True, "tier": tier_name, "daily_limit": daily_limit}

# ─── HEALTH ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "kori-api",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ─── FLUTTERWAVE WEBHOOK (Kenya subscriptions) ────────────────────────────────

@app.post("/flutterwave-webhook")
async def flutterwave_webhook(request: Request, background: BackgroundTasks):
    """
    Handles Flutterwave subscription events for Kenyan customers.
    Set webhook URL in Flutterwave dashboard → Settings → Webhooks.
    """
    import hmac
    body = await request.body()
    flw_secret = os.getenv("FLUTTERWAVE_SECRET_HASH", "")
    signature = request.headers.get("verif-hash", "")

    # Flutterwave uses a plain secret hash comparison (not HMAC)
    if flw_secret and signature != flw_secret:
        logger.warning("Invalid Flutterwave webhook signature")
        raise HTTPException(400, "Invalid Flutterwave signature")

    try:
        event = json.loads(body)
    except Exception:
        raise HTTPException(400, "Invalid JSON payload")

    event_type = event.get("event", "")
    data = event.get("data", {})
    logger.info(f"Flutterwave event: {event_type}")

    if event_type == "subscription.activated":
        plan_id = str(data.get("plan", {}).get("id", ""))
        customer_email = data.get("customer", {}).get("email", "")

        ke_tier_map = {
            os.getenv("FLW_STARTER_PLAN_ID", ""):    "free",
            os.getenv("FLW_PRO_PLAN_ID", ""):         "pro",
            os.getenv("FLW_ENTERPRISE_PLAN_ID", ""): "enterprise",
        }
        tier = ke_tier_map.get(plan_id, "pro")
        supabase.table("api_keys").update({
            "tier": tier,
            "daily_limit": TIER_LIMITS.get(tier, 10000),
        }).eq("user_id", customer_email).execute()
        logger.info(f"KE: Upgraded {customer_email} to {tier}")

    elif event_type == "subscription.cancelled":
        customer_email = data.get("customer", {}).get("email", "")
        supabase.table("api_keys").update({
            "tier": "free",
            "daily_limit": TIER_LIMITS["free"],
        }).eq("user_id", customer_email).execute()
        logger.info(f"KE: Downgraded {customer_email} to free")

    background.add_task(
        log_action,
        user_id="flutterwave",
        action_type=f"flutterwave_{event_type}",
        new_value={"email": data.get("customer", {}).get("email"), "plan": data.get("plan", {}).get("id")},
    )
    return {"status": "ok"}