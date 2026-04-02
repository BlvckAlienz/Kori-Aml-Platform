import os
import logging
import threading
from dotenv import load_dotenv
from flask import Flask, jsonify
from redis_consumer import pop_transaction
from graph_updater import GraphUpdater
from risk_scorer import score_transaction
from blocklist import check_blocklist
from supabase_client import create_alert

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
graph = GraphUpdater()

@app.route('/health')
def health():
    return jsonify({"status": "healthy", "service": "processor"})

@app.route('/process')
def process_trigger():
    thread = threading.Thread(target=process_transactions)
    thread.start()
    return jsonify({"status": "processing_started"})

def process_transactions():
    try:
        # Process up to 10 transactions per trigger
        for _ in range(10):
            tx = pop_transaction(timeout=1)
            if not tx:
                break
            logger.info(f"Processing transaction: {tx['transaction_id']}")
            block_score = check_blocklist(tx)
            risk_score = score_transaction(tx, block_score)
            graph.process_transaction(tx, risk_score)
            if risk_score >= 0.8:
                create_alert(tx, risk_score)
                logger.warning(f"Alert created for {tx['transaction_id']} (risk={risk_score:.2f})")
    except Exception as e:
        logger.error(f"Processing error: {e}")

if __name__ == '__main__':
    # Start background processing thread
    processing_thread = threading.Thread(target=process_transactions, daemon=True)
    processing_thread.start()
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port)