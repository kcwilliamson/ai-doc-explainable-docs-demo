import { useState } from "react";

type FlowMode = "structured" | "unstructured";

const MODE_LINES: Record<FlowMode, string[]> = {
  structured: [
    "Good retrieval",
    "-> relevant documentation",
    "-> better answers",
  ],
  unstructured: [
    "Weak retrieval",
    "-> irrelevant documentation",
    "-> confused answers",
  ],
};

const STEP_EXPLANATIONS = [
  { id: "1", label: "Question", text: "User asks a documentation question." },
  { id: "2", label: "Retrieve", text: "System pulls a few doc chunks that look relevant." },
  { id: "3", label: "Rank", text: "Structured mode ranks chunks by stronger relevance signals." },
  { id: "4", label: "Answer", text: "Model answers using only those selected chunks." },
];

export default function GitFlowChart() {
  const [mode, setMode] = useState<FlowMode>("structured");
  const [activeStep, setActiveStep] = useState<string | null>(null);

  return (
    <figure className="git-flow-card" aria-label="High-level AI retrieval flow">
      <figcaption>High-level answer flow</figcaption>

      <button
        type="button"
        className={`flow-mode-switch ${mode === "structured" ? "on" : "off"}`}
        onClick={() => setMode((prev) => (prev === "structured" ? "unstructured" : "structured"))}
        title={
          mode === "structured"
            ? "Structured: retrieval uses section and relevance signals to pick the best chunks, so answers stay focused and accurate."
            : "Unstructured: retrieval weakens ranking and can surface off-topic chunks, so answers become less reliable or incomplete."
        }
        aria-pressed={mode === "structured"}
      >
        <span className="flow-mode-knob" aria-hidden="true" />
        <span>{mode === "structured" ? "Structured ON" : "Structured OFF"}</span>
      </button>

      <div className="flow-diagram-block">
        <div className="flow-column">
          {MODE_LINES[mode].map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="flow-column">
          <p>Same AI</p>
          <p>Same documentation</p>
          <p>Different results</p>
        </div>
      </div>

      <div className="flow-steps">
        {STEP_EXPLANATIONS.map((step) => (
          <button
            key={step.id}
            type="button"
            className={`flow-step ${activeStep === step.id ? "active" : ""}`}
            onClick={() => setActiveStep(step.id)}
          >
            <span>{step.id}</span>
            {step.label}
          </button>
        ))}
      </div>

      {activeStep ? (
        <div className="flow-popup" role="status" aria-live="polite">
          <strong>{STEP_EXPLANATIONS.find((step) => step.id === activeStep)?.label}</strong>
          <p>{STEP_EXPLANATIONS.find((step) => step.id === activeStep)?.text}</p>
        </div>
      ) : null}
    </figure>
  );
}
