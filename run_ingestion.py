"""
run_ingestion.py
----------------
One-command setup: Extract → Chunk → Embed

Run this once after setting up Qdrant and Ollama:
    python run_ingestion.py

Takes ~30-60 minutes depending on your machine (the chunking step
calls DeepSeek for every page, which is slow locally).
"""

import os
import sys

# Configure stdout/stderr to use UTF-8 on Windows to prevent UnicodeEncodeError with emojis
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

print("=" * 60)
print("STRATEGOS AI — INGESTION PIPELINE")
print("=" * 60)

# ── Step 1: Extract ──────────────────────────────────────────
print("\n📄 PHASE 1: PDF Extraction")
print("-" * 40)

pdf_path = "data/48laws.pdf"
if not os.path.exists(pdf_path):
    print(f"❌ Error: Place your PDF at '{pdf_path}' and run again.")
    sys.exit(1)

from ingestion.extract import extract_pdf
pages = extract_pdf(pdf_path)
print(f"Extracted {len(pages)} pages.\n")

# ── Step 2: Semantic Chunking ────────────────────────────────
print("🧠 PHASE 2: Semantic Chunking (this is the slow step)")
print("   Using DeepSeek/Qwen via Ollama — expect 30-60 min for full book")
print("-" * 40)

from ingestion.semantic_chunk import chunk_all_pages

# Check if partially done (resume support)
start_from = 0
if os.path.exists("data/chunks.json"):
    import json
    with open("data/chunks.json", encoding="utf-8") as f:
        existing = json.load(f)
    already_done_pages = {c["page"] for c in existing}
    start_from = sum(1 for p in pages if p["page"] in already_done_pages)
    print(f"  Found existing chunks for {start_from} pages — resuming...")

chunks = chunk_all_pages(pages, start_from=start_from)
print(f"Total chunks: {len(chunks)}\n")

# ── Step 3: Embed + Store ────────────────────────────────────
print("🔢 PHASE 3: Embedding + Qdrant Storage")
print("-" * 40)

from ingestion.embed import embed_and_store
embed_and_store(chunks)

print("\n" + "=" * 60)
print("✅ INGESTION COMPLETE")
print("=" * 60)
print("\nNow run the app:")
print("  streamlit run streamlit_app.py")
