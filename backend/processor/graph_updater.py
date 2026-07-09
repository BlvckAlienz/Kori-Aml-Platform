import os
import time
import logging
from neo4j import GraphDatabase
from neo4j.exceptions import ClientError

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
BASE_DELAY_SECONDS = 0.15  # exponential backoff: 0.15, 0.30, 0.45s


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

    # ✅ All 5 writes now happen inside ONE managed transaction.
    # If any step fails, everything rolls back together — no more
    # "transaction node exists but relationships are missing" states.
    @staticmethod
    def _write_transaction(write_tx, tx_data, risk_score):
        tid = tx_data["transaction_id"]

        write_tx.run(
            """
            MERGE (t:Transaction {transaction_id: $tid})
            SET t.amount = $amount,
                t.timestamp = datetime($timestamp),
                t.risk_score = $risk,
                t.is_fraud = $is_fraud
            """,
            tid=tid,
            amount=tx_data["amount"],
            timestamp=tx_data["timestamp"],
            risk=risk_score,
            is_fraud=tx_data.get("is_fraud", False),
        )

        if tx_data.get("user_id"):
            write_tx.run(
                """
                MATCH (t:Transaction {transaction_id: $tid})
                MERGE (u:User {user_id: $uid})
                ON CREATE SET u.created_at = datetime()
                MERGE (u)-[:MADE_TRANSACTION]->(t)
                """,
                tid=tid, uid=tx_data["user_id"],
            )

        if tx_data.get("ip_address"):
            write_tx.run(
                """
                MATCH (t:Transaction {transaction_id: $tid})
                MERGE (i:IP {ip_address: $ip})
                ON CREATE SET i.created_at = datetime()
                MERGE (t)-[:FROM_IP]->(i)
                """,
                tid=tid, ip=tx_data["ip_address"],
            )

        if tx_data.get("phone"):
            write_tx.run(
                """
                MATCH (t:Transaction {transaction_id: $tid})
                MERGE (s:SIM {phone_number: $phone})
                ON CREATE SET s.created_at = datetime()
                MERGE (t)-[:USED_SIM]->(s)
                """,
                tid=tid, phone=tx_data["phone"],
            )

        if tx_data.get("wallet_address"):
            write_tx.run(
                """
                MATCH (t:Transaction {transaction_id: $tid})
                MERGE (w:Wallet {address: $wallet})
                ON CREATE SET w.created_at = datetime()
                MERGE (t)-[:USED_WALLET]->(w)
                """,
                tid=tid, wallet=tx_data["wallet_address"],
            )

    # ✅ Self-healing: retries ONLY on the specific constraint race,
    # re-raises anything else immediately (no silent swallowing of
    # real bugs — that would be worse than the original problem).
    def process_transaction(self, tx, risk_score):
        tid = tx.get("transaction_id", "unknown")
        last_error = None

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                with self.driver.session() as session:
                    session.execute_write(self._write_transaction, tx, risk_score)
                logger.info(f"Graph updated [{tid}] on attempt {attempt}/{MAX_RETRIES}")
                return
            except ClientError as e:
                last_error = e
                if "ConstraintValidationFailed" in str(e.code):
                    delay = BASE_DELAY_SECONDS * attempt
                    logger.warning(
                        f"Constraint race on [{tid}], attempt {attempt}/{MAX_RETRIES}, "
                        f"retrying in {delay:.2f}s: {e.message}"
                    )
                    time.sleep(delay)
                    continue
                logger.error(f"Non-retryable Neo4j error [{tid}]: {e}")
                raise
            except Exception as e:
                last_error = e
                logger.error(f"Unexpected graph error [{tid}]: {e}")
                raise

        logger.error(f"Graph update PERMANENTLY FAILED [{tid}] after {MAX_RETRIES} attempts")
        raise last_error