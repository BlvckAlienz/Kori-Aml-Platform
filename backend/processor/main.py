import os
import logging
import time
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

def continuous_process():
    """Loop forever, processing transactions as they arrive."""
    logger.info("Continuous processor started. Waiting for transactions...")
    while True:
        tx = pop_transaction(timeout=5)   # waits up to 5 seconds
        if tx:
            logger.info(f"Processing transaction: {tx['transaction_id']}")
            block_score = check_blocklist(tx)
            risk_score = score_transaction(tx, block_score)
            graph.process_transaction(tx, risk_score)
            if risk_score >= 0.8:
                create_alert(tx, risk_score)
                logger.warning(f"Alert created for {tx['transaction_id']} (risk={risk_score:.2f})")
        else:
            # No transaction, just sleep a little to avoid busy loop
            time.sleep(1)

if __name__ == '__main__':
    # Start the continuous processor in a background thread
    import threading
    processor_thread = threading.Thread(target=continuous_process, daemon=True)
    processor_thread.start()
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port)