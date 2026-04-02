import os
from supabase import create_client
import logging

logger = logging.getLogger(__name__)

_supabase = None

def get_supabase():
    global _supabase
    if _supabase is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        _supabase = create_client(url, key)
    return _supabase

def create_alert(tx: dict, risk_score: float):
    try:
        supabase = get_supabase()
        alert_data = {
            "transaction_id": tx["transaction_id"],
            "entity_id": tx.get("user_id"),
            "risk_score": risk_score,
            "description": f"High risk transaction: amount {tx['amount']}, risk {risk_score:.2f}",
            "status": "open"
        }
        supabase.table("alerts").insert(alert_data).execute()
    except Exception as e:
        logger.error(f"Failed to create alert: {e}")