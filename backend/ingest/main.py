import os
from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
from models import TransactionPayload
from redis_producer import send_to_queue
from supabase_client import log_ingestion

load_dotenv()

app = FastAPI(title="AML Transaction Ingest")

@app.post("/webhook")
async def ingest_transaction(tx: TransactionPayload):
    if tx.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    tx_dict = tx.dict()
    log_ingestion(tx_dict)
    success = send_to_queue(tx_dict)
    if not success:
        raise HTTPException(status_code=500, detail="Redis error")
    return {"status": "accepted", "tx_id": tx.transaction_id}

@app.get("/health")
async def health():
    return {"status": "ok"}