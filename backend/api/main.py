import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase_client import get_supabase
from neo4j_connector import get_driver

load_dotenv()

app = FastAPI(title="AML API")

# CORS – allow all origins for demo (restrict later to your Vercel domain)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase = get_supabase()
neo4j_driver = get_driver()

# ========== Pydantic Models ==========
class AlertResponse(BaseModel):
    id: str
    transaction_id: str
    entity_id: Optional[str]
    risk_score: float
    description: str
    status: str
    created_at: str

class TransactionResponse(BaseModel):
    transaction_id: str
    user_id: Optional[str]
    amount: float
    timestamp: str
    risk_score: Optional[float]
    status: str
    risk_breakdown: Optional[list] = None   # New field for breakdown

class StatusUpdate(BaseModel):
    status: str  # 'open', 'investigating', 'false_positive', 'confirmed'

# ========== Existing Endpoints (kept) ==========
@app.get("/alerts", response_model=List[AlertResponse])
async def get_alerts(limit: int = 50, status: Optional[str] = "open"):
    query = supabase.table("alerts").select("*").order("created_at", desc=True).limit(limit)
    if status:
        query = query.eq("status", status)
    result = query.execute()
    return result.data

@app.patch("/alerts/{alert_id}/status")
async def update_alert_status(alert_id: str, update: StatusUpdate):
    result = supabase.table("alerts").update({"status": update.status}).eq("id", alert_id).execute()
    if not result.data:
        raise HTTPException(404, "Alert not found")
    return {"success": True}

@app.get("/transactions/recent", response_model=List[TransactionResponse])
async def get_recent_transactions(limit: int = 100):
    result = supabase.table("transactions").select("*").order("timestamp", desc=True).limit(limit).execute()
    return result.data

@app.get("/graph/neighbors/{entity_id}")
async def get_neighbors(entity_id: str):
    with neo4j_driver.session() as session:
        result = session.run(
            """
            MATCH (n)-[r]-(m)
            WHERE n.user_id = $id OR n.transaction_id = $id OR n.ip_address = $id OR n.phone_number = $id
            RETURN n, r, m
            LIMIT 100
            """,
            id=entity_id
        )
        nodes = {}
        edges = []
        for record in result:
            n = record["n"]
            m = record["m"]
            nodes[n.element_id] = dict(n.items())
            nodes[m.element_id] = dict(m.items())
            edges.append({
                "source": n.element_id,
                "target": m.element_id,
                "type": record["r"].type,
                "properties": dict(record["r"].items())
            })
        return {"nodes": list(nodes.values()), "edges": edges}

@app.get("/health")
async def health():
    return {"status": "ok"}

# ========== New Endpoints for Dashboard Enhancements ==========
@app.get("/transaction/{transaction_id}/risk-breakdown")
async def get_risk_breakdown(transaction_id: str):
    result = supabase.table("transactions").select("risk_breakdown").eq("transaction_id", transaction_id).execute()
    if not result.data:
        raise HTTPException(404, "Transaction not found")
    breakdown = result.data[0].get("risk_breakdown", [])
    return {"breakdown": breakdown}

@app.get("/alert/{alert_id}/graph")
async def get_alert_graph(alert_id: str):
    # Get transaction_id from the alert
    alert = supabase.table("alerts").select("transaction_id").eq("id", alert_id).execute()
    if not alert.data:
        raise HTTPException(404, "Alert not found")
    tx_id = alert.data[0]["transaction_id"]

    # Cypher query: 2 hops around the transaction
    with neo4j_driver.session() as session:
        result = session.run("""
            MATCH path = (t:Transaction {transaction_id: $tx_id})-[*1..2]-(connected)
            UNWIND nodes(path) as n
            UNWIND relationships(path) as r
            RETURN collect(DISTINCT n) as nodes, collect(DISTINCT r) as edges
        """, tx_id=tx_id)
        record = result.single()
        if not record:
            return {"nodes": [], "edges": []}
        nodes = []
        for n in record["nodes"]:
            nodes.append({
                "id": n.element_id,
                "label": list(n.labels)[0],
                "properties": dict(n),
                "risk_score": n.get("risk_score", 0)
            })
        edges = []
        for r in record["edges"]:
            edges.append({
                "source": r.start_node.element_id,
                "target": r.end_node.element_id,
                "type": r.type
            })
        return {"nodes": nodes, "edges": edges}