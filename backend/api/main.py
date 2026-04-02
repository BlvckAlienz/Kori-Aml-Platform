import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware   # <-- ADD THIS IMPORT
from typing import List, Optional
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase_client import get_supabase
from neo4j_connector import get_driver

load_dotenv()

app = FastAPI(title="AML API")

# ADD CORS MIDDLEWARE (allow all origins for demo; restrict later)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],            # Allows all domains (change to your Vercel URL in production)
    allow_credentials=True,
    allow_methods=["*"],            # Allows all HTTP methods (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],            # Allows all headers
)

supabase = get_supabase()
neo4j_driver = get_driver()

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

@app.get("/alerts", response_model=List[AlertResponse])
async def get_alerts(limit: int = 50, status: Optional[str] = "open"):
    query = supabase.table("alerts").select("*").order("created_at", desc=True).limit(limit)
    if status:
        query = query.eq("status", status)
    result = query.execute()
    return result.data

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