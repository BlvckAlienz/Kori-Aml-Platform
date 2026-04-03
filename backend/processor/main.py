import os
import logging
import time
import json
import threading
from dotenv import load_dotenv
from flask import Flask, jsonify
from redis_consumer import pop_transaction
from graph_updater import GraphUpdater
from supabase_client import create_alert, update_transaction_breakdown
from blocklist import check_blocklist

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
graph = GraphUpdater()

@app.route('/health')
def health():
    return jsonify({"status": "healthy", "service": "processor"})

def calculate_risk_and_breakdown(tx, block_score):
    breakdown = []
    score = 0.0
    amount = tx.get("amount", 0)
    if amount > 500000:
        breakdown.append({"reason": "Amount > ₦500,000", "contribution": 0.3})
        score += 0.3
    if block_score > 0:
        breakdown.append({"reason": "Phone/IP/wallet on blocklist", "contribution": block_score})
        score += block_score
    # You can add more rules here (e.g., time of day, velocity)
    return min(score, 1.0), breakdown

def continuous_process():
    logger.info("Continuous processor started.")
    while True:
        tx = pop_transaction(timeout=5)
        if tx:
            logger.info(f"Processing: {tx['transaction_id']}")
            block_score = check_blocklist(tx)
            risk_score, breakdown = calculate_risk_and_breakdown(tx, block_score)
            
            # Store breakdown in Supabase
            update_transaction_breakdown(tx['transaction_id'], breakdown)
            
            # Update graph
            graph.process_transaction(tx, risk_score)
            
            if risk_score >= 0.8:
                create_alert(tx, risk_score, breakdown)
                logger.warning(f"Alert for {tx['transaction_id']} (risk={risk_score})")
        else:
            time.sleep(1)

if __name__ == '__main__':
    thread = threading.Thread(target=continuous_process, daemon=True)
    thread.start()
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port)