"""
Phase 5: Retrieval
------------------
The core of RAG: find the most relevant chunks for a query.

Process:
1. Embed the (rewritten) query using the same model used for chunks
2. Search Qdrant for the most similar vectors (cosine similarity)
3. Return the top-k results with their metadata

The vectors are compared by angle (cosine similarity), not Euclidean 
distance — this means a chunk about "concealing your true feelings" 
and a query about "hiding your ambitions" will score very high even 
though they share few words.
"""

import os
import requests
from qdrant_client import QdrantClient
from qdrant_client.models import Filter
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", None)
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "strategos_laws")


def get_embedding(text: str) -> list[float]:
    """Embed query text using Ollama (same model as ingestion)."""
    response = requests.post(
        f"{OLLAMA_BASE_URL}/api/embeddings",
        json={"model": EMBED_MODEL, "prompt": text},
        timeout=30
    )
    response.raise_for_status()
    return response.json()["embedding"]


def get_qdrant_client() -> QdrantClient:
    if QDRANT_API_KEY:
        return QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    return QdrantClient(url=QDRANT_URL)


def retrieve(query: str, top_k: int = 10) -> list[dict]:
    """
    Embed the query and retrieve the top-k most relevant chunks.
    
    Returns a list of dicts:
    [
        {
            "score": 0.91,       ← cosine similarity (0-1, higher = better)
            "law": 1,
            "page": 14,
            "section": "Interpretation",
            "content": "..."
        },
        ...
    ]
    """
    client = get_qdrant_client()
    
    # Embed the query
    query_vector = get_embedding(query)
    
    # Search Qdrant
    response = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        limit=top_k,
        with_payload=True,  # Include metadata in results
        score_threshold=0.3  # Filter out very low-relevance results
    )
    
    # Format results
    chunks = []
    for hit in response.points:
        chunks.append({
            "score": round(hit.score, 4),
            "law": hit.payload.get("law"),
            "page": hit.payload.get("page"),
            "section": hit.payload.get("section", "General"),
            "content": hit.payload.get("content", "")
        })
    
    return chunks


if __name__ == "__main__":
    test_q = "How do I deal with an envious colleague?"
    results = retrieve(test_q)
    for r in results:
        print(f"Score: {r['score']} | Law: {r['law']} | Page: {r['page']}")
        print(f"  {r['content'][:100]}...")
        print()
