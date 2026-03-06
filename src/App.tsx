import { useEffect, useMemo, useState } from "react";
import docs from "./content/docs.json";
import SidebarDocs from "./components/SidebarDocs";
import ChatWindow, { type ChatMode, type ThinkingPayload } from "./components/ChatWindow";
import ThinkingPanel from "./components/ThinkingPanel";
import GitFlowChart from "./components/GitFlowChart";
import type { DocEntry } from "./types/docs";
import "./App.css";

export default function App() {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [thinking, setThinking] = useState<ThinkingPayload | null>(null);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>("structured");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const typedDocs = docs as DocEntry[];

  const selectedDoc = useMemo(
    () => typedDocs.find((doc) => doc.id === selectedDocId) ?? null,
    [selectedDocId, typedDocs]
  );

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("ai-doc-demo-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
      return;
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    window.localStorage.setItem("ai-doc-demo-theme", theme);
  }, [theme]);

  return (
    <main className={`app-shell docs-theme ${theme === "dark" ? "dark" : ""}`}>
      <header className="docs-header panel">
        <div className="docs-top-row">
          <p className="brand-mark">Katie's AI Docs Lab</p>
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
          </button>
        </div>

        <div className="hero-copy">
          <h1>Why AI Documentation Assistants Fail: A Git Mini Doc Site Example</h1>
          <p className="page-subtitle">
            A small experiment showing how AI answers documentation questions. Ask something you can verify in the
            current docs, then toggle Structured Knowledge ON/OFF to see how retrieval quality changes the response.
          </p>
        </div>
      </header>

      <div className={`layout-grid docs-layout map-layout ${isNavCollapsed ? "nav-collapsed" : ""}`}>
        <SidebarDocs
          docs={typedDocs}
          selectedDocId={selectedDocId}
          onSelectDoc={(doc) => setSelectedDocId(doc.id)}
          collapsed={isNavCollapsed}
          onToggleCollapse={() => setIsNavCollapsed((prev) => !prev)}
          onGoHome={() => setSelectedDocId(null)}
        />

        <section className="panel content-panel home-content">
          {!selectedDoc ? (
            <>
              <section className="home-copy">
                <h2>Most teams think if documentation is clear enough, AI will understand it.</h2>
                <p>This demo shows something different.</p>
                <p>AI systems do not read entire documentation sites.</p>
                <p>They only see a few small fragments selected by a search system.</p>
                <p>If the system finds the right information, the answer is good.</p>
                <p>
                  If it finds the wrong information, the answer is bad, even if the documentation itself is excellent.
                </p>

                <details className="tldr-section">
                  <summary>TLDR</summary>
                  <p>This project tests one simple idea:</p>
                  <p>
                    AI answers depend less on how documentation is written and more on how information is retrieved.
                  </p>
                  <ul>
                    <li>The documentation stays the same</li>
                    <li>The AI model stays the same</li>
                    <li>Only the retrieval system changes</li>
                  </ul>
                  <p>Toggle between Structured Knowledge ON and OFF to see how answer quality changes.</p>
                </details>
              </section>

              <GitFlowChart />

              <p className="chart-caption">
                Good retrieval - relevant documentation - better answers | Weak retrieval - irrelevant documentation -
                confused answers. Same AI. Same documentation. Different results.
              </p>

              <aside className="ai-read-box" aria-live="polite">
                <h4>AI Read Packet (Overview)</h4>
                <p>
                  When you ask a question, the assistant only gets retrieved chunks and ranking signals, not the full
                  site.
                </p>
                <ul>
                  <li>
                    mode: <code>{chatMode === "structured" ? "structured" : "unstructured"}</code>
                  </li>
                  <li>
                    scope: <code>top-ranked documentation chunks only</code>
                  </li>
                  <li>
                    goal: <code>show how retrieval quality changes answers</code>
                  </li>
                </ul>
              </aside>

              <section className="body-copy">
                <h3>The Problem</h3>
                <p>
                  As AI assistants become part of developer tools and products, many teams assume that improving
                  documentation will automatically improve AI answers.
                </p>
                <p>This leads to a lot of effort spent on:</p>
                <ul>
                  <li>formatting documentation for AI</li>
                  <li>prompt engineering</li>
                  <li>rewriting content</li>
                </ul>
                <p>But AI systems do not read documentation the way humans do.</p>
                <p>They first run a search step that selects a few small pieces of content.</p>
                <p>The AI only sees those pieces when generating an answer.</p>
                <p>
                  If the wrong pieces are selected, the AI will produce the wrong answer, even if the correct
                  information exists elsewhere in the documentation.
                </p>

                <h3>The Experiment</h3>
                <p>This demo recreates that process.</p>
                <p>When you ask a question:</p>
                <ul>
                  <li>The system searches the documentation.</li>
                  <li>It selects a few matching sections.</li>
                  <li>The AI generates an answer based only on those sections.</li>
                </ul>
                <p>The panel on the right shows what the system retrieved and why.</p>

                <h3>What the Toggle Shows</h3>
                <h4>Structured Knowledge ON</h4>
                <p>The retrieval system prioritizes the most relevant sections.</p>
                <p>Result: clearer and more accurate answers.</p>

                <h4>Structured Knowledge OFF</h4>
                <p>The retrieval system behaves poorly and selects less relevant sections.</p>
                <p>Result: confusing or incomplete answers.</p>

                <p>The AI model has not changed.</p>
                <p>The documentation has not changed.</p>
                <p>Only the information retrieval step changed.</p>

                <h3>What This Means</h3>
                <p>AI assistants are not just documentation features.</p>
                <p>They are knowledge systems made of three parts:</p>
                <ul>
                  <li>documentation (the information)</li>
                  <li>retrieval (how information is selected)</li>
                  <li>AI models (how answers are generated)</li>
                </ul>
                <p>Most failures happen in the retrieval step, not the documentation itself.</p>
              </section>
            </>
          ) : (
            <>
              <article className="selected-doc-main">
                <h3>{selectedDoc.title}</h3>
                <p>{selectedDoc.body}</p>
                <p className="chip-row">{selectedDoc.tags.join(" ")}</p>
              </article>

              <aside className="ai-read-box" aria-live="polite">
                <h4>AI Read Packet ({chatMode === "structured" ? "Structured" : "Unstructured"})</h4>
                <p>This is the exact context and metadata used before the answer is generated.</p>
                <ul>
                  <li>
                    docId: <code>{selectedDoc.id}</code>
                  </li>
                  <li>
                    section: <code>{selectedDoc.section}</code>
                  </li>
                  <li>
                    tags: <code>{selectedDoc.tags.join(", ")}</code>
                  </li>
                  <li>
                    sectionBoost: <code>{chatMode === "structured" ? "enabled" : "disabled"}</code>
                  </li>
                  <li>
                    candidateOrder: <code>{chatMode === "structured" ? "score sorted" : "top-10 shuffled"}</code>
                  </li>
                </ul>
              </aside>
            </>
          )}
        </section>

        <ChatWindow onThinkingUpdate={setThinking} mode={chatMode} onModeChange={setChatMode} />
        <ThinkingPanel thinking={thinking} />
      </div>
    </main>
  );
}
