strategos-ai/

├── data/

│   └── 48laws.pdf          ← You add your PDF here

├── ingestion/

│   ├── extract.py          ← Phase 1: PDF → raw text

│   ├── semantic\_chunk.py   ← Phase 2: raw text → smart chunks

│   └── embed.py            ← Phase 3: chunks → vectors in Qdrant

├── rag/

│   ├── retrieve.py         ← Phase 5: Qdrant search

│   ├── rewrite.py          ← Phase 4: query rewriting

│   ├── generate.py         ← Phase 7: LLM answer generation

│   └── guardrails.py       ← Phase 8: harmful query filter

├── streamlit\_app.py        ← The UI

├── requirements.txt

└── .env.example

