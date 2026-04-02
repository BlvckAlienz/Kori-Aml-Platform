import os
import redis
import json
import logging

logger = logging.getLogger(__name__)

def get_redis():
    redis_url = os.getenv("REDIS_URL")
    return redis.from_url(redis_url)

def pop_transaction(timeout=5):
    """Block until a transaction arrives; returns None if timeout."""
    client = get_redis()
    item = client.blpop("transactions_queue", timeout=timeout)
    if item:
        _, value = item
        return json.loads(value)
    return None