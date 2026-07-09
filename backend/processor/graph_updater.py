import os
from neo4j import GraphDatabase
import logging

logger = logging.getLogger(__name__)

class GraphUpdater:
    def __init__(self):
        uri = os.getenv("NEO4J_URI")
        user = os.getenv("NEO4J_USER")
        password = os.getenv("NEO4J_PASSWORD")
        if not uri or not user or not password:
            raise ValueError("Neo4j credentials missing")
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        logger.info("Neo4j driver initialised")

    def close(self):
        self.driver.close()

    def process_transaction(self, tx, risk_score):
        with self.driver.session() as session:
            # 1. Create or update transaction node (ignore if already exists)
            try:
                session.run(
                    """
                    MERGE (t:Transaction {transaction_id: $tid})
                    SET t.amount = $amount,
                        t.timestamp = datetime($timestamp),
                        t.risk_score = $risk,
                        t.is_fraud = $is_fraud
                    """,
                    tid=tx["transaction_id"],
                    amount=tx["amount"],
                    timestamp=tx["timestamp"],
                    risk=risk_score,
                    is_fraud=tx.get("is_fraud", False)
                )
            except Exception as e:
                # If the node already exists, we ignore the constraint error
                # and continue to create relationships.
                if "ConstraintValidationFailed" in str(e):
                    logger.warning(f"Transaction node already exists: {tx['transaction_id']}")
                else:
                    # Re-raise other errors
                    raise

            # 2. Create relationships (these will not fail if the transaction node exists)
            if tx.get("user_id"):
                session.run(
                    """
                    MATCH (t:Transaction {transaction_id: $tid})
                    MERGE (u:User {user_id: $uid})
                    ON CREATE SET u.created_at = datetime()
                    MERGE (u)-[:MADE_TRANSACTION]->(t)
                    """,
                    tid=tx["transaction_id"], uid=tx["user_id"]
                )

            if tx.get("ip_address"):
                session.run(
                    """
                    MATCH (t:Transaction {transaction_id: $tid})
                    MERGE (i:IP {ip_address: $ip})
                    ON CREATE SET i.created_at = datetime()
                    MERGE (t)-[:FROM_IP]->(i)
                    """,
                    tid=tx["transaction_id"], ip=tx["ip_address"]
                )

            if tx.get("phone"):
                session.run(
                    """
                    MATCH (t:Transaction {transaction_id: $tid})
                    MERGE (s:SIM {phone_number: $phone})
                    ON CREATE SET s.created_at = datetime()
                    MERGE (t)-[:USED_SIM]->(s)
                    """,
                    tid=tx["transaction_id"], phone=tx["phone"]
                )

            if tx.get("wallet_address"):
                session.run(
                    """
                    MATCH (t:Transaction {transaction_id: $tid})
                    MERGE (w:Wallet {address: $wallet})
                    ON CREATE SET w.created_at = datetime()
                    MERGE (t)-[:USED_WALLET]->(w)
                    """,
                    tid=tx["transaction_id"], wallet=tx["wallet_address"]
                )