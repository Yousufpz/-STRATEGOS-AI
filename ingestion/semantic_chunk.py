"""
Phase 2: Semantic Chunking
--------------------------
Naive chunking (split every 500 chars) breaks concepts mid-sentence.
Semantic chunking uses an LLM to identify natural knowledge boundaries.

We send each page's text to DeepSeek (via Ollama) and ask it to
return structured JSON chunks that preserve complete concepts.

This is one of the key differentiators of a "professional" RAG system.
"""

import json
import os
import sys
import requests
import time
from dotenv import load_dotenv

# Configure stdout/stderr to use UTF-8 on Windows to prevent UnicodeEncodeError with emojis
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

load_dotenv(override=True)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
CHUNK_MODEL = os.getenv("CHUNK_MODEL", "gemma3:4b")


def semantic_chunk_page(page_data: dict) -> list[dict]:
    """
    Send one page's text to DeepSeek and get back semantic chunks.
    
    Each chunk will have:
    - section: what concept/section this is
    - content: the actual text of the chunk
    - law: which law number (if detectable)
    """
    
    prompt = f"""You are a knowledge extraction expert. 

Analyze the following text from "The 48 Laws of Power" (page {page_data['page']}).

Split it into semantic knowledge chunks where each chunk represents ONE complete concept, 
principle, or narrative example. Do NOT split mid-thought.

Rules:
- Each chunk should be self-contained and make sense alone
- Preserve all important content — don't summarize
- Identify the law number and section name if present
- Return ONLY valid JSON, no explanation, no markdown

Return this exact JSON format:
[
  {{
    "law": <number or null>,
    "section": "<section name like 'Interpretation', 'Keys to Power', 'Example', 'Transgression'>",
    "content": "<complete text of this chunk>"
  }}
]

Text to chunk:
---
{page_data['text']}
---

JSON output only:"""

    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": CHUNK_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1,  # Low temp = more deterministic/structured output
                    "num_predict": 2000
                }
            },
            timeout=120  # DeepSeek can be slow locally
        )
        response.raise_for_status()
        raw = response.json()["response"]
        
        # Clean up: DeepSeek sometimes wraps in ```json ... ```
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip().rstrip("```").strip()
        
        chunks = json.loads(raw)
        
        # Attach the source page to every chunk
        for chunk in chunks:
            chunk["page"] = page_data["page"]
            chunk["law"] = chunk.get("law")  # May be null
        
        return chunks

    except json.JSONDecodeError as e:
        print(f"⚠️  Page {page_data['page']}: JSON parse failed — using fallback chunking")
        # Fallback: treat whole page as one chunk
        return [{
            "law": None,
            "section": "General",
            "content": page_data["text"],
            "page": page_data["page"]
        }]
    except Exception as e:
        print(f"❌ Page {page_data['page']}: Error — {e}")
        return []


def chunk_all_pages(
    pages: list[dict], 
    output_path: str = "data/chunks.json",
    start_from: int = 0  # Resume from a page index if interrupted
) -> list[dict]:
    """
    Process all pages and collect all chunks.
    Saves progress incrementally so you can resume if Ollama crashes.
    """
    
    # Load existing chunks if resuming
    all_chunks = []
    if os.path.exists(output_path) and start_from > 0:
        with open(output_path, "r", encoding="utf-8") as f:
            all_chunks = json.load(f)
        print(f"📂 Resuming from page index {start_from} with {len(all_chunks)} existing chunks")

    pages_to_process = pages[start_from:]
    
    for i, page in enumerate(pages_to_process):
        actual_idx = start_from + i
        print(f"🔄 Chunking page {page['page']} ({actual_idx + 1}/{len(pages)})...")
        
        chunks = semantic_chunk_page(page)
        all_chunks.extend(chunks)
        
        # Save after every page — resumable if it crashes
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(all_chunks, f, indent=2, ensure_ascii=False)
        
        # Small delay to not hammer Ollama
        time.sleep(0.5)

    print(f"✅ Chunking complete: {len(all_chunks)} chunks → {output_path}")
    return all_chunks


if __name__ == "__main__":
    with open("data/raw_pages.json", encoding="utf-8") as f:
        pages = json.load(f)
    
    chunks = chunk_all_pages(pages)
    print(f"\nSample chunk:\n{json.dumps(chunks[0], indent=2)}")
