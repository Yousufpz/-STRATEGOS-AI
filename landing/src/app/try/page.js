"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function TryPage() {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("Gemini");
  const [apiKey, setApiKey] = useState("");
  const [topK, setTopK] = useState(8);
  const [showChunks, setShowChunks] = useState(false);

  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const steps = [
    "Checking query safety guardrails...",
    "Formulating optimal retrieval terms...",
    "Consulting the Qdrant Vector database...",
    "Synthesizing strategic counsel..."
  ];

  // Secure API key session recovery
  useEffect(() => {
    const savedKeys = sessionStorage.getItem("strategos_keys");
    if (savedKeys) {
      try {
        const parsed = JSON.parse(savedKeys);
        if (parsed[provider]) setApiKey(parsed[provider]);
      } catch (e) {
        console.error(e);
      }
    }
  }, [provider]);

  const handleApiKeyChange = (val) => {
    setApiKey(val);
    const savedKeys = sessionStorage.getItem("strategos_keys") 
      ? JSON.parse(sessionStorage.getItem("strategos_keys")) 
      : {};
    savedKeys[provider] = val;
    sessionStorage.setItem("strategos_keys", JSON.stringify(savedKeys));
  };

  const handleConsult = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);
    setActiveStep(0);

    // Simulate stepping progress
    const stepInterval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < steps.length - 1) return prev + 1;
        clearInterval(stepInterval);
        return prev;
      });
    }, 900);

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          provider,
          apiKey: provider === "Ollama" ? null : apiKey,
          topK
        })
      });

      clearInterval(stepInterval);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      clearInterval(stepInterval);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
      setActiveStep(-1);
    }
  };

  // Structured parser to extract sections from the custom LLM format
  const parseAnswer = (text) => {
    const sections = {
      laws: "",
      interpretation: "",
      actions: [],
      sources: "",
      confidence: "",
      raw: text
    };

    if (!text) return sections;

    // Use robust regexes matching standard markdown, headers, or plain emojis
    const headers = [
      { key: "laws", pattern: /(?:\*\*|###?\s+)?⚖️\s*Relevant Law\(s\)(?:\*\*)?/i },
      { key: "interpretation", pattern: /(?:\*\*|###?\s+)?📖\s*Interpretation(?:\*\*)?/i },
      { key: "actions", pattern: /(?:\*\*|###?\s+)?🎯\s*Strategic Actions(?:\*\*)?/i },
      { key: "sources", pattern: /(?:\*\*|###?\s+)?📍\s*Sources(?:\*\*)?/i },
      { key: "confidence", pattern: /(?:\*\*|###?\s+)?🎚️\s*Confidence(?:\*\*)?/i }
    ];

    // Find starting index of each header
    const positions = headers.map(h => {
      const match = text.match(h.pattern);
      return {
        key: h.key,
        index: match ? match.index : -1,
        length: match ? match[0].length : 0
      };
    }).filter(p => p.index !== -1)
      .sort((a, b) => a.index - b.index);

    // Extract content between headers
    for (let i = 0; i < positions.length; i++) {
      const current = positions[i];
      const next = positions[i + 1];
      const start = current.index + current.length;
      const end = next ? next.index : text.length;
      const content = text.substring(start, end).trim();

      if (current.key === "actions") {
        sections.actions = content
          .split(/\n[-*•]\s*|\n\d+\.\s*/)
          .map(item => item.trim())
          .filter(item => item.length > 0);
        if (sections.actions.length === 0 && content) {
          sections.actions = [content];
        }
      } else {
        sections[current.key] = content;
      }
    }

    // Fallback if no sections parsed
    if (!sections.laws && !sections.interpretation && sections.actions.length === 0) {
      sections.interpretation = text;
    }

    return sections;
  };

  const counsel = result ? parseAnswer(result.answer) : null;

  return (
    <main className="chamber-container">
      {/* Navbar */}
      <nav className="navbar glass-panel">
        <Link href="/" className="nav-logo">
          🏛️ <span className="gold-text-gradient">STRATEGOS AI</span>
        </Link>
        <ul className="nav-links">
          <li><Link href="/">Overview</Link></li>
          <li><a href="#console">Console</a></li>
        </ul>
        <Link href="/" className="btn-secondary-futuristic" style={{ padding: "0.6rem 1.5rem", fontSize: "0.85rem" }}>
          Exit Chamber
        </Link>
      </nav>

      <div className="chamber-layout">
        {/* Sidebar Settings Panel */}
        <aside className="glass-panel settings-panel">
          <h3 className="gold-text-gradient">CHAMBER CONFIG</h3>
          <div className="settings-line"></div>

          <div className="form-group">
            <label>LLM Provider</label>
            <select value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value="Gemini">Gemini (Recommended)</option>
              <option value="OpenAI">OpenAI</option>
              <option value="Anthropic">Anthropic</option>
              <option value="Ollama">Ollama (Local)</option>
            </select>
          </div>

          {provider !== "Ollama" && (
            <div className="form-group">
              <label>{provider} API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder={`Paste your ${provider} key...`}
              />
              <span className="input-hint">Keys are only stored locally in your current tab session.</span>
            </div>
          )}

          {provider === "Ollama" && (
            <div className="ollama-notice">
              🦙 **Local Inference Mode**<br />
              Ensure Ollama is running on port 11434 with models downloaded.
            </div>
          )}

          <div className="form-group">
            <label>Retrieve Chunks: {topK}</label>
            <input
              type="range"
              min="3"
              max="15"
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value))}
            />
            <span className="input-hint">More chunks provide deeper context but increase generation time.</span>
          </div>

          <div className="checkbox-group">
            <input
              type="checkbox"
              id="show-chunks"
              checked={showChunks}
              onChange={(e) => setShowChunks(e.target.checked)}
            />
            <label htmlFor="show-chunks">Inspect Retrieved Chunks</label>
          </div>
        </aside>

        {/* Console Workspace */}
        <section id="console" className="console-workspace">
          <div className="glass-panel workspace-card">
            <h2 className="gold-text-gradient">THE ORACLE CONSOLE</h2>
            <p className="workspace-desc">
              State the strategic challenge or human conflict you are navigating. The oracle will cross-reference the laws of power.
            </p>

            <form onSubmit={handleConsult} className="console-form">
              <div className="example-scenarios">
                <span className="example-label">💡 SELECT A STRATEGIC SCENARIO:</span>
                <div className="example-pills">
                  {[
                    "My boss keeps taking credit for my work. How do I handle this?",
                    "I want to build a powerful network. Where do I start?",
                    "A colleague is spreading rumors about me. What's the strategic move?",
                    "How do I make myself indispensable at work?",
                    "I need to negotiate a raise but feel powerless. What does strategy say?"
                  ].map((ex, i) => (
                    <button
                      key={i}
                      type="button"
                      className="example-pill-btn"
                      onClick={() => setQuery(ex)}
                      disabled={loading}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="My superior takes credit for my formulations. How should I counter this position..."
                rows={4}
                disabled={loading}
              />
              
              <div className="form-actions">
                <button type="submit" className="btn-futuristic glow-box" disabled={loading || !query.trim()}>
                  {loading ? "Consulting..." : "CONSULT THE LAWS"}
                </button>
              </div>
            </form>
          </div>

          {/* Simulated Processing Node Pipeline */}
          {loading && (
            <div className="glass-panel pipeline-card pulse-border">
              <h4>PIPELINE EXECUTION</h4>
              <div className="pipeline-steps">
                {steps.map((step, idx) => (
                  <div 
                    key={idx} 
                    className={`pipeline-step ${
                      idx < activeStep ? "complete" : idx === activeStep ? "active" : "pending"
                    }`}
                  >
                    <div className="step-dot">
                      {idx < activeStep ? "✓" : idx === activeStep ? "●" : "○"}
                    </div>
                    <span className="step-text">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {error && (
            <div className="glass-panel error-card">
              <h4 style={{ color: "#ef4444" }}>⚠️ Connection Failure</h4>
              <p>{error}</p>
              <div className="error-troubleshoot">
                <h5>Troubleshooting Check:</h5>
                <ul>
                  {error.includes("Ollama") && (
                    <>
                      <li>Make sure Ollama is open and running locally.</li>
                      <li>Run <code>ollama pull nomic-embed-text</code> in your terminal.</li>
                    </>
                  )}
                  {error.includes("Qdrant") && (
                    <>
                      <li>Verify your Docker container is active.</li>
                      <li>Run <code>docker run -p 6333:6333 qdrant/qdrant</code> to launch the DB.</li>
                    </>
                  )}
                  {!error.includes("Ollama") && !error.includes("Qdrant") && (
                    <>
                      <li>Double check your API key for {provider}.</li>
                      <li>Verify your internet connection.</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Results Display */}
          {result && counsel && (
            <div className="glass-panel counsel-card">
              <div className="counsel-header">
                <span className="counsel-badge">STRATEGIC ALIGNMENT</span>
                {result.rewritten && result.rewritten !== query && (
                  <div className="rewritten-block">
                    <span>REFORMULATED PROBLEM:</span>
                    <p>"{result.rewritten}"</p>
                  </div>
                )}
              </div>

              {/* Laws Section */}
              {counsel.laws && (
                <div className="counsel-section laws-section pulse-border">
                  <h4 className="gold-text-gradient">⚖️ RELEVANT LAW(S)</h4>
                  <p className="law-declaration">{counsel.laws}</p>
                </div>
              )}

              {/* Interpretation Section */}
              {counsel.interpretation && (
                <div className="counsel-section">
                  <h4>📖 STRATEGIC INTERPRETATION</h4>
                  <div className="interpretation-content font-serif">
                    <p>{counsel.interpretation}</p>
                  </div>
                </div>
              )}

              {/* Actions Section */}
              {counsel.actions && counsel.actions.length > 0 && (
                <div className="counsel-section">
                  <h4>🎯 TACTICAL ACTIONS</h4>
                  <ul className="actions-list">
                    {counsel.actions.map((act, i) => (
                      <li key={i} className="action-item">
                        <span className="action-number">{i + 1}</span>
                        <p>{act}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sources and Confidence Row */}
              <div className="counsel-meta-row">
                {counsel.sources && (
                  <div className="meta-box">
                    <h5>📍 COGNITIVE SOURCES</h5>
                    <div className="sources-pills">
                      {counsel.sources.split(/[,;]/).map((src, i) => (
                        <span key={i} className="source-pill">{src.trim()}</span>
                      ))}
                    </div>
                  </div>
                )}

                {counsel.confidence && (
                  <div className="meta-box">
                    <h5>🎚️ ORACLE CONFIDENCE</h5>
                    <div className="confidence-indicator">
                      <span className="confidence-val">{counsel.confidence}</span>
                      <div className="confidence-track">
                        <div 
                          className="confidence-bar"
                          style={{
                            width: counsel.confidence.toLowerCase().includes("high") 
                              ? "90%" 
                              : counsel.confidence.toLowerCase().includes("medium") 
                              ? "60%" 
                              : "30%"
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chunk Inspection Panel */}
          {result && showChunks && result.chunks && result.chunks.length > 0 && (
            <div className="glass-panel chunks-inspection-panel">
              <h4 className="gold-text-gradient">VAULT EVIDENCE ({result.chunks.length} PASSAGES)</h4>
              <div className="chunks-list">
                {result.chunks.map((chk, i) => (
                  <div key={i} className="chunk-item">
                    <div className="chunk-meta">
                      <span>Passage {i + 1} · {chk.law ? `Law ${chk.law}` : "General"} · Page {chk.page} · {chk.section}</span>
                      <span className="chunk-score">Cosine Score: {chk.score}</span>
                    </div>
                    <p className="chunk-content">"{chk.content}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
