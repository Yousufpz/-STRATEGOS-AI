import os
import json
from dotenv import load_dotenv
from qdrant_client import QdrantClient
import google.generativeai as genai
from openai import OpenAI
import anthropic
import requests

# Load environment variables
load_dotenv(override=True)

# Configuration variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "strategos_laws")

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
DEFAULT_EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")
DEFAULT_CHUNK_MODEL = os.getenv("CHUNK_MODEL", "deepseek-r1:8b")

# Configure Google Generative AI
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Initialize Qdrant Client
def get_qdrant_client():
    try:
        if QDRANT_API_KEY:
            return QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
        else:
            return QdrantClient(url=QDRANT_URL)
    except Exception as e:
        print(f"[!] Qdrant connection error: {e}")
        # Fallback to in-memory Qdrant client for local testing if Qdrant isn't running
        print("[!] Falling back to local in-memory Qdrant database.")
        return QdrantClient(":memory:")

# Helper for unified vector embeddings
def get_embedding(text: str, provider: str = "gemini", model_name: str = None) -> list:
    """
    Generate an embedding vector for a given text.
    Supported providers: gemini, openai, ollama
    """
    text = text.replace("\n", " ") # Clean input text
    
    if provider == "gemini":
        model = model_name or "models/text-embedding-004"
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not found in environment variables.")
        response = genai.embed_content(
            model=model,
            content=text,
            task_type="retrieval_document"
        )
        return response['embedding']
        
    elif provider == "openai":
        model = model_name or "text-embedding-3-small"
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not found in environment variables.")
        client = OpenAI(api_key=OPENAI_API_KEY)
        response = client.embeddings.create(input=[text], model=model)
        return response.data[0].embedding
        
    elif provider == "ollama":
        model = model_name or DEFAULT_EMBED_MODEL
        url = f"{OLLAMA_BASE_URL}/api/embeddings"
        response = requests.post(url, json={"model": model, "prompt": text}, timeout=30)
        response.raise_for_status()
        return response.json()["embedding"]
        
    else:
        raise ValueError(f"Unknown embedding provider: {provider}")

# Helper for unified LLM chat/completion requests
def get_completion(
    prompt: str, 
    system_prompt: str = "You are a helpful assistant.", 
    provider: str = "gemini", 
    model_name: str = None,
    json_mode: bool = False
) -> str:
    """
    Get chat completion from an LLM.
    Supported providers: gemini, openai, anthropic, ollama
    """
    if provider == "gemini":
        model = model_name or "gemini-1.5-flash"
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not found in environment variables.")
        
        # Configure model
        generation_config = {}
        if json_mode:
            generation_config["response_mime_type"] = "application/json"
            
        gemini_model = genai.GenerativeModel(
            model_name=model,
            system_instruction=system_prompt,
            generation_config=generation_config
        )
        response = gemini_model.generate_content(prompt)
        return response.text.strip()
        
    elif provider == "openai":
        model = model_name or "gpt-4o-mini"
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not found in environment variables.")
        
        client = OpenAI(api_key=OPENAI_API_KEY)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]
        
        response_format = {"type": "json_object"} if json_mode else None
        
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            response_format=response_format
        )
        return response.choices[0].message.content.strip()
        
    elif provider == "anthropic":
        model = model_name or "claude-3-5-sonnet-latest"
        if not ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY not found in environment variables.")
            
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        
        # Anthropic does not support json_mode explicitly in the same way, 
        # so for Anthropic we rely on prompting, or check system instructions.
        response = client.messages.create(
            model=model,
            max_tokens=4000,
            system=system_prompt,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        return response.content[0].text.strip()
        
    elif provider == "ollama":
        model = model_name or "llama3"
        url = f"{OLLAMA_BASE_URL}/api/generate"
        
        full_prompt = f"System: {system_prompt}\n\nUser: {prompt}"
        payload = {
            "model": model,
            "prompt": full_prompt,
            "stream": False
        }
        if json_mode:
            payload["format"] = "json"
            
        response = requests.post(url, json=payload, timeout=90)
        response.raise_for_status()
        return response.json()["response"].strip()
        
    else:
        raise ValueError(f"Unknown LLM provider: {provider}")
