"""
Strategos AI — Streamlit Frontend
----------------------------------
Single-page app that connects all RAG components.

Flow:
User types question
    → Guardrails check
    → Query rewrite
    → Vector retrieval (Qdrant)
    → LLM generation
    → Structured answer + sources displayed
"""

import streamlit as st
import os
import sys
from dotenv import load_dotenv

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from rag.guardrails import check_query
from rag.rewrite import rewrite_query
from rag.retrieve import retrieve
from rag.generate import generate_answer

load_dotenv()

# ─────────────────────────────────────────────
# Page Config
# ─────────────────────────────────────────────
st.set_page_config(
    page_title="Strategos AI",
    page_icon="🏛️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ─────────────────────────────────────────────
# Custom CSS
# ─────────────────────────────────────────────
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Source+Serif+4:wght@300;400;600&display=swap');
    
    /* Main background */
    .stApp {
        background-color: #0f0e0c;
        color: #e8e0d0;
    }
    
    /* Headers */
    h1, h2, h3 {
        font-family: 'Playfair Display', serif !important;
        color: #c9a84c !important;
    }
    
    /* Body text */
    p, .stMarkdown {
        font-family: 'Source Serif 4', serif !important;
        color: #d4c9b5 !important;
    }
    
    /* Sidebar */
    [data-testid="stSidebar"] {
        background-color: #1a1810 !important;
        border-right: 1px solid #2d2920;
    }
    
    /* Input box */
    .stTextArea textarea {
        background-color: #1a1810 !important;
        color: #e8e0d0 !important;
        border: 1px solid #3d3520 !important;
        font-family: 'Source Serif 4', serif !important;
        font-size: 1rem !important;
    }
    
    /* Buttons */
    .stButton > button {
        background-color: #8b6914 !important;
        color: #f5edd6 !important;
        border: none !important;
        font-family: 'Playfair Display', serif !important;
        letter-spacing: 0.05em !important;
        padding: 0.6rem 2rem !important;
    }
    
    .stButton > button:hover {
        background-color: #c9a84c !important;
        color: #0f0e0c !important;
    }
    
    /* Answer card */
    .answer-card {
        background: linear-gradient(135deg, #1a1810 0%, #16140f 100%);
        border: 1px solid #3d3520;
        border-left: 4px solid #c9a84c;
        border-radius: 4px;
        padding: 1.5rem;
        margin: 1rem 0;
    }
    
    /* Source badge */
    .source-badge {
        display: inline-block;
        background: #2d2510;
        border: 1px solid #5a4a20;
        border-radius: 3px;
        padding: 2px 8px;
        margin: 2px;
        font-size: 0.8rem;
        color: #c9a84c;
        font-family: monospace;
    }
    
    /* Divider */
    hr {
        border-color: #2d2920 !important;
    }
    
    /* Selectbox */
    .stSelectbox > div > div {
        background-color: #1a1810 !important;
        color: #e8e0d0 !important;
        border-color: #3d3520 !important;
    }
    
    /* Info/success/warning boxes */
    .stAlert {
        background-color: #1a1810 !important;
        border-color: #3d3520 !important;
    }
</style>
""", unsafe_allow_html=True)

# ─────────────────────────────────────────────
# Sidebar
# ─────────────────────────────────────────────
with st.sidebar:
    st.markdown("# 🏛️ Strategos AI")
    st.markdown("*Strategic counsel from The 48 Laws of Power*")
    st.divider()
    
    st.markdown("### LLM Provider")
    provider = st.selectbox(
        "Select your provider",
        ["Gemini", "OpenAI", "Anthropic", "Ollama"],
        index=0,  # Default to Gemini (free tier available)
        label_visibility="collapsed"
    )
    
    # API key input (not needed for Ollama)
    if provider != "Ollama":
        api_key = st.text_input(
            f"{provider} API Key",
            type="password",
            placeholder=f"Paste your {provider} API key...",
            help="Your key is never stored. It's only used for this session."
        )
    else:
        api_key = None
        st.info("🦙 Using local Ollama — no API key needed")
    
    st.divider()
    
    # Settings
    st.markdown("### Retrieval Settings")
    top_k = st.slider(
        "Chunks to retrieve",
        min_value=3, max_value=15, value=8,
        help="More chunks = more context, but slower generation"
    )
    
    show_rewrite = st.checkbox(
        "Show query rewrite", 
        value=True,
        help="Display how your query was optimized for retrieval"
    )
    
    show_chunks = st.checkbox(
        "Show retrieved chunks",
        value=False,
        help="Display the raw chunks used to generate the answer"
    )
    
    st.divider()
    
    # Ingestion tools (collapsed by default)
    with st.expander("🔧 Data Ingestion"):
        st.markdown("""
Run these scripts once to set up the knowledge base:

```bash
# 1. Extract PDF
python ingestion/extract.py

# 2. Semantic chunk (slow — uses Ollama)
python ingestion/semantic_chunk.py

# 3. Embed + store in Qdrant
python ingestion/embed.py
```
        """)
    
    st.markdown("---")
    st.caption("Built with Streamlit · Qdrant · nomic-embed-text")

# ─────────────────────────────────────────────
# Main Area
# ─────────────────────────────────────────────
st.markdown("## Ask the Oracle")
st.markdown(
    "Pose your strategic dilemma. The laws will answer.",
    help="Questions work best when they describe a real situation you're navigating."
)

# Example questions
with st.expander("💡 Example questions to try"):
    examples = [
        "My boss keeps taking credit for my work. How do I handle this?",
        "I want to build a powerful network. Where do I start?",
        "A colleague is spreading rumors about me. What's the strategic move?",
        "How do I make myself indispensable at work?",
        "I need to negotiate a raise but feel powerless. What does strategy say?",
    ]
    for ex in examples:
        if st.button(ex, key=ex):
            st.session_state["query_input"] = ex

# Query input
query = st.text_area(
    "Your question",
    value=st.session_state.get("query_input", ""),
    placeholder="Describe your situation or ask about a strategic concept...",
    height=100,
    label_visibility="collapsed"
)

# Submit button
col1, col2, col3 = st.columns([1, 2, 1])
with col2:
    submit = st.button("⚖️ Consult the Laws", use_container_width=True)

# ─────────────────────────────────────────────
# Processing Pipeline
# ─────────────────────────────────────────────
if submit and query.strip():
    
    # Validate API key
    if provider != "Ollama" and not api_key:
        st.error(f"Please provide your {provider} API key in the sidebar.")
        st.stop()
    
    # ── Step 1: Guardrails ──────────────────
    with st.spinner("Checking query..."):
        guard_result = check_query(query)
    
    if not guard_result["allowed"]:
        st.warning(guard_result["response"])
        st.stop()
    
    # ── Step 2: Query Rewrite ───────────────
    with st.spinner("Optimizing query for retrieval..."):
        rewritten = rewrite_query(query, provider, api_key)
    
    if show_rewrite and rewritten != query:
        st.info(f"🔄 **Optimized query:** *{rewritten}*")
    
    # ── Step 3: Retrieval ───────────────────
    with st.spinner(f"Searching {top_k} most relevant passages..."):
        try:
            chunks = retrieve(rewritten, top_k=top_k)
        except Exception as e:
            err_msg = str(e)
            if "11434" in err_msg or "api/embeddings" in err_msg:
                st.error(
                    f"❌ Ollama connection failed: `{e}`\n\n"
                    "Make sure Ollama is running locally and you have pulled the embedding model:\n"
                    "1. Start the Ollama application on your system.\n"
                    "2. Run the following command in your terminal to download the embedding model:\n"
                    "   ```bash\n"
                    "   ollama pull nomic-embed-text\n"
                    "   ```"
                )
            else:
                st.error(
                    f"❌ Qdrant connection failed: `{e}`\n\n"
                    "Make sure Qdrant is running:\n"
                    "```bash\n"
                    "docker run -p 6333:6333 qdrant/qdrant\n"
                    "```"
                )
            st.stop()
    
    if not chunks:
        st.warning("No relevant passages found. Try rephrasing your question.")
        st.stop()
    
    # Show retrieved chunks if enabled
    if show_chunks:
        with st.expander(f"📚 Retrieved {len(chunks)} passages"):
            for i, chunk in enumerate(chunks, 1):
                law_label = f"Law {chunk['law']}" if chunk['law'] else "General"
                st.markdown(f"**{i}. {law_label} · Page {chunk['page']} · {chunk['section']}** *(score: {chunk['score']})*")
                st.markdown(f"> {chunk['content'][:300]}{'...' if len(chunk['content']) > 300 else ''}")
                st.divider()
    
    # ── Step 4: Generation ──────────────────
    with st.spinner(f"Consulting {provider}..."):
        answer = generate_answer(
            query=rewritten,
            original_query=query,
            chunks=chunks,
            provider=provider,
            api_key=api_key
        )
    
    # ── Display Answer ──────────────────────
    st.markdown("---")
    st.markdown("### Strategic Counsel")
    
    st.markdown(
        f'<div class="answer-card">{answer}</div>',
        unsafe_allow_html=True
    )
    
    # Source pills
    st.markdown("**Referenced sources:**")
    source_html = ""
    seen_pages = set()
    for chunk in chunks:
        page_key = (chunk['law'], chunk['page'])
        if page_key not in seen_pages:
            law_label = f"Law {chunk['law']}" if chunk['law'] else "General"
            source_html += f'<span class="source-badge">pg.{chunk["page"]} · {law_label}</span>'
            seen_pages.add(page_key)
    st.markdown(source_html, unsafe_allow_html=True)

elif submit and not query.strip():
    st.warning("Please enter a question first.")
