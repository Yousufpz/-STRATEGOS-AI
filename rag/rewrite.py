"""
Phase 4: Query Rewriting
------------------------
Users ask questions in natural, conversational language.
Vector search works better with formal, concept-rich queries.

Example:
Input:  "my boss keeps stealing my ideas wtf"
Output: "How should a person handle a superior who appropriates their work 
         and takes credit for their contributions without acknowledgment?"

We use the same LLM provider the user selected for consistency.
"""

import os
import google.generativeai as genai
import anthropic
from openai import OpenAI
import requests


def rewrite_query(query: str, provider: str, api_key: str = None) -> str:
    """
    Rewrite the user's conversational query into a retrieval-optimized query.
    Falls back to original query if rewriting fails.
    """
    
    system_prompt = """You are a query optimization expert for a retrieval system about power dynamics, strategy, and human behavior.

Rewrite the user's query to maximize semantic search retrieval quality.

Rules:
- Make it formal and concept-focused
- Expand abbreviations and slang
- Add relevant strategic/psychological terminology
- Keep it to 1-2 sentences
- Return ONLY the rewritten query, nothing else"""

    user_prompt = f"Original query: {query}\n\nRewritten query:"
    
    try:
        if provider == "Gemini":
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-2.5-flash")
            response = model.generate_content(
                f"{system_prompt}\n\n{user_prompt}",
                generation_config=genai.GenerationConfig(
                    temperature=0.3,
                    max_output_tokens=150
                )
            )
            return response.text.strip()
        
        elif provider == "OpenAI":
            client = OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model="gpt-4o-mini",  # Cheap and fast for rewriting
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=150,
                temperature=0.3
            )
            return response.choices[0].message.content.strip()
        
        elif provider == "Anthropic":
            client = anthropic.Anthropic(api_key=api_key)
            response = client.messages.create(
                model="claude-haiku-4-5-20251001",  # Fast + cheap for rewriting
                max_tokens=150,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
            )
            return response.content[0].text.strip()
        
        elif provider == "Ollama":
            # Use the chunking model for rewriting too
            chunk_model = os.getenv("CHUNK_MODEL", "deepseek-r1:8b")
            ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            response = requests.post(
                f"{ollama_url}/api/generate",
                json={
                    "model": chunk_model,
                    "prompt": f"{system_prompt}\n\n{user_prompt}",
                    "stream": False,
                    "options": {"temperature": 0.3, "num_predict": 150}
                },
                timeout=60
            )
            return response.json()["response"].strip()
    
    except Exception as e:
        print(f"⚠️  Query rewriting failed ({e}) — using original")
        return query  # Graceful fallback


if __name__ == "__main__":
    # Test it
    test_query = "my boss keeps stealing my work ideas"
    print(f"Original: {test_query}")
    # You'd need an actual API key to test this
