"""
Phase 3: Embedding + Qdrant Ingestion
--------------------------------------
Embeddings convert text into vectors — lists of numbers where
similar meanings cluster together in vector space.

"never outshine the master" and "don't overshadow your boss" 
will have vectors very close to each other, even with 0 shared words.
That's the magic of semantic search.

We use nomic-embed-text (via Ollama) — free, local, excellent quality.
We store vectors in Qdrant with metadata (law, page, section) as payload.
"""

import json
import os
import sys
import requests
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct, 
    OptimizersConfigDiff
)
from dotenv import load_dotenv

# Configure stdout/stderr to use UTF-8 on Windows to prevent UnicodeEncodeError with emojis
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", None)
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "strategos_laws")

# nomic-embed-text produces 768-dimensional vectors
VECTOR_SIZE = 768


def get_embedding(text: str) -> list[float]:
    """
    Call Ollama's embedding endpoint for one text.
    Returns a list of 768 floats.
    """
    response = requests.post(
        f"{OLLAMA_BASE_URL}/api/embeddings",
        json={"model": EMBED_MODEL, "prompt": text},
        timeout=30
    )
    response.raise_for_status()
    return response.json()["embedding"]


def get_qdrant_client() -> QdrantClient:
    """
    Connect to Qdrant — local or cloud depending on env vars.
    """
    if QDRANT_API_KEY:
        # Cloud mode
        return QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    else:
        # Local mode
        return QdrantClient(url=QDRANT_URL)


def create_collection(client: QdrantClient):
    """
    Create the Qdrant collection if it doesn't exist.
    
    Cosine distance is best for semantic similarity —
    it measures the angle between vectors, not their magnitude.
    """
    existing = [c.name for c in client.get_collections().collections]
    
    if COLLECTION_NAME in existing:
        print(f"ℹ️  Collection '{COLLECTION_NAME}' already exists — skipping creation")
        return
    
    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(
            size=VECTOR_SIZE,
            distance=Distance.COSINE  # Best for semantic similarity
        ),
        # Optimize for small datasets (our book is ~300 pages)
        optimizers_config=OptimizersConfigDiff(
            indexing_threshold=0  # Index immediately, no waiting
        )
    )
    print(f"✅ Created collection '{COLLECTION_NAME}'")


def embed_and_store(chunks: list[dict], batch_size: int = 10):
    """
    Embed all chunks and store them in Qdrant.
    
    Each point in Qdrant = one chunk with:
    - id: unique integer
    - vector: 768 floats (the semantic embedding)
    - payload: metadata (law, page, section, content)
    """
    client = get_qdrant_client()
    create_collection(client)
    
    # Check if already embedded
    existing_count = client.count(COLLECTION_NAME).count
    if existing_count > 0:
        print(f"ℹ️  {existing_count} points already in Qdrant. Delete collection to re-embed.")
        return
    
    points = []
    
    for i, chunk in enumerate(chunks):
        # Skip empty chunks
        if not chunk.get("content", "").strip():
            continue
        
        print(f"🔢 Embedding chunk {i+1}/{len(chunks)}...")
        
        try:
            embedding = get_embedding(chunk["content"])
        except Exception as e:
            print(f"  ❌ Failed: {e}")
            continue
        
        # Qdrant point: id + vector + metadata payload
        point = PointStruct(
            id=i,  # Simple integer ID
            vector=embedding,
            payload={
                "law": chunk.get("law"),
                "page": chunk.get("page"),
                "section": chunk.get("section", "General"),
                "content": chunk["content"]  # Store content for retrieval
            }
        )
        points.append(point)
        
        # Upload in batches to avoid memory issues
        if len(points) >= batch_size:
            client.upsert(collection_name=COLLECTION_NAME, points=points)
            print(f"  📤 Uploaded batch of {len(points)} points")
            points = []
    
    # Upload remaining
    if points:
        client.upsert(collection_name=COLLECTION_NAME, points=points)
        print(f"  📤 Uploaded final batch of {len(points)} points")
    
    final_count = client.count(COLLECTION_NAME).count
    print(f"\n✅ Ingestion complete: {final_count} vectors in Qdrant")


if __name__ == "__main__":
    with open("data/chunks.json", encoding="utf-8") as f:
        chunks = json.load(f)
    
    embed_and_store(chunks)
