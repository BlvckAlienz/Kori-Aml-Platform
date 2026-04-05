"""
Kori AML Processor – Multi-Market Edition (Nigeria + Kenya) v1.1
- BLPOP timeout=30s (was 5s) → 6x fewer Redis commands → free tier safe
- Kenya telco detection: Safaricom, Airtel KE, Telkom KE, Equitel, Faiba
- Market-aware risk rules (NGN vs KES thresholds, EAT timezone, M-PESA limits)
"""
import os, json, time, logging, threading
from datetime import datetime, timezone
from dotenv import load_dotenv
from flask import Flask, jsonify
import redis as redis_lib
from neo4j import GraphDatabase
from supabase import create_client

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s - %(message)s")
logger = logging.getLogger("kori.processor")

RISK_THRESHOLD = float(os.getenv("RISK_THRESHOLD", "0.8"))
QUEUE_KEY = os.getenv("REDIS_QUEUE_KEY", "transactions_queue")
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "20"))
# KEY CHANGE: 30s timeout = 2 Redis calls/min = ~86K/month vs 518K at 5s
BLPOP_TIMEOUT = int(os.getenv("BLPOP_TIMEOUT", "30"))


def _connect_with_retry(init_fn, name, retries=5, backoff=3):
    for attempt in range(1, retries + 1):
        try:
            client = init_fn()
            logger.info(f"{name} connected")
            return client
        except Exception as e:
            logger.warning(f"{name} attempt {attempt}/{retries}: {e}")
            if attempt < retries:
                time.sleep(backoff * attempt)
    raise RuntimeError(f"Cannot connect to {name}")


redis_client = _connect_with_retry(
    lambda: redis_lib.from_url(os.getenv("REDIS_URL", "redis://localhost:6379")), "Redis")
neo4j_driver = _connect_with_retry(
    lambda: GraphDatabase.driver(os.getenv("NEO4J_URI"),
        auth=(os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASSWORD"))), "Neo4j")
supabase = _connect_with_retry(
    lambda: create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY")), "Supabase")


# --- Nigeria telcos ---
NG_NETWORKS = {
    "MTN":    ("0703","0706","0803","0806","0810","0813","0814","0816","0903","0906","0913","0916"),
    "Airtel": ("0701","0708","0802","0808","0812","0901","0902","0904","0907","0912"),
    "Glo":    ("0705","0805","0807","0811","0815","0905","0915"),
    "9mobile":("0809","0817","0818","0909","0908"),
}

# --- Kenya telcos (CAK Numbering Plan 2024) ---
KE_NETWORKS = {
    "Safaricom": (
        "0700","0701","0702","0703","0704","0705","0706","0707","0708","0709",
        "0710","0711","0712","0713","0714","0715","0716","0717","0718","0719",
        "0720","0721","0722","0723","0724","0725","0726","0727","0728","0729",
        "0740","0741","0742","0743","0744","0745","0746","0748","0749",
        "0757","0758","0759","0768","0769",
        "0790","0791","0792","0793","0794","0795","0796","0797","0798","0799",
        "0110","0111","0112","0113","0114","0115",
    ),
    "Airtel Kenya": (
        "0730","0731","0732","0733","0734","0735","0736","0737","0738","0739",
        "0750","0751","0752","0753","0754","0755","0756",
        "0785","0786","0787","0788","0789",
        "0100","0101","0102",
    ),
    "Telkom Kenya": ("0770","0771","0772","0773","0774","0775","0776","0777","0778","0779"),
    "Equitel":      ("0763","0764","0765","0766"),
    "Faiba":        ("0747",),
}


def _detect_market(phone):
    if not phone:
        return "unknown"
    clean = phone.strip().lstrip("+")
    if clean.startswith("254"):
        return "KE"
    if clean.startswith("234"):
        return "NG"
    prefix4 = phone[:4]
    for c in KE_NETWORKS.values():
        if prefix4 in c:
            return "KE"
    for c in NG_NETWORKS.values():
        if prefix4 in c:
            return "NG"
    return "unknown"


def _infer_network(phone):
    if not phone:
        return "unknown"
    prefix4 = phone[:4]
    for network, codes in {**KE_NETWORKS, **NG_NETWORKS}.items():
        if prefix4 in codes:
            return network
    return "unknown"


def _check_blocklist(tx):
    score = 0.0
    breakdown = []
    try:
        for itype, value, contribution, label in [
            ("phone",  tx.get("phone"),         0.5, "Phone on blocklist"),
            ("ip",     tx.get("ip_address"),     0.4, "IP on blocklist"),
            ("wallet", tx.get("wallet_address"), 0.6, "Wallet on blocklist"),
        ]:
            if not value:
                continue
            res = supabase.table("blocklist").select("id").eq("type", itype).eq("value", value).execute()
            if res.data:
                score += contribution
                breakdown.append({"reason": label, "contribution": contribution})
    except Exception as e:
        logger.error(f"Blocklist check error: {e}")
    return min(score, 1.0), breakdown


def calculate_risk(tx):
    score = 0.0
    breakdown = []
    amount = tx.get("amount", 0)
    market = _detect_market(tx.get("phone", ""))
    channel = tx.get("channel", "").lower()
    network = _infer_network(tx.get("phone", ""))

    # Amount rules (market-aware)
    if market == "KE":
        if amount > 2_000_000:
            score += 0.5; breakdown.append({"reason": "Amount > KES 2M", "contribution": 0.5})
        elif amount > 500_000:
            score += 0.4; breakdown.append({"reason": "Amount > KES 500K", "contribution": 0.4})
        elif amount > 150_000:
            score += 0.3; breakdown.append({"reason": "Amount > KES 150K (CBK threshold)", "contribution": 0.3})
    else:
        if amount > 5_000_000:
            score += 0.5; breakdown.append({"reason": "Amount > NGN 5M", "contribution": 0.5})
        elif amount > 1_000_000:
            score += 0.4; breakdown.append({"reason": "Amount > NGN 1M", "contribution": 0.4})
        elif amount > 500_000:
            score += 0.3; breakdown.append({"reason": "Amount > NGN 500K", "contribution": 0.3})

    # Blocklist
    bl_score, bl_items = _check_blocklist(tx)
    score += bl_score
    breakdown.extend(bl_items)

    # Off-hours (market timezone)
    try:
        ts = datetime.fromisoformat(tx.get("timestamp", "").replace("Z", "+00:00"))
        utc_offset = 3 if market == "KE" else 1  # EAT vs WAT
        hour = (ts.hour + utc_offset) % 24
        if 0 <= hour <= 4:
            tz = "EAT" if market == "KE" else "WAT"
            score += 0.15; breakdown.append({"reason": f"Off-hours (00-04 {tz})", "contribution": 0.15})
    except Exception:
        pass

    # Round-number structuring
    divisor = 100_000 if market == "KE" else 1_000_000
    if amount > 0 and amount % divisor == 0:
        score += 0.1; breakdown.append({"reason": "Round-number structuring signal", "contribution": 0.1})

    # Kenya M-PESA limit breach
    if market == "KE" and channel in ("mpesa", "m-pesa", "mobile_money", "mpesa_paybill", "mpesa_till"):
        if amount > 70_000:  # KES 70K single tx limit
            score += 0.2; breakdown.append({"reason": "M-PESA exceeds per-tx limit (KES 70K)", "contribution": 0.2})

    # Equitel (Equity Bank MVNO) high-value flag
    if market == "KE" and network == "Equitel" and amount > 500_000:
        score += 0.1; breakdown.append({"reason": "Equitel high-value (bank-linked MVNO)", "contribution": 0.1})

    return min(score, 1.0), breakdown


def update_graph(tx, risk_score):
    market = _detect_market(tx.get("phone", ""))
    network = _infer_network(tx.get("phone", ""))
    try:
        with neo4j_driver.session() as session:
            session.run("""
                MERGE (t:Transaction {transaction_id: $tid})
                SET t.amount=$amount, t.timestamp=datetime($ts),
                    t.risk_score=$risk, t.is_fraud=$fraud,
                    t.channel=$channel, t.market=$market
            """, tid=tx["transaction_id"], amount=tx["amount"],
                ts=tx.get("timestamp", datetime.now(timezone.utc).isoformat()),
                risk=risk_score, fraud=tx.get("is_fraud", False),
                channel=tx.get("channel", "unknown"), market=market)
            if tx.get("user_id"):
                session.run("""
                    MERGE (u:User {user_id: $uid})
                    ON CREATE SET u.created_at=datetime(), u.market=$market
                    MERGE (u)-[:MADE_TRANSACTION]->(t:Transaction {transaction_id: $tid})
                """, uid=tx["user_id"], tid=tx["transaction_id"], market=market)
            if tx.get("ip_address"):
                session.run("""
                    MERGE (i:IP {ip_address: $ip})
                    ON CREATE SET i.created_at=datetime()
                    MERGE (t:Transaction {transaction_id: $tid})-[:FROM_IP]->(i)
                """, ip=tx["ip_address"], tid=tx["transaction_id"])
            if tx.get("phone"):
                session.run("""
                    MERGE (s:SIM {phone_number: $phone})
                    ON CREATE SET s.created_at=datetime(), s.network=$network, s.market=$market
                    MERGE (t:Transaction {transaction_id: $tid})-[:USED_SIM]->(s)
                """, phone=tx["phone"], network=network, market=market, tid=tx["transaction_id"])
            if tx.get("wallet_address"):
                session.run("""
                    MERGE (w:Wallet {address: $wallet})
                    ON CREATE SET w.created_at=datetime()
                    MERGE (t:Transaction {transaction_id: $tid})-[:USED_WALLET]->(w)
                """, wallet=tx["wallet_address"], tid=tx["transaction_id"])
            if tx.get("merchant_id"):
                session.run("""
                    MERGE (m:Merchant {merchant_id: $mid})
                    ON CREATE SET m.created_at=datetime()
                    MERGE (t:Transaction {transaction_id: $tid})-[:TO_MERCHANT]->(m)
                """, mid=tx["merchant_id"], tid=tx["transaction_id"])
    except Exception as e:
        logger.error(f"Graph error [{tx.get('transaction_id')}]: {e}")


def _update_tx_breakdown(tx_id, breakdown, risk_score):
    try:
        supabase.table("transactions").update(
            {"risk_breakdown": breakdown, "risk_score": risk_score}
        ).eq("transaction_id", tx_id).execute()
    except Exception as e:
        logger.error(f"Breakdown update failed [{tx_id}]: {e}")


def _create_alert(tx, risk_score, breakdown):
    try:
        desc = f"Risk {risk_score:.2f}: " + " · ".join(
            f"{b['reason']} (+{int(b['contribution']*100)}%)" for b in breakdown)
        supabase.table("alerts").insert({
            "transaction_id": tx["transaction_id"],
            "entity_id": tx.get("user_id"),
            "risk_score": risk_score,
            "description": desc,
            "status": "open",
        }).execute()
        supabase.table("audit_logs").insert({
            "action_type": "alert_created",
            "user_id": "processor",
            "entity_id": tx["transaction_id"],
            "new_value": {"risk_score": risk_score},
        }).execute()
    except Exception as e:
        logger.error(f"Alert creation failed [{tx.get('transaction_id')}]: {e}")


def process_one(raw):
    tx = json.loads(raw)
    tx_id = tx.get("transaction_id", "?")
    market = _detect_market(tx.get("phone", ""))
    try:
        risk_score, breakdown = calculate_risk(tx)
        _update_tx_breakdown(tx_id, breakdown, risk_score)
        update_graph(tx, risk_score)
        if risk_score >= RISK_THRESHOLD:
            _create_alert(tx, risk_score, breakdown)
            logger.warning(f"ALERT [{tx_id}] market={market} risk={risk_score:.2f}")
        else:
            logger.info(f"OK [{tx_id}] market={market} risk={risk_score:.2f}")
    except Exception as e:
        logger.error(f"process_one [{tx_id}]: {e}")


def continuous_process():
    logger.info(f"Loop started blpop_timeout={BLPOP_TIMEOUT}s threshold={RISK_THRESHOLD} markets=NG,KE")
    while True:
        try:
            item = redis_client.blpop(QUEUE_KEY, timeout=BLPOP_TIMEOUT)
            if item:
                _, raw = item
                process_one(raw)
        except redis_lib.ConnectionError as e:
            logger.error(f"Redis lost: {e} - retrying in 10s")
            time.sleep(10)
        except Exception as e:
            logger.error(f"Loop error: {e}")
            time.sleep(2)


app = Flask(__name__)

@app.route("/health")
def health():
    return jsonify({"status": "healthy", "service": "kori-processor",
        "version": "1.1.0", "markets": ["NG", "KE"], "blpop_timeout": BLPOP_TIMEOUT,
        "timestamp": datetime.now(timezone.utc).isoformat()})

@app.route("/process")
def trigger_batch():
    processed = 0
    for _ in range(BATCH_SIZE):
        item = redis_client.lpop(QUEUE_KEY)
        if not item: break
        process_one(item)
        processed += 1
    return jsonify({"processed": processed})

@app.route("/queue-length")
def queue_length():
    return jsonify({"queue_length": redis_client.llen(QUEUE_KEY), "queue_key": QUEUE_KEY})

if __name__ == "__main__":
    threading.Thread(target=continuous_process, daemon=True).start()
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)