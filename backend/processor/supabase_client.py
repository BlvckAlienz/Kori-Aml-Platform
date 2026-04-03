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

def update_transaction_breakdown(transaction_id: str, breakdown: list):
    try:
        supabase = get_supabase()
        supabase.table("transactions").update({"risk_breakdown": breakdown}).eq("transaction_id", transaction_id).execute()
    except Exception as e:
        logger.error(f"Failed to update breakdown: {e}")

def create_alert(tx: dict, risk_score: float, breakdown: list):
    try:
        supabase = get_supabase()
        description = f"Risk {risk_score:.2f}: " + ", ".join([f"{b['reason']} (+{b['contribution']})" for b in breakdown])
        alert_data = {
            "transaction_id": tx["transaction_id"],
            "entity_id": tx.get("user_id"),
            "risk_score": risk_score,
            "description": description,
            "status": "open"
        }
        supabase.table("alerts").insert(alert_data).execute()
    except Exception as e:
        logger.error(f"Failed to create alert: {e}")