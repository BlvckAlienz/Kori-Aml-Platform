import os
import redis
import json
import logging

logger = logging.getLogger(__name__)

_redis_client = None

def get_redis():
    global _redis_client
    if _redis_client is None:
        redis_url = os.getenv("REDIS_URL")
        if not redis_url:
            raise ValueError("REDIS_URL not set")
        _redis_client = redis.from_url(redis_url)
    return _redis_client

def send_to_queue(transaction: dict) -> bool:
    try:
        client = get_redis()
        client.rpush("transactions_queue", json.dumps(transaction))
        return True
    except Exception as e:
        logger.error(f"Redis error: {e}")
        return False