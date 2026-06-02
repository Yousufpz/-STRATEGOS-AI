"use client";

import Link from "next/link";
import { useState } from "react";

export default function LandingPage() {
  const [activeLaw, setActiveLaw] = useState(1);
  const [shareText, setShareText] = useState("Share My");

  const handleShare = () => {
    const textToCopy = "Mohd Yousuf - AI Engineer | Contact Me - mohdyousufparvez@gmmail.com | 8707563162";
    navigator.clipboard.writeText(textToCopy);
    setShareText("Copied! ✓");
    setTimeout(() => {
      setShareText("Share My");
    }, 2000);
  };

  const sampleLaws = [
    {
      id: 1,
      title: "Never Outshine the Master",
      text: "Always make those above you feel comfortably superior. In your desire to please or impress them, do not go too far in displaying your talents or you might accomplish the opposite — inspire fear and insecurity.",
      keys: "Make your masters appear more brilliant than they are and you will attain the heights of power. Over-shining triggers resentment and envy, leading to your eventual downfall."
    },
    {
      id: 3,
      title: "Conceal Your Intentions",
      text: "Keep people off-balance and in the dark by never revealing the purpose behind your actions. If they have no clue what you are up to, they cannot prepare a defense.",
      keys: "Guide them far enough down the wrong path, envelop them in enough smoke, and by the time they realize your intentions, it will be too late."
    },
    {
      id: 4,
      title: "Always Say Less Than Necessary",
      text: "When you are trying to impress people with words, the more you say, the more common you appear, and the less in control. Even if you are saying something banal, it will seem original if you make it vague, open-ended, and sphinx-like.",
      keys: "Powerful people impress and intimidate by saying less. The more you talk, the more likely you are to say something foolish."
    },
    {
      id: 48,
      title: "Assume Formlessness",
      text: "By having a visible plan, you open yourself to attack. Instead of taking a shape for your enemy to grasp, keep yourself adaptable and on the move.",
      keys: "Accept the fact that nothing is certain and no law is fixed. The best way to protect yourself is to be as fluid and formless as water."
    }
  ];

  return (
    <main className="landing-container">
      {/* Top Banner: Hire Me & Share My */}
      <div className="hire-banner">
        <div className="hire-left">
          <span className="hire-badge">Hire Me</span>
          <span className="hire-name">Mohd Yousuf</span>
          <span className="hire-separator">|</span>
          <a href="mailto:mohdyousufparvez@gmail.com" className="hire-contact">
            mohdyousufparvez@gmail.com
          </a>
          <span className="hire-separator">|</span>
          <a href="tel:8707563162" className="hire-contact">
            8707563162
          </a>
        </div>
        <div className="hire-right">
          <a href="#resume" className="hire-btn-action">
            Resume 📄
          </a>
          <a href="#portfolio" className="hire-btn-action">
            Portfolio 🌐
          </a>
          <button onClick={handleShare} className="hire-btn-share glow-box">
            {shareText}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="navbar glass-panel">
        <Link href="/" className="nav-logo">
          🏛️ <span className="gold-text-gradient">STRATEGOS AI</span>
        </Link>
        <ul className="nav-links">
          <li><a href="#vault">Vault</a></li>
          <li><a href="#architecture">Architecture</a></li>
          <li><a href="#codex">Codex</a></li>
        </ul>
        <Link href="/try" className="btn-futuristic" style={{ padding: "0.6rem 1.5rem", fontSize: "0.85rem" }}>
          Consult Oracle
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">REACTIVE RAG SYSTEM</div>
        <h1 className="hero-title gold-text-gradient">
          COMMAND THE BOARD
        </h1>
        <p className="hero-subtitle">
          Consult the ultimate strategic chamber. Leverage AI semantic retrieval to navigate complex human relationships and workplace dynamics using Robert Greene's *The 48 Laws of Power*.
        </p>
        <div className="hero-ctas">
          <Link href="/try" className="btn-futuristic glow-box">
            ENTER THE CHAMBER ➔
          </Link>
          <a href="#vault" className="btn-secondary-futuristic">
            EXPLORE THE CORE
          </a>
        </div>
      </section>

      {/* Pillars Section */}
      <section id="vault" className="section-container">
        <div className="section-header">
          <span className="section-pre">SYSTEM DESIGN</span>
          <h2 className="section-title">THE STRATEGIC PILLARS</h2>
          <div className="section-line"></div>
        </div>

        <div className="pillars-grid">
          <div className="glass-panel pillar-card">
            <div className="pillar-num">I</div>
            <h3>Semantic Vault</h3>
            <p>
              Standard keyword searches find words; Strategos AI maps raw strategic intent. By embedding content into a 768-dimensional space, we capture context, metaphor, and subtext.
            </p>
          </div>

          <div className="glass-panel pillar-card">
            <div className="pillar-num">II</div>
            <h3>Context-Driven Synthesis</h3>
            <p>
              Zero hallucinations. Answers are compiled strictly from retrieved passages. If a strategy is not documented within the book, the Oracle will decline to hypothesize.
            </p>
          </div>

          <div className="glass-panel pillar-card">
            <div className="pillar-num">III</div>
            <h3>Query Optimization</h3>
            <p>
              Conversational venting is transformed. The query rewriter translates colloquial complaints into formal concepts, aligning your dilemma with historical strategies.
            </p>
          </div>

          <div className="glass-panel pillar-card">
            <div className="pillar-num">IV</div>
            <h3>Safety Guardrails</h3>
            <p>
              A lightweight, latency-free safety sentinel. Safeguards against direct malicious, physical, or illegal advice while preserving total psychological and political acuity.
            </p>
          </div>
        </div>
      </section>

      {/* Architecture Timeline */}
      <section id="architecture" className="section-container">
        <div className="section-header">
          <span className="section-pre">TECHNICAL PIPELINE</span>
          <h2 className="section-title">THE RAG ARCHITECTURE</h2>
          <div className="section-line"></div>
        </div>

        <div className="timeline-container">
          <div className="timeline-item">
            <div className="timeline-dot">1</div>
            <div className="glass-panel timeline-content">
              <h4>PDF Extraction</h4>
              <p>PyMuPDF processes the original text page-by-page, removing blanks and index noise into a clean document model.</p>
            </div>
          </div>

          <div className="timeline-item">
            <div className="timeline-dot">2</div>
            <div className="glass-panel timeline-content">
              <h4>Semantic Chunking</h4>
              <p>Instead of split lines, local LLMs evaluate the text to isolate complete conceptual structures, laws, and anecdotes.</p>
            </div>
          </div>

          <div className="timeline-item">
            <div className="timeline-dot">3</div>
            <div className="glass-panel timeline-content">
              <h4>Qdrant Vector Mapping</h4>
              <p>Text is embedded via <code>nomic-embed-text</code> and stored into a Qdrant index. Filters enable cosine-similarity search.</p>
            </div>
          </div>

          <div className="timeline-item">
            <div className="timeline-dot">4</div>
            <div className="glass-panel timeline-content">
              <h4>Synthesis Chamber</h4>
              <p>Relevant laws are injected as prompt context, forcing the model to cite specific pages and outline tactical action items.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Codex Showroom */}
      <section id="codex" className="section-container">
        <div className="section-header">
          <span className="section-pre">DATA SET</span>
          <h2 className="section-title">THE LAWS CODEX</h2>
          <div className="section-line"></div>
        </div>

        <div className="codex-layout">
          <div className="codex-sidebar">
            {sampleLaws.map((law) => (
              <button
                key={law.id}
                onClick={() => setActiveLaw(law.id)}
                className={`codex-tab ${activeLaw === law.id ? "active" : ""}`}
              >
                <span>Law {law.id}</span>
                <span className="tab-title">{law.title}</span>
              </button>
            ))}
          </div>

          <div className="glass-panel codex-display pulse-border">
            {sampleLaws.map((law) => (
              law.id === activeLaw && (
                <div key={law.id} className="codex-content">
                  <h3 className="gold-text-gradient">LAW {law.id}: {law.title}</h3>
                  <div className="codex-divider"></div>
                  <div className="codex-block">
                    <span className="codex-label">THE LAW</span>
                    <p>{law.text}</p>
                  </div>
                  <div className="codex-block">
                    <span className="codex-label">KEYS TO POWER</span>
                    <p>{law.keys}</p>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="footer-cta">
        <div className="footer-line"></div>
        <h2 className="gold-text-gradient">Ready to Consult the Oracle?</h2>
        <p>Step inside the chamber and submit your tactical scenario to the laws.</p>
        <Link href="/try" className="btn-futuristic glow-box" style={{ marginTop: "1.5rem" }}>
          OPEN STRATEGIC CHAMBER
        </Link>
        <div className="footer-meta">
          <p>© 2026 STRATEGOS AI — Built for Executive Counsel</p>
        </div>
      </footer>
    </main>
  );
}
