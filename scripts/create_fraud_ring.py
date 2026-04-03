import requests, uuid, random

base_url = "https://ingest-service-0q7z.onrender.com"
shared_ip = "203.0.113.45"
shared_phone = "08012340001"

for i in range(3):
    tx_id = f"fraud_ring_{i}_{uuid.uuid4().hex[:8]}"
    payload = {
        "transaction_id": tx_id,
        "user_id": f"ring_user_{i}",
        "amount": random.randint(500000, 2000000),
        "timestamp": "2025-04-03T14:00:00Z",
        "ip_address": shared_ip,
        "phone": shared_phone,
        "wallet_address": f"0x_wallet_{i}",
        "merchant_id": "merchant_fake",
        "is_fraud": False
    }
    resp = requests.post(f"{base_url}/webhook", json=payload)
    print(resp.json())