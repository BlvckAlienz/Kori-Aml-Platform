import os
from supabase import create_client, Client
import logging

logger = logging.getLogger(__name__)

_supabase = None

def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set")
        _supabase = create_client(url, key)
    return _supabase

def log_ingestion(transaction: dict):
    try:
        supabase = get_supabase()
        data = {
            "transaction_id": transaction["transaction_id"],
            "user_id": transaction["user_id"],
            "amount": transaction["amount"],
            "timestamp": transaction["timestamp"],
            "raw_data": transaction,
            "status": "ingested"
        }
        supabase.table("transactions").insert(data).execute()
    except Exception as e:
        logger.error(f"Supabase log failed: {e}")