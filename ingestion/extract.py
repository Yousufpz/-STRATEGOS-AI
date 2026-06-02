"""
Phase 1: PDF Extraction
-----------------------
We use PyMuPDF (fitz) to extract raw text page by page.
Each page becomes a dict with its page number and content.
This raw data feeds into semantic_chunk.py next.
"""

import fitz  # PyMuPDF — 'fitz' is the legacy import name
import json
import os
import sys

# Configure stdout/stderr to use UTF-8 on Windows to prevent UnicodeEncodeError with emojis
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")


def extract_pdf(pdf_path: str, output_path: str = "data/raw_pages.json") -> list[dict]:
    """
    Extract text from every page of the PDF.
    
    Returns a list of dicts like:
    [
        {"page": 1, "text": "..."},
        {"page": 2, "text": "..."},
        ...
    ]
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF not found at: {pdf_path}")

    doc = fitz.open(pdf_path)
    pages = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()  # Extract raw text from this page
        
        # Skip nearly-empty pages (covers, blank pages, etc.)
        if len(text.strip()) < 50:
            continue

        pages.append({
            "page": page_num + 1,  # 1-indexed for human readability
            "text": text.strip()
        })

    doc.close()

    # Save to disk so we don't re-extract every run
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(pages, f, indent=2, ensure_ascii=False)

    print(f"✅ Extracted {len(pages)} pages → {output_path}")
    return pages


if __name__ == "__main__":
    pages = extract_pdf("data/48laws.pdf")
    print(f"First page preview:\n{pages[0]['text'][:500]}")
