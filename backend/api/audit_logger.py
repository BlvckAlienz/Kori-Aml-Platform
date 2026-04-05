"""
audit_logger.py – Centralised audit trail for CBN §5.1.6 compliance.
Every action that modifies state must call log_action().
"""
import logging
import os
from typing import Any, Optional
from supabase import create_client

logger = logging.getLogger("kori.audit")

_supabase = None

def _get_supabase():
    global _supabase
    if _supabase is None:
        _supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
    return _supabase


def log_action(
    action_type: str,
    user_id: Optional[str] = None,
    entity_id: Optional[str] = None,
    old_value: Optional[Any] = None,
    new_value: Optional[Any] = None,
    ip_address: Optional[str] = None,
) -> None:
    """
    Persist an audit record. Called as a BackgroundTask so it never
    blocks the main request path.
    """
    try:
        record = {
            "action_type": action_type,
            "user_id": user_id or "system",
            "entity_id": entity_id,
            "old_value": old_value,
            "new_value": new_value,
            "ip_address": ip_address,
        }
        _get_supabase().table("audit_logs").insert(record).execute()
    except Exception as e:
        # Audit failures must never crash the platform
        logger.error(f"Audit log failed [{action_type}]: {e}")