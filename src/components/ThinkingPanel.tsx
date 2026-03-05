import { useState } from "react";
import type { ThinkingPayload } from "./ChatWindow";

interface ThinkingPanelProps {
  thinking: ThinkingPayload | null;
}

export default function ThinkingPanel({ thinking }: ThinkingPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside className="panel thinking-panel">
      <div className="panel-header thinking-header">
        <h2>Reasoning Trace</h2>
        <button type="button" className="toggle-btn" onClick={() => setIsOpen((prev) => !prev)}>
          {isOpen ? "Hide AI thinking" : "Show AI thinking"}
        </button>
      </div>

      {!isOpen ? <p className="empty-state">Enable to inspect retrieval and chunk selection details.</p> : null}

      {isOpen && !thinking ? (
        <p className="empty-state">No thinking payload yet. Send a chat message to populate this panel.</p>
      ) : null}

      {isOpen && thinking ? (
        <div className="thinking-content">
          <section>
            <h3>mode</h3>
            <p className="mode-line">
              {thinking.mode === "structured" ? "structured" : "unstructured"}:{" "}
              {thinking.mode === "structured"
                ? "Good retrieval -> higher answer quality"
                : "Model is strong, but retrieval was weak -> answer degraded"}
            </p>
          </section>

          <section>
            <h3>retrievalResults</h3>
            {thinking.retrievalResults.length === 0 ? (
              <p className="empty-state">No retrieval results returned.</p>
            ) : (
              <ul className="thinking-list">
                {thinking.retrievalResults.map((result) => (
                  <li key={`${result.rank}-${result.title}`}>
                    <p>
                      <strong>#{result.rank}</strong> {result.title}
                    </p>
                    <p>
                      score: {result.score.toFixed(3)} | section: {result.section}
                    </p>
                    <p>matchedTerms: {result.matchedTerms.join(", ") || "none"}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3>selectedChunks</h3>
            {thinking.selectedChunks.length === 0 ? (
              <p className="empty-state">No chunks selected.</p>
            ) : (
              <div className="chunk-accordion">
                {thinking.selectedChunks.map((chunk) => (
                  <details key={chunk.chunkId}>
                    <summary>
                      {chunk.title} ({chunk.section})
                    </summary>
                    <p>{chunk.text || "No chunk text provided."}</p>
                  </details>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3>notes</h3>
            {thinking.notes.length === 0 ? (
              <p className="empty-state">No notes returned.</p>
            ) : (
              <ul className="thinking-list">
                {thinking.notes.map((note, idx) => (
                  <li key={`${note}-${idx}`}>{note}</li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </aside>
  );
}
