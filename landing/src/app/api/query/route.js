import { NextResponse } from "next/server";

// Replicating Phase 8 Guardrails
const HARMFUL_PATTERNS = [
  /\b(kill|murder|assault|attack|hurt|harm|injure)\b/i,
  /\b(hack|crack|breach|steal|fraud|scam|launder)\b/i,
  /\b(blackmail|extort|threaten|stalk|harass)\b/i
];

const HARMFUL_RESPONSE = `⚠️ **Query Outside Scope**

I can help you understand strategic principles from *The 48 Laws of Power*, but I cannot provide guidance on harmful, illegal, or unethical applications.

Try rephrasing your question around:
- Navigating workplace dynamics
- Building influence and reputation
- Understanding human psychology
- Strategic decision-making`;

function checkSafety(query) {
  const queryLower = query.toLowerCase().trim();
  if (queryLower.length < 5) {
    return {
      allowed: false,
      reason: "too_short",
      response: "Please ask a complete question about strategy or power dynamics."
    };
  }

  for (const pattern of HARMFUL_PATTERNS) {
    if (pattern.test(queryLower)) {
      return {
        allowed: false,
        reason: "harmful",
        response: HARMFUL_RESPONSE
      };
    }
  }

  return { allowed: true, reason: null, response: null };
}

// System prompts from Python RAG
const REWRITE_SYSTEM_PROMPT = `You are a query optimization expert for a retrieval system about power dynamics, strategy, and human behavior.

Rewrite the user's query to maximize semantic search retrieval quality.

Rules:
- Make it formal and concept-focused
- Expand abbreviations and slang
- Add relevant strategic/psychological terminology
- Keep it to 1-2 sentences
- Return ONLY the rewritten query, nothing else`;

const GENERATE_SYSTEM_PROMPT = `You are Strategos AI, an expert strategic advisor powered by The 48 Laws of Power.

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
[Your confidence that this context directly answers the question: High/Medium/Low + one sentence why]`;

// Core LLM Caller abstraction supporting Gemini, OpenAI, Anthropic, Ollama
async function callLLM({ provider, model, systemPrompt, userPrompt, apiKey, temperature = 0.4, maxTokens = 1500 }) {
  const configApiKey = {
    Gemini: apiKey || process.env.GEMINI_API_KEY,
    OpenAI: apiKey || process.env.OPENAI_API_KEY,
    Anthropic: apiKey || process.env.ANTHROPIC_API_KEY,
  };

  if (provider === "Gemini") {
    const key = configApiKey.Gemini;
    if (!key) throw new Error("Missing Gemini API Key. Please provide it in the settings.");
    
    // Using gemini-1.5-pro / gemini-2.5-flash standard generateContent endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens
        }
      })
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini API returned status ${res.status}`);
    }
    
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  }

  if (provider === "OpenAI") {
    const key = configApiKey.OpenAI;
    if (!key) throw new Error("Missing OpenAI API Key. Please provide it in the settings.");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature,
        max_tokens: maxTokens
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI API returned status ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  }

  if (provider === "Anthropic") {
    const key = configApiKey.Anthropic;
    if (!key) throw new Error("Missing Anthropic API Key. Please provide it in the settings.");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        temperature
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Anthropic API returned status ${res.status}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text?.trim() || "";
  }

  if (provider === "Ollama") {
    const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const res = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: `${systemPrompt}\n\nUser's Request:\n${userPrompt}`,
        stream: false,
        options: {
          temperature,
          num_predict: maxTokens
        }
      })
    });

    if (!res.ok) {
      throw new Error(`Ollama API returned status ${res.status}. Ensure Ollama is running.`);
    }

    const data = await res.json();
    return data.response?.trim() || "";
  }

  throw new Error(`Unknown LLM provider: ${provider}`);
}

export async function POST(request) {
  try {
    const { query, provider = "Gemini", apiKey = null, topK = 8 } = await request.json();

    if (!query || !query.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // 1. Safety Guardrails Check
    const safetyResult = checkSafety(query);
    if (!safetyResult.allowed) {
      return NextResponse.json({
        allowed: false,
        rewritten: query,
        answer: safetyResult.response,
        chunks: [],
      });
    }

    // 2. Query Rewriting
    let rewrittenQuery = query;
    const rewriteModelMap = {
      Gemini: "gemini-2.5-flash",
      OpenAI: "gpt-4o-mini",
      Anthropic: "claude-3-5-haiku-20241022",
      Ollama: process.env.CHUNK_MODEL || "gemma3:4b"
    };

    try {
      rewrittenQuery = await callLLM({
        provider,
        model: rewriteModelMap[provider],
        systemPrompt: REWRITE_SYSTEM_PROMPT,
        userPrompt: `Original query: ${query}\n\nRewritten query:`,
        apiKey,
        temperature: 0.3,
        maxTokens: 150
      });
    } catch (e) {
      console.warn("⚠️ Query rewriting failed, falling back to original query:", e.message);
      rewrittenQuery = query;
    }

    // 3. Generate Vector Embedding
    // Strategy: Try Gemini Embedding API first (free, cloud-native, works in production).
    //           Fall back to local Ollama if Gemini key is unavailable.
    let queryVector;

    async function getGeminiEmbedding(text, geminiKey) {
      // Gemini text-embedding-004 produces 768-dim vectors — same size as nomic-embed-text
      const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text }] },
          taskType: "RETRIEVAL_QUERY"
        }),
        signal: AbortSignal.timeout(30000)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Gemini Embedding API returned status ${res.status}`);
      }
      const data = await res.json();
      return data.embedding?.values;
    }

    async function getOllamaEmbedding(text) {
      const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
      const embedModel = process.env.EMBED_MODEL || "nomic-embed-text";
      const res = await fetch(`${ollamaUrl}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: embedModel, prompt: text }),
        signal: AbortSignal.timeout(15000)
      });
      if (!res.ok) throw new Error(`Ollama embeddings returned status ${res.status}`);
      const data = await res.json();
      return data.embedding;
    }

    const geminiKey = apiKey || process.env.GEMINI_API_KEY;
    try {
      if (geminiKey) {
        // ✅ Production path: Gemini Embedding API (free, always available)
        queryVector = await getGeminiEmbedding(rewrittenQuery, geminiKey);
      } else {
        // Local development fallback: Ollama
        queryVector = await getOllamaEmbedding(rewrittenQuery);
      }
    } catch (e) {
      // Final fallback: try Ollama if Gemini failed
      try {
        queryVector = await getOllamaEmbedding(rewrittenQuery);
      } catch (ollamaErr) {
        return NextResponse.json({
          error: `Embedding generation failed. Gemini: ${e.message}. Ollama fallback: ${ollamaErr.message}. Tip: Provide a Gemini API key for production use.`
        }, { status: 500 });
      }
    }

    // 4. Query Qdrant Vector Database
    const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
    const qdrantApiKey = process.env.QDRANT_API_KEY || "";
    const collectionName = process.env.COLLECTION_NAME || "strategos_laws";
    const qdrantHeaders = { "Content-Type": "application/json" };
    if (qdrantApiKey) {
      qdrantHeaders["api-key"] = qdrantApiKey;
    }

    let chunks = [];
    try {
      const qdrantRes = await fetch(`${qdrantUrl}/collections/${collectionName}/points/query`, {
        method: "POST",
        headers: qdrantHeaders,
        body: JSON.stringify({
          query: queryVector,
          limit: topK,
          with_payload: true,
          score_threshold: 0.3
        }),
        signal: AbortSignal.timeout(30000)
      });

      if (!qdrantRes.ok) {
        throw new Error(`Qdrant returned status ${qdrantRes.status}`);
      }

      const qdrantData = await qdrantRes.json();
      const points = qdrantData.result?.points || [];
      chunks = points.map(hit => ({
        score: Math.round(hit.score * 10000) / 10000,
        law: hit.payload?.law || null,
        page: hit.payload?.page || 0,
        section: hit.payload?.section || "General",
        content: hit.payload?.content || ""
      }));
    } catch (e) {
      return NextResponse.json({
        error: `Qdrant connection failed: ${e.message}. Ensure Qdrant is running via Docker or cloud.`
      }, { status: 500 });
    }

    if (chunks.length === 0) {
      return NextResponse.json({
        allowed: true,
        rewritten: rewrittenQuery,
        answer: `⚠️ **No Relevant Content Found**\n\nI couldn't find relevant passages in *The 48 Laws of Power* matching your question.\n\nTry rephrasing your dilemma.`,
        chunks: [],
      });
    }

    // 5. Generate Answer via LLM
    const genModelMap = {
      Gemini: "gemini-2.5-flash",
      OpenAI: "gpt-4o",
      Anthropic: "claude-3-5-sonnet-20241022",
      Ollama: process.env.CHUNK_MODEL || "gemma3:4b"
    };

    // Format retrieved chunks into context
    const contextParts = chunks.map((chunk, index) => {
      const lawInfo = chunk.law ? `Law ${chunk.law}` : "General Principle";
      const citation = `[Source ${index + 1}: ${lawInfo}, Page ${chunk.page}, ${chunk.section}]`;
      return `${citation}\n${chunk.content}`;
    });
    const contextBlock = contextParts.join("\n\n---\n\n");

    const userPrompt = `User's question: ${query}

Optimized retrieval query used: ${rewrittenQuery}

Retrieved context from The 48 Laws of Power:
---
${contextBlock}
---

Provide strategic guidance following the exact format specified.`;

    let answer = "";
    try {
      answer = await callLLM({
        provider,
        model: genModelMap[provider],
        systemPrompt: GENERATE_SYSTEM_PROMPT,
        userPrompt,
        apiKey,
        temperature: 0.4,
        maxTokens: 1500
      });
    } catch (e) {
      return NextResponse.json({
        error: `${provider} generation failed: ${e.message}. Please double check your API key.`
      }, { status: 502 });
    }

    return NextResponse.json({
      allowed: true,
      rewritten: rewrittenQuery,
      answer,
      chunks
    });

  } catch (error) {
    console.error("API Error in /api/query:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
