import os
import ssl
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

uri = os.getenv("NEO4J_URI")
user = os.getenv("NEO4J_USER", "neo4j")
password = os.getenv("NEO4J_PASSWORD")

print(f"Testing connection to: {uri}")
print(f"Username: {user}")

# Create SSL context that disables certificate verification (development only)
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

try:
    driver = GraphDatabase.driver(
        uri,
        auth=(user, password),
        encrypted=True,          # Force encryption
        ssl_context=ssl_context  # Use our custom context
    )
    with driver.session() as session:
        result = session.run("RETURN 1 as test")
        record = result.single()
        print(f"✅ Connection successful! Test value: {record['test']}")
    driver.close()
except Exception as e:
    print(f"❌ Connection failed: {e}")