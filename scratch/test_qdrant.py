import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient

load_dotenv()

url = os.getenv("QDRANT_URL")
api_key = os.getenv("QDRANT_API_KEY")

print("--- DEBUG ---")
print("QDRANT_URL (from env):", url)
print("QDRANT_API_KEY length:", len(api_key) if api_key else "None")
print("QDRANT_API_KEY value preview:", api_key[:10] + "..." if api_key else "None")

try:
    print("Initializing QdrantClient...")
    if api_key:
        client = QdrantClient(url=url, api_key=api_key)
    else:
        client = QdrantClient(url=url)
    
    print("Client initialized. Fetching collections...")
    collections = client.get_collections()
    print("Success! Collections found:", [c.name for c in collections.collections])
except Exception as e:
    print("Error during connection:", e)
