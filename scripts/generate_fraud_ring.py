#!/usr/bin/env python3
"""
scripts/generate_fraud_ring.py
──────────────────────────────
Generates synthetic fraud rings for demonstrating community detection
to CBN-regulated institutions.

Usage:
  python generate_fraud_ring.py --url https://ingest-service-0q7z.onrender.com
  python generate_fraud_ring.py --url http://localhost:8000 --rings 2 --cleanup

Options:
  --url      Base URL of ingest service (required)
  --rings    Number of fraud rings to generate (default: 1)
  --cleanup  Remove generated test data from Supabase after demo
  --seed     Random seed for reproducibility

What it creates per ring:
  · 3 synthetic users
  · All 3 share 1 IP address and 1 phone number
  · 8 transactions: mix of high-value + normal
  · Adds shared phone to blocklist → triggers alerts
  · Demonstrates graph community (all 3 users connect to same IP/SIM node)
"""
import argparse
import hashlib
import json
import os
import random
import sys
import time
import uuid
from datetime import datetime, timezone, timedelta

import requests
from supabase import create_client

NETWORK_PREFIXES = [
    ("MTN", "0803"), ("Airtel", "0802"), ("Glo", "0805"), ("9mobile", "0809"),
]

def make_phone():
    network, prefix = random.choice(NETWORK_PREFIXES)
    return prefix + "".join([str(random.randint(0, 9)) for _ in range(7)])


def make_ip():
    # Nigerian IP blocks (simulated)
    return f"197.210.{random.randint(1,255)}.{random.randint(1,254)}"


def make_wallet():
    return "0x" + hashlib.sha256(str(uuid.uuid4()).encode()).hexdigest()[:40]


def ts_offset(hours_ago: int = 0) -> str:
    dt = datetime.now(timezone.utc) - timedelta(hours=hours_ago)
    return dt.isoformat()


def send_transaction(ingest_url: str, payload: dict, retries=3) -> bool:
    for attempt in range(1, retries + 1):
        try:
            r = requests.post(
                f"{ingest_url.rstrip('/')}/webhook",
                json=payload,
                timeout=15,
            )
            if r.status_code == 200:
                return True
            print(f"  ⚠ Attempt {attempt} failed: {r.status_code} – {r.text[:100]}")
        except requests.RequestException as e:
            print(f"  ⚠ Attempt {attempt} network error: {e}")
        time.sleep(2 ** attempt)
    return False


def generate_ring(
    ring_id: int,
    ingest_url: str,
    supabase_url: str,
    supabase_key: str,
) -> dict:
    """
    Creates one fraud ring: 3 users sharing IP + phone, various transaction amounts.
    Returns a summary dict for cleanup.
    """
    sb = create_client(supabase_url, supabase_key)
    ring_tag = f"ring_{ring_id}_{uuid.uuid4().hex[:6]}"
    print(f"\n{'='*60}")
    print(f"🔴  FRAUD RING {ring_id} – tag: {ring_tag}")
    print(f"{'='*60}")

    shared_ip = make_ip()
    shared_phone = make_phone()
    shared_wallet = make_wallet()

    print(f"  Shared IP:     {shared_ip}")
    print(f"  Shared Phone:  {shared_phone}")
    print(f"  Shared Wallet: {shared_wallet}")

    # 1. Add shared phone to blocklist
    try:
        sb.table("blocklist").insert({
            "type": "phone",
            "value": shared_phone,
            "source": f"fraud_ring_demo_{ring_tag}",
        }).execute()
        print(f"  ✓ Added {shared_phone} to blocklist")
    except Exception as e:
        print(f"  ⚠ Blocklist insert failed (may already exist): {e}")

    # 2. Create 3 user records in Supabase
    users = []
    for i in range(3):
        user_id = f"ring_user_{ring_tag}_{i}"
        try:
            sb.table("users").upsert({
                "user_id": user_id,
                "phone": shared_phone,
                "email": f"{user_id}@demo.kori",
            }, on_conflict="user_id").execute()
            users.append(user_id)
            print(f"  ✓ Created user: {user_id}")
        except Exception as e:
            print(f"  ⚠ User create error: {e}")
            users.append(user_id)  # still proceed

    # 3. Generate transactions
    scenarios = [
        # (user_idx, amount, hours_ago, desc)
        (0, 950_000,  3,  "Initial large transfer"),
        (1, 1_200_000, 2,  "Second ring member transfer"),
        (2, 800_000,  2,  "Third ring member – structuring"),
        (0, 450_000,  1,  "Below-threshold follow-on"),
        (1, 2_500_000, 1,  "Consolidated proceeds"),
        (2, 100_000,  0,  "Small decoy transaction"),
        (0, 750_000,  0,  "Final ring payment"),
        (1, 3_000_000, 0,  "Exit transaction – large"),
    ]

    sent_tx_ids = []
    for user_idx, amount, hours_ago, desc in scenarios:
        if user_idx >= len(users):
            continue
        tx_id = f"tx_{ring_tag}_{uuid.uuid4().hex[:8]}"
        payload = {
            "transaction_id": tx_id,
            "user_id": users[user_idx],
            "amount": amount,
            "timestamp": ts_offset(hours_ago),
            "ip_address": shared_ip,
            "phone": shared_phone,
            "wallet_address": shared_wallet,
            "merchant_id": f"merchant_demo_{ring_id}",
            "is_fraud": False,
        }
        ok = send_transaction(ingest_url, payload)
        status = "✓" if ok else "✗"
        print(f"  {status} TX {tx_id[:20]}… ₦{amount:,.0f} – {desc}")
        if ok:
            sent_tx_ids.append(tx_id)
        time.sleep(0.3)  # avoid overwhelming the ingest service

    return {
        "ring_tag": ring_tag,
        "shared_ip": shared_ip,
        "shared_phone": shared_phone,
        "shared_wallet": shared_wallet,
        "users": users,
        "tx_ids": sent_tx_ids,
    }


def cleanup(supabase_url: str, supabase_key: str, rings: list[dict]):
    sb = create_client(supabase_url, supabase_key)
    print("\n🧹 Cleaning up demo data…")
    for ring in rings:
        tag = ring["ring_tag"]
        # Remove blocklist
        sb.table("blocklist").delete().eq("value", ring["shared_phone"]).execute()
        # Remove transactions
        for tx_id in ring["tx_ids"]:
            sb.table("transactions").delete().eq("transaction_id", tx_id).execute()
            sb.table("alerts").delete().eq("transaction_id", tx_id).execute()
        # Remove users
        for uid in ring["users"]:
            sb.table("users").delete().eq("user_id", uid).execute()
        print(f"  ✓ Cleaned ring: {tag}")


def main():
    parser = argparse.ArgumentParser(description="Kori Fraud Ring Demo Generator")
    parser.add_argument("--url", required=True, help="Ingest service base URL")
    parser.add_argument("--rings", type=int, default=1, help="Number of rings (default: 1)")
    parser.add_argument("--cleanup", action="store_true", help="Remove data after generation")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--supabase-url", default=os.getenv("SUPABASE_URL"), help="Supabase project URL")
    parser.add_argument("--supabase-key", default=os.getenv("SUPABASE_KEY"), help="Supabase service_role key")
    args = parser.parse_args()

    if not args.supabase_url or not args.supabase_key:
        print("❌ SUPABASE_URL and SUPABASE_KEY must be set (env or --supabase-url / --supabase-key)")
        sys.exit(1)

    random.seed(args.seed)

    print(f"""
╔══════════════════════════════════════════════════════╗
║          KORI AML FRAUD RING GENERATOR               ║
║  Demonstrating CBN §5.1.3 Community Detection        ║
╚══════════════════════════════════════════════════════╝

  Ingest URL:  {args.url}
  Rings:       {args.rings}
  Seed:        {args.seed}
""")

    rings = []
    for i in range(1, args.rings + 1):
        ring = generate_ring(
            ring_id=i,
            ingest_url=args.url,
            supabase_url=args.supabase_url,
            supabase_key=args.supabase_key,
        )
        rings.append(ring)

    print(f"\n{'='*60}")
    print("✅  GENERATION COMPLETE")
    print(f"{'='*60}")
    print(f"\n  Rings created: {len(rings)}")
    print(f"  Total transactions sent: {sum(len(r['tx_ids']) for r in rings)}")
    print("""
Next steps:
  1. Wait 10–30 seconds for the processor to run
  2. Open your Kori dashboard → Alerts
  3. Click any ring alert → Entity Graph
  4. You should see 3 User nodes ALL connected to the same IP and SIM node
     — that is the fraud ring.

CBN talking point:
  "The graph engine detected that 3 independent user accounts shared
   a single IP address and phone number across 8 transactions totalling
   ₦9.95M. Traditional rule-based systems would flag each transaction
   individually. Kori's graph connects them into a single case."
""")

    if args.cleanup:
        cleanup(args.supabase_url, args.supabase_key, rings)


if __name__ == "__main__":
    main()