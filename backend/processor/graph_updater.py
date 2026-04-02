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

    def close(self):
        self.driver.close()

    def process_transaction(self, tx, risk_score):
        with self.driver.session() as session:
            # Create transaction node
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
            
            # Link to user
            if tx.get("user_id"):
                session.run(
                    """
                    MERGE (u:User {user_id: $uid})
                    ON CREATE SET u.created_at = datetime()
                    MERGE (u)-[:MADE_TRANSACTION]->(t:Transaction {transaction_id: $tid})
                    """,
                    uid=tx["user_id"], tid=tx["transaction_id"]
                )
            
            # Link to IP
            if tx.get("ip_address"):
                session.run(
                    """
                    MERGE (i:IP {ip_address: $ip})
                    ON CREATE SET i.created_at = datetime()
                    MERGE (t:Transaction {transaction_id: $tid})-[:FROM_IP]->(i)
                    """,
                    ip=tx["ip_address"], tid=tx["transaction_id"]
                )
            
            # Link to phone (SIM)
            if tx.get("phone"):
                session.run(
                    """
                    MERGE (s:SIM {phone_number: $phone})
                    ON CREATE SET s.created_at = datetime()
                    MERGE (t:Transaction {transaction_id: $tid})-[:USED_SIM]->(s)
                    """,
                    phone=tx["phone"], tid=tx["transaction_id"]
                )
            
            # Link to wallet
            if tx.get("wallet_address"):
                session.run(
                    """
                    MERGE (w:Wallet {address: $wallet})
                    ON CREATE SET w.created_at = datetime()
                    MERGE (t:Transaction {transaction_id: $tid})-[:USED_WALLET]->(w)
                    """,
                    wallet=tx["wallet_address"], tid=tx["transaction_id"]
                )