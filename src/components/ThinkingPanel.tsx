import { useState } from "react";
import type { ThinkingPayload } from "./ChatWindow";

interface ThinkingPanelProps {
  thinking: ThinkingPayload | null;
}

export default function ThinkingPanel({ thinking }: ThinkingPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const summaryNote =
    thinking?.notes.find((note) => note.startsWith("What happened:")) ?? "What happened: send a question to populate retrieval details.";
  const topScore = thinking?.retrievalResults[0]?.score;

  return (
    <aside className="panel thinking-panel">
      <div className="panel-header thinking-header">
        <h2 title="Backend retrieval logs and ranking details for this answer.">AI Thinking</h2>
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
            <h3>What happened?</h3>
            <p className="mode-line">{summaryNote.replace("What happened: ", "")}</p>
            {typeof topScore === "number" ? (
              <p
                className="top-score-help"
                title="Top score is the confidence of the best matched chunk. Higher means the retrieved context is a better fit for the question."
              >
                Top score: <strong>{topScore.toFixed(3)}</strong>
              </p>
            ) : null}
          </section>

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
            <h3>Top retrieval matches</h3>
            {thinking.retrievalResults.length === 0 ? (
              <p className="empty-state">No retrieval results returned.</p>
            ) : (
              <ul className="thinking-list">
                {thinking.retrievalResults.slice(0, 3).map((result) => (
                  <li key={`${result.rank}-${result.title}`}>
                    <p>
                      <strong>#{result.rank}</strong> {result.title}
                    </p>
                    <p>
                      score: {result.score.toFixed(3)} | section: {result.section}
                    </p>
                    <p>matchedTerms: {result.matchedTerms.join(", ") || "none"}</p>
                    <p>why ranked: {result.explanation}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </aside>
  );
}
