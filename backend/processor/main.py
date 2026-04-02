import os
import logging
import threading
import time
from dotenv import load_dotenv
from flask import Flask, jsonify  # Add Flask for health endpoint
from .redis_consumer import pop_transaction
from .graph_updater import GraphUpdater
from .risk_scorer import score_transaction
from .blocklist import check_blocklist
from .supabase_client import create_alert

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Flask app for health checks
app = Flask(__name__)
graph = GraphUpdater()

@app.route('/health')
def health():
    """Health check endpoint for cron jobs and monitoring"""
    return jsonify({"status": "healthy", "service": "processor"})

@app.route('/process')
def process_trigger():
    """Optional endpoint to manually trigger processing via cron job"""
    # Run processing in background thread to not timeout
    thread = threading.Thread(target=process_transactions)
    thread.start()
    return jsonify({"status": "processing_started"})

def process_transactions():
    """Main processing logic - can be called directly or via web endpoint"""
    try:
        # Process a batch of transactions (e.g., 10 at a time)
        for _ in range(10):
            tx = pop_transaction(timeout=1)
            if not tx:
                break
            
            logger.info(f"Processing transaction: {tx['transaction_id']}")
            
            # Check blocklist
            block_score = check_blocklist(tx)
            # Calculate risk score
            risk_score = score_transaction(tx, block_score)
            
            # Update graph
            graph.process_transaction(tx, risk_score)
            
            # Create alert if high risk
            if risk_score >= 0.8:
                create_alert(tx, risk_score)
                logger.warning(f"Alert created for {tx['transaction_id']} (risk={risk_score:.2f})")
    except Exception as e:
        logger.error(f"Processing error: {e}")

if __name__ == '__main__':
    # Start processing in background thread and run Flask app
    processing_thread = threading.Thread(target=process_transactions, daemon=True)
    processing_thread.start()
    
    # Run Flask app (for cron job pings)
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port)