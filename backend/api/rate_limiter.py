"""
rate_limiter.py – In-memory rate limiter. Zero Redis commands.

Why: Redis free tier = 500K commands/month. Old Redis limiter used
2 commands per API request. This version uses in-memory counters,
saving Redis entirely for the transaction queue (BLPOP).

With BLPOP timeout=30s: ~86K Redis cmds/month. Free tier safe.
"""
import logging
import time

logger = logging.getLogger("kori.ratelimiter")

# { key_id: { "YYYY-MM-DD": count } }
_daily_counts: dict = {}


def check_rate_limit(key_id: str, daily_limit: int) -> tuple[bool, int]:
    """
    Returns (allowed: bool, remaining: int).
    Resets at UTC midnight. Fails open on any error.
    """
    if daily_limit >= 999999:
        return True, 999999

    try:
        today = time.strftime("%Y-%m-%d", time.gmtime())
        if key_id not in _daily_counts:
            _daily_counts[key_id] = {}
        # Purge stale dates (memory guard)
        _daily_counts[key_id] = {
            k: v for k, v in _daily_counts[key_id].items() if k == today
        }
        current = _daily_counts[key_id].get(today, 0) + 1
        _daily_counts[key_id][today] = current
        remaining = max(0, daily_limit - current)
        return current <= daily_limit, remaining
    except Exception as e:
        logger.error(f"Rate limiter error for {key_id}: {e}")
        return True, 0