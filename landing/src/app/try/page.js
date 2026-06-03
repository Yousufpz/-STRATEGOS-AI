"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

export default function TryPage() {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("Gemini");
  const [apiKey, setApiKey] = useState("");
  const [topK, setTopK] = useState(8);
  const [showChunks, setShowChunks] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);

  const steps = [
    { icon: "🛡️", label: "Safety guardrails scan" },
    { icon: "🔄", label: "Query optimisation for retrieval" },
    { icon: "🔍", label: "Semantic search across 2800+ passages" },
    { icon: "⚖️", label: "Strategic synthesis & counsel" },
  ];

  useEffect(() => {
    const savedKeys = sessionStorage.getItem("strategos_keys");
    if (savedKeys) {
      try {
        const parsed = JSON.parse(savedKeys);
        if (parsed[provider]) setApiKey(parsed[provider]);
      } catch (e) { console.error(e); }
    }
  }, [provider]);

  const handleApiKeyChange = (val) => {
    setApiKey(val);
    const saved = sessionStorage.getItem("strategos_keys") ? JSON.parse(sessionStorage.getItem("strategos_keys")) : {};
    saved[provider] = val;
    sessionStorage.setItem("strategos_keys", JSON.stringify(saved));
  };

  const handleConsult = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setActiveStep(0);

    const stepInterval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < steps.length - 1) return prev + 1;
        clearInterval(stepInterval);
        return prev;
      });
    }, 950);

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, provider, apiKey: provider === "Ollama" ? null : apiKey, topK })
      });
      clearInterval(stepInterval);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed with status ${response.status}`);
      }
      const data = await response.json();
      setResult(data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    } catch (err) {
      clearInterval(stepInterval);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
      setActiveStep(-1);
    }
  };

  const parseAnswer = (text) => {
    const sections = { laws: "", interpretation: "", actions: [], sources: "", confidence: "", raw: text };
    if (!text) return sections;
    const headers = [
      { key: "laws", pattern: /(?:\*\*|###?\s+)?⚖️\s*Relevant Law\(s\)(?:\*\*)?/i },
      { key: "interpretation", pattern: /(?:\*\*|###?\s+)?📖\s*Interpretation(?:\*\*)?/i },
      { key: "actions", pattern: /(?:\*\*|###?\s+)?🎯\s*Strategic Actions(?:\*\*)?/i },
      { key: "sources", pattern: /(?:\*\*|###?\s+)?📍\s*Sources(?:\*\*)?/i },
      { key: "confidence", pattern: /(?:\*\*|###?\s+)?🎚️\s*Confidence(?:\*\*)?/i }
    ];
    const positions = headers.map(h => {
      const match = text.match(h.pattern);
      return { key: h.key, index: match ? match.index : -1, length: match ? match[0].length : 0 };
    }).filter(p => p.index !== -1).sort((a, b) => a.index - b.index);

    for (let i = 0; i < positions.length; i++) {
      const current = positions[i];
      const next = positions[i + 1];
      const start = current.index + current.length;
      const end = next ? next.index : text.length;
      const content = text.substring(start, end).trim();
      if (current.key === "actions") {
        sections.actions = content.split(/\n[-*•]\s*|\n\d+\.\s*/).map(item => item.trim()).filter(item => item.length > 0);
        if (sections.actions.length === 0 && content) sections.actions = [content];
      } else {
        sections[current.key] = content;
      }
    }
    if (!sections.laws && !sections.interpretation && sections.actions.length === 0) {
      sections.interpretation = text;
    }
    return sections;
  };

  const counsel = result ? parseAnswer(result.answer) : null;
  const confidenceLevel = counsel?.confidence?.toLowerCase().includes("high") ? "high"
    : counsel?.confidence?.toLowerCase().includes("medium") ? "medium" : "low";
  const confidenceWidth = confidenceLevel === "high" ? "92%" : confidenceLevel === "medium" ? "58%" : "28%";
  const confidenceColor = confidenceLevel === "high" ? "#4ade80" : confidenceLevel === "medium" ? "#fbbf24" : "#f87171";

  const topScore = result?.chunks?.[0]?.score || 0;
  const avgScore = result?.chunks?.length > 0
    ? (result.chunks.reduce((s, c) => s + c.score, 0) / result.chunks.length).toFixed(3)
    : 0;
  const uniqueLaws = result?.chunks ? [...new Set(result.chunks.map(c => c.law).filter(Boolean))].length : 0;

  return (
    <main className="chamber-container">
      <nav className="navbar glass-panel">
        <Link href="/" className="nav-logo" style={{ flexShrink: 0 }}>
          🏛️ <span className="gold-text-gradient">STRATEGOS AI</span>
        </Link>
        <ul className="nav-links nav-links-desktop">
          <li><Link href="/">Overview</Link></li>
          <li><a href="#console">Console</a></li>
        </ul>
        <div className="nav-right-group">
          <Link href="/" className="btn-secondary-futuristic hire-btn-desktop" style={{ padding: "0.6rem 1.5rem", fontSize: "0.85rem" }}>
            Exit Chamber
          </Link>
          {/* Mobile config button */}
          <button
            className="hamburger-btn config-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle chamber config"
          >
            ⚙️
          </button>
        </div>
      </nav>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="mobile-menu-overlay" onClick={() => setSidebarOpen(false)}>
          <div className="mobile-sidebar-drawer glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <span className="gold-text-gradient" style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.1em" }}>CHAMBER CONFIG</span>
              <button className="mobile-menu-close" onClick={() => setSidebarOpen(false)} aria-label="Close config">✕</button>
            </div>
            <div className="mobile-menu-divider"></div>
            <div className="mobile-sidebar-content">
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
                  <span className="input-hint">🔒 Stored only in your browser session — never sent to our servers.</span>
                </div>
              )}
              {provider === "Ollama" && (
                <div className="ollama-notice">
                  🦙 <strong>Local Inference Mode</strong><br />
                  Ensure Ollama is running on port 11434 with models downloaded.
                </div>
              )}
              <div className="form-group">
                <label>Retrieve Passages: <span style={{ color: "var(--primary-gold)" }}>{topK}</span></label>
                <input type="range" min="3" max="15" value={topK} onChange={(e) => setTopK(parseInt(e.target.value))} />
                <span className="input-hint">More passages = richer context.</span>
              </div>
              <div className="sidebar-toggle-row">
                <span>Show Source Passages</span>
                <button className={`toggle-btn ${showChunks ? "on" : "off"}`} onClick={() => setShowChunks(!showChunks)} aria-label="Toggle passage display">
                  <span className="toggle-knob" />
                </button>
              </div>
              <button className="btn-futuristic" style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }} onClick={() => setSidebarOpen(false)}>
                Apply & Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="chamber-layout">
        {/* ── Sidebar ── */}
        <aside className="glass-panel settings-panel settings-panel-desktop">
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
              <span className="input-hint">🔒 Stored only in your browser session — never sent to our servers.</span>
            </div>
          )}

          {provider === "Ollama" && (
            <div className="ollama-notice">
              🦙 <strong>Local Inference Mode</strong><br />
              Ensure Ollama is running on port 11434 with models downloaded.
            </div>
          )}

          <div className="form-group">
            <label>Retrieve Passages: <span style={{ color: "var(--primary-gold)" }}>{topK}</span></label>
            <input
              type="range" min="3" max="15" value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value))}
            />
            <span className="input-hint">More passages = richer context. Higher values slow generation.</span>
          </div>

          <div className="sidebar-toggle-row">
            <span>Show Source Passages</span>
            <button
              className={`toggle-btn ${showChunks ? "on" : "off"}`}
              onClick={() => setShowChunks(!showChunks)}
              aria-label="Toggle passage display"
            >
              <span className="toggle-knob" />
            </button>
          </div>

          {/* Quick Tips */}
          <div className="sidebar-tips">
            <div className="tip-header">💡 QUERY TIPS</div>
            <ul className="tip-list">
              <li>Describe your real situation for best results</li>
              <li>Include context: who, what, and what you want</li>
              <li>Workplace scenarios are indexed most deeply</li>
            </ul>
          </div>

          {/* Tech Stack Info */}
          <div className="tech-stack-box">
            <div className="tech-row"><span className="tech-label">Vector DB</span><span className="tech-val">Qdrant Cloud</span></div>
            <div className="tech-row"><span className="tech-label">Embeddings</span><span className="tech-val">Gemini Embed-001</span></div>
            <div className="tech-row"><span className="tech-label">Index Size</span><span className="tech-val">~2,800 passages</span></div>
            <div className="tech-row"><span className="tech-label">Search</span><span className="tech-val">Cosine Similarity</span></div>
          </div>
        </aside>

        {/* ── Main Console ── */}
        <section id="console" className="console-workspace">
          {/* Query Card */}
          <div className="glass-panel workspace-card">
            <div className="workspace-header-row">
              <div>
                <h2 className="gold-text-gradient">THE ORACLE CONSOLE</h2>
                <p className="workspace-desc">
                  State your strategic challenge. The Oracle cross-references 2,809 passages from Robert Greene's <em>The 48 Laws of Power</em> and synthesises tactical counsel.
                </p>
              </div>
              <div className="oracle-badge-stack">
                <div className="oracle-live-dot"></div>
                <span className="oracle-live-label">LIVE</span>
              </div>
            </div>

            <form onSubmit={handleConsult} className="console-form">
              <div className="example-scenarios">
                <span className="example-label">⚡ SELECT A SCENARIO:</span>
                <div className="example-pills">
                  {[
                    "My boss keeps taking credit for my work. How do I handle this?",
                    "I want to build a powerful network. Where do I start?",
                    "A colleague is spreading rumors about me. What's the strategic move?",
                    "How do I make myself indispensable at work?",
                    "I need to negotiate a raise but feel powerless. What does strategy say?",
                    "How do I deal with a manipulative coworker who plays the victim?",
                  ].map((ex, i) => (
                    <button key={i} type="button" className="example-pill-btn" onClick={() => setQuery(ex)} disabled={loading}>
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe your dilemma in detail... e.g. 'My superior takes credit for my formulations. What does strategy dictate?'"
                rows={5}
                disabled={loading}
              />

              <div className="form-actions">
                <div className="char-count">{query.length} chars</div>
                <button type="submit" className="btn-futuristic glow-box" disabled={loading || !query.trim()}>
                  {loading ? "⏳ Consulting..." : "⚖️ CONSULT THE LAWS"}
                </button>
              </div>
            </form>
          </div>

          {/* Pipeline Loader */}
          {loading && (
            <div className="glass-panel pipeline-card pulse-border">
              <h4>⚙️ PIPELINE EXECUTION</h4>
              <div className="pipeline-steps">
                {steps.map((step, idx) => (
                  <div key={idx} className={`pipeline-step ${idx < activeStep ? "complete" : idx === activeStep ? "active" : "pending"}`}>
                    <div className="step-dot">
                      {idx < activeStep ? "✓" : idx === activeStep ? step.icon : "○"}
                    </div>
                    <span className="step-text">{step.label}</span>
                    {idx === activeStep && <span className="step-spinner">···</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="glass-panel error-card">
              <h4 style={{ color: "#ef4444" }}>⚠️ Connection Failure</h4>
              <p>{error}</p>
              <div className="error-troubleshoot">
                <h5>Troubleshooting Check:</h5>
                <ul>
                  {error.includes("Ollama") && (<><li>Make sure Ollama is open and running locally.</li><li>Run <code>ollama pull nomic-embed-text</code> in your terminal.</li></>)}
                  {error.includes("Qdrant") && (<><li>Verify Qdrant Cloud is accessible.</li><li>Check your QDRANT_URL and QDRANT_API_KEY in environment settings.</li></>)}
                  {error.includes("Gemini") && (<><li>Double-check your Gemini API key above.</li><li>Ensure it has access to the Gemini generative models.</li></>)}
                  {!error.includes("Ollama") && !error.includes("Qdrant") && !error.includes("Gemini") && (<><li>Double-check your {provider} API key.</li><li>Verify your internet connection.</li></>)}
                </ul>
              </div>
            </div>
          )}

          {/* ── Results ── */}
          {result && counsel && (
            <div ref={resultRef}>
              {/* Stats Bar */}
              <div className="stats-bar glass-panel">
                <div className="stat-item">
                  <span className="stat-icon">📚</span>
                  <div className="stat-content">
                    <span className="stat-num">{result.chunks?.length || 0}</span>
                    <span className="stat-label">Passages Retrieved</span>
                  </div>
                </div>
                <div className="stat-divider" />
                <div className="stat-item">
                  <span className="stat-icon">🎯</span>
                  <div className="stat-content">
                    <span className="stat-num">{topScore.toFixed(3)}</span>
                    <span className="stat-label">Top Relevance Score</span>
                  </div>
                </div>
                <div className="stat-divider" />
                <div className="stat-item">
                  <span className="stat-icon">📊</span>
                  <div className="stat-content">
                    <span className="stat-num">{avgScore}</span>
                    <span className="stat-label">Avg Cosine Score</span>
                  </div>
                </div>
                <div className="stat-divider" />
                <div className="stat-item">
                  <span className="stat-icon">⚖️</span>
                  <div className="stat-content">
                    <span className="stat-num">{uniqueLaws}</span>
                    <span className="stat-label">Laws Referenced</span>
                  </div>
                </div>
                <div className="stat-divider" />
                <div className="stat-item">
                  <span className="stat-icon">🤖</span>
                  <div className="stat-content">
                    <span className="stat-num">{provider}</span>
                    <span className="stat-label">Synthesis Model</span>
                  </div>
                </div>
              </div>

              {/* Query Reformulation */}
              {result.rewritten && result.rewritten !== query && (
                <div className="glass-panel rewrite-card">
                  <div className="rewrite-inner">
                    <span className="rewrite-label">🔄 QUERY OPTIMISED FOR RETRIEVAL</span>
                    <p className="rewrite-text">"{result.rewritten}"</p>
                    <span className="rewrite-hint">Original: "{query}"</span>
                  </div>
                </div>
              )}

              {/* Counsel Card */}
              <div className="glass-panel counsel-card">
                <div className="counsel-header">
                  <span className="counsel-badge">⚖️ STRATEGIC ALIGNMENT</span>
                </div>

                {/* Laws */}
                {counsel.laws && (
                  <div className="counsel-section laws-section pulse-border">
                    <div className="section-tag">RELEVANT LAW(S)</div>
                    <p className="law-declaration">{counsel.laws}</p>
                  </div>
                )}

                {/* Interpretation */}
                {counsel.interpretation && (
                  <div className="counsel-section">
                    <div className="section-tag">📖 STRATEGIC INTERPRETATION</div>
                    <div className="interpretation-content font-serif">
                      {counsel.interpretation.split('\n').filter(p => p.trim()).map((para, i) => (
                        <p key={i} style={{ marginBottom: "0.75rem" }}>{para}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {counsel.actions && counsel.actions.length > 0 && (
                  <div className="counsel-section">
                    <div className="section-tag">🎯 TACTICAL ACTIONS</div>
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

                {/* Sources & Confidence */}
                <div className="counsel-meta-row">
                  {counsel.sources && (
                    <div className="meta-box">
                      <h5>📍 CITED SOURCES</h5>
                      <div className="sources-pills">
                        {counsel.sources.split(/\n|[;]/).map(src => src.trim()).filter(Boolean).map((src, i) => (
                          <span key={i} className="source-pill">{src}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Also show deduplicated page pills from chunks */}
                  {result.chunks && result.chunks.length > 0 && (
                    <div className="meta-box">
                      <h5>📄 REFERENCED PAGES</h5>
                      <div className="sources-pills">
                        {[...new Map(result.chunks.map(c => [`${c.law}-${c.page}`, c])).values()].map((c, i) => (
                          <span key={i} className="source-pill">
                            pg.{c.page} {c.law ? `· Law ${c.law}` : "· General"}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {counsel.confidence && (
                  <div className="confidence-full-row">
                    <div className="confidence-row-header">
                      <h5>🎚️ ORACLE CONFIDENCE</h5>
                      <span className="confidence-val" style={{ color: confidenceColor }}>
                        {confidenceLevel.toUpperCase()}
                      </span>
                    </div>
                    <div className="confidence-track">
                      <div className="confidence-bar" style={{ width: confidenceWidth, background: `linear-gradient(90deg, ${confidenceColor}88, ${confidenceColor})` }} />
                    </div>
                    <p className="confidence-reasoning">{counsel.confidence}</p>
                  </div>
                )}
              </div>

              {/* ── Passage Vault ── */}
              {showChunks && result.chunks && result.chunks.length > 0 && (
                <div className="glass-panel chunks-inspection-panel">
                  <div className="vault-header-row">
                    <h4 className="gold-text-gradient">📚 SOURCE VAULT — {result.chunks.length} PASSAGES RETRIEVED</h4>
                    <span className="vault-sub">Ranked by semantic relevance · cosine similarity</span>
                  </div>
                  <div className="chunks-list">
                    {result.chunks.map((chk, i) => {
                      const pct = Math.round(chk.score * 100);
                      const scoreColor = pct >= 70 ? "#4ade80" : pct >= 50 ? "#fbbf24" : "#94a3b8";
                      return (
                        <div key={i} className="chunk-item-gamified">
                          {/* Rank badge */}
                          <div className="chunk-rank" style={{ borderColor: scoreColor, color: scoreColor }}>
                            #{i + 1}
                          </div>
                          <div className="chunk-body">
                            {/* Meta row */}
                            <div className="chunk-meta-gamified">
                              <div className="chunk-tags">
                                {chk.law && (
                                  <span className="chunk-tag law-tag">⚖️ Law {chk.law}</span>
                                )}
                                {!chk.law && (
                                  <span className="chunk-tag general-tag">📖 General</span>
                                )}
                                <span className="chunk-tag page-tag">pg.{chk.page}</span>
                                <span className="chunk-tag section-tag">{chk.section}</span>
                              </div>
                              {/* Score meter */}
                              <div className="chunk-score-box">
                                <div className="chunk-score-bar-track">
                                  <div className="chunk-score-bar-fill" style={{ width: `${pct}%`, background: scoreColor }} />
                                </div>
                                <span className="chunk-score-num" style={{ color: scoreColor }}>{chk.score.toFixed(4)}</span>
                              </div>
                            </div>
                            {/* Full content */}
                            <p className="chunk-content-full">"{chk.content}"</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
