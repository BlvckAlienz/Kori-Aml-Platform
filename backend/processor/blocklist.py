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

def check_blocklist(tx: dict) -> float:
    supabase = get_supabase()
    score = 0.0
    
    # Check phone
    if tx.get("phone"):
        res = supabase.table("blocklist").select("id").eq("type", "phone").eq("value", tx["phone"]).execute()
        if res.data:
            score += 0.5
    
    # Check IP
    if tx.get("ip_address"):
        res = supabase.table("blocklist").select("id").eq("type", "ip").eq("value", tx["ip_address"]).execute()
        if res.data:
            score += 0.4
    
    # Check wallet
    if tx.get("wallet_address"):
        res = supabase.table("blocklist").select("id").eq("type", "wallet").eq("value", tx["wallet_address"]).execute()
        if res.data:
            score += 0.6
    
    return min(score, 1.0)