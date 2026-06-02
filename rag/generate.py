"""
Phase 7: Answer Generation
--------------------------
The final step: take retrieved chunks and generate a structured answer.

The critical constraint: "Answer ONLY from the provided context."
This prevents hallucination — the model cannot add knowledge from 
its training data. Every claim must be traceable to a retrieved chunk.

The structured output format (Law, Interpretation, Actions, Sources, 
Confidence) makes the answer look professional and scannable.
"""

import os
import google.generativeai as genai
import anthropic
from openai import OpenAI
import requests


def build_context_block(chunks: list[dict]) -> str:
    """
    Format retrieved chunks into a clean context block for the LLM.
    Including law number, page, and section helps the model cite correctly.
    """
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        law_info = f"Law {chunk['law']}" if chunk['law'] else "General Principle"
        citation = f"[Source {i}: {law_info}, Page {chunk['page']}, {chunk['section']}]"
        context_parts.append(f"{citation}\n{chunk['content']}")
    
    return "\n\n---\n\n".join(context_parts)


def build_prompt(query: str, context: str, original_query: str) -> tuple[str, str]:
    """
    Build system + user prompts for the generation step.
    Returns (system_prompt, user_prompt).
    """
    system_prompt = """You are Strategos AI, an expert strategic advisor powered by The 48 Laws of Power.

Your role is to provide precise, actionable strategic guidance based EXCLUSIVELY on the provided context.

Rules:
1. NEVER use knowledge outside the provided context
2. Always cite which Law and page number your answer draws from
3. Be direct and practical — real advice, not vague platitudes
4. If the context doesn't fully answer the question, say so honestly
5. Maintain a tone that is wise, measured, and strategic — never preachy

Output format (use exactly these headers):
**⚖️ Relevant Law(s)**
[Name and number of the most relevant law(s)]

**📖 Interpretation**  
[What this law means in the context of this question]

**🎯 Strategic Actions**
[3-5 concrete, actionable steps the person can take]

**📍 Sources**
[Page numbers and sections used]

**🎚️ Confidence**
[Your confidence that this context directly answers the question: High/Medium/Low + one sentence why]"""

    user_prompt = f"""User's question: {original_query}

Optimized retrieval query used: {query}

Retrieved context from The 48 Laws of Power:
---
{context}
---

Provide strategic guidance following the exact format specified."""

    return system_prompt, user_prompt


def generate_answer(
    query: str,
    original_query: str,
    chunks: list[dict],
    provider: str,
    api_key: str = None
) -> str:
    """
    Generate a structured answer from retrieved chunks.
    
    Args:
        query: The rewritten/optimized query
        original_query: What the user actually typed
        chunks: Retrieved chunks from Qdrant
        provider: "Gemini" | "OpenAI" | "Anthropic" | "Ollama"
        api_key: Provider API key
    
    Returns: Formatted markdown string
    """
    
    if not chunks:
        return """⚠️ **No Relevant Content Found**

I couldn't find relevant passages in The 48 Laws of Power for your question.

Try:
- Being more specific about the situation
- Using different terminology
- Asking about a specific law by name or number"""

    context = build_context_block(chunks)
    system_prompt, user_prompt = build_prompt(query, context, original_query)
    
    try:
        if provider == "Gemini":
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(
                model_name="gemini-1.5-pro",
                system_instruction=system_prompt
            )
            response = model.generate_content(
                user_prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.4,
                    max_output_tokens=1500
                )
            )
            return response.text
        
        elif provider == "OpenAI":
            client = OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=1500,
                temperature=0.4
            )
            return response.choices[0].message.content
        
        elif provider == "Anthropic":
            client = anthropic.Anthropic(api_key=api_key)
            response = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1500,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
            )
            return response.content[0].text
        
        elif provider == "Ollama":
            chunk_model = os.getenv("CHUNK_MODEL", "deepseek-r1:8b")
            ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            response = requests.post(
                f"{ollama_url}/api/generate",
                json={
                    "model": chunk_model,
                    "prompt": full_prompt,
                    "stream": False,
                    "options": {"temperature": 0.4, "num_predict": 1500}
                },
                timeout=180
            )
            return response.json()["response"]
    
    except Exception as e:
        return f"❌ **Generation Error**\n\n{provider} API call failed: `{str(e)}`\n\nCheck your API key and try again."
