import os
import logging
from neo4j import GraphDatabase

logger = logging.getLogger("kori.api.neo4j")
_driver = None

def get_driver():
    global _driver
    if _driver is None:
        uri = os.getenv("NEO4J_URI")
        user = os.getenv("NEO4J_USER", "neo4j")
        password = os.getenv("NEO4J_PASSWORD")
        if not uri or not password:
            raise RuntimeError("NEO4J_URI and NEO4J_PASSWORD must be set")
        # Standard driver – system trusts the certificate
        _driver = GraphDatabase.driver(uri, auth=(user, password))
        logger.info("Neo4j driver initialised with system certificates")
    return _driver