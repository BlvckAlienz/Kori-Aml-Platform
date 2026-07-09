#!/usr/bin/env python3
import os
import ssl
import sys
import logging
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

def setup_logger():
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    return logging.getLogger('setup_neo4j')

def main():
    logger = setup_logger()
    uri = os.getenv("NEO4J_URI")
    user = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD")
    
    if not uri or not password:
        logger.error("NEO4J_URI and NEO4J_PASSWORD must be set in .env")
        sys.exit(1)
    
    logger.info(f"Connecting to Neo4j at {uri}...")
    
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    try:
        driver = GraphDatabase.driver(
            uri,
            auth=(user, password),
            encrypted=True,
            ssl_context=ssl_context
        )
        # Verify connection
        with driver.session() as session:
            result = session.run("RETURN 1 as test")
            record = result.single()
            if record and record["test"] == 1:
                logger.info("✅ Successfully connected to Neo4j")
            else:
                logger.error("❌ Connection test failed")
                sys.exit(1)
        
        logger.info("Creating constraints and indexes...")
        
        with driver.session() as session:
            constraints = [
                "CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.user_id IS UNIQUE",
                "CREATE CONSTRAINT card_id_unique IF NOT EXISTS FOR (c:Card) REQUIRE c.card_id IS UNIQUE",
                "CREATE CONSTRAINT ip_unique IF NOT EXISTS FOR (i:IP) REQUIRE i.ip_address IS UNIQUE",
                "CREATE CONSTRAINT address_id_unique IF NOT EXISTS FOR (a:Address) REQUIRE a.address_id IS UNIQUE",
                "CREATE CONSTRAINT merchant_id_unique IF NOT EXISTS FOR (m:Merchant) REQUIRE m.merchant_id IS UNIQUE",
                "CREATE CONSTRAINT transaction_id_unique IF NOT EXISTS FOR (t:Transaction) REQUIRE t.transaction_id IS UNIQUE",
            ]
            for constraint in constraints:
                try:
                    session.run(constraint)
                    logger.info(f"✅ Created: {constraint}")
                except Exception as e:
                    if "already exists" in str(e).lower():
                        logger.info(f"⏭️  Already exists: {constraint}")
                    else:
                        logger.warning(f"⚠️  Failed: {constraint} - {e}")
            
            indexes = [
                "CREATE INDEX user_risk_score IF NOT EXISTS FOR (u:User) ON (u.risk_score)",
                "CREATE INDEX card_risk_score IF NOT EXISTS FOR (c:Card) ON (c.risk_score)",
                "CREATE INDEX ip_risk_score IF NOT EXISTS FOR (i:IP) ON (i.risk_score)",
                "CREATE INDEX transaction_timestamp IF NOT EXISTS FOR (t:Transaction) ON (t.timestamp)",
                "CREATE INDEX transaction_amount IF NOT EXISTS FOR (t:Transaction) ON (t.amount)",
                "CREATE INDEX transaction_fraud IF NOT EXISTS FOR (t:Transaction) ON (t.is_fraud)",
            ]
            for index in indexes:
                try:
                    session.run(index)
                    logger.info(f"✅ Created: {index}")
                except Exception as e:
                    if "already exists" in str(e).lower():
                        logger.info(f"⏭️  Already exists: {index}")
                    else:
                        logger.warning(f"⚠️  Failed: {index} - {e}")
        
        logger.info("✅ Neo4j setup completed successfully!")
        driver.close()
    except Exception as e:
        logger.error(f"❌ Neo4j setup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()