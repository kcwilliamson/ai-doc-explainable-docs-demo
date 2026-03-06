import { useState } from "react";
import type { DocChunk, DocSection } from "../types/docs";

export type ChatMode = "structured" | "unstructured";

export interface RetrievalResult {
  rank: number;
  score: number;
  title: string;
  section: string;
  matchedTerms: string[];
  explanation: string;
}

export interface ThinkingPayload {
  mode: ChatMode;
  retrievalResults: RetrievalResult[];
  selectedChunks: DocChunk[];
  notes: string[];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatWindowProps {
  onThinkingUpdate: (thinking: ThinkingPayload | null) => void;
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

const SAMPLE_QUESTIONS = [
  "What is the difference between reset and revert?",
  "How do I recover from detached HEAD?",
  "What should I do when my push is rejected?",
];

function parseDocSection(value: unknown): DocSection {
  if (
    value === "concepts" ||
    value === "tutorials" ||
    value === "reference" ||
    value === "troubleshooting"
  ) {
    return value;
  }
  return "reference";
}

function normalizeThinkingPayload(raw: unknown): ThinkingPayload | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as {
    mode?: unknown;
    retrievalResults?: unknown;
    selectedChunks?: unknown;
    notes?: unknown;
  };

  const parsedMode: ChatMode = candidate.mode === "unstructured" ? "unstructured" : "structured";

  const retrievalResults = Array.isArray(candidate.retrievalResults)
    ? candidate.retrievalResults.map((item, idx) => {
        const value = item as Record<string, unknown>;
        return {
          rank: typeof value.rank === "number" ? value.rank : idx + 1,
          score: typeof value.score === "number" ? value.score : 0,
          title: typeof value.title === "string" ? value.title : "Untitled",
          section: typeof value.section === "string" ? value.section : "unknown",
          matchedTerms: Array.isArray(value.matchedTerms)
            ? value.matchedTerms.filter((term): term is string => typeof term === "string")
            : [],
          explanation:
            typeof value.explanation === "string" ? value.explanation : "No explanation provided.",
        };
      })
    : [];

  const selectedChunks = Array.isArray(candidate.selectedChunks)
    ? candidate.selectedChunks.map((item, idx) => {
        if (typeof item === "string") {
          return {
            docId: "unknown-doc",
            chunkId: `chunk-${idx + 1}`,
            section: "reference" as const,
            title: `Selected chunk ${idx + 1}`,
            text: item,
            tags: [],
          };
        }

        const value = item as Record<string, unknown>;
        return {
          docId: typeof value.docId === "string" ? value.docId : "unknown-doc",
          chunkId: typeof value.chunkId === "string" ? value.chunkId : `chunk-${idx + 1}`,
          section: parseDocSection(value.section),
          title: typeof value.title === "string" ? value.title : "Selected chunk",
          text: typeof value.text === "string" ? value.text : "",
          tags: Array.isArray(value.tags)
            ? value.tags.filter((tag): tag is string => typeof tag === "string")
            : [],
        };
      })
    : [];

  const notes = Array.isArray(candidate.notes)
    ? candidate.notes.filter((note): note is string => typeof note === "string")
    : [];

  return {
    mode: parsedMode,
    retrievalResults,
    selectedChunks,
    notes,
  };
}

function parseChatResponse(
  raw: unknown,
  fallbackMode: ChatMode
): { answer: string; thinking: ThinkingPayload | null } {
  if (!raw || typeof raw !== "object") {
    return { answer: "I could not parse the response.", thinking: null };
  }

  const value = raw as Record<string, unknown>;
  const answerCandidates = [value.answer, value.response, value.message, value.text];
  const answer =
    answerCandidates.find((candidate): candidate is string => typeof candidate === "string") ??
    "I got a response, but no answer text was provided.";

  const thinkingSource = value.thinking ?? {
    retrievalResults: value.retrievalResults,
    selectedChunks: value.selectedChunks,
    notes: value.notes,
  };

  return {
    answer,
    thinking: normalizeThinkingPayload(thinkingSource) ?? {
      mode: fallbackMode,
      retrievalResults: [],
      selectedChunks: [],
      notes: [],
    },
  };
}

export default function ChatWindow({ onThinkingUpdate, mode, onModeChange }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function sendQuestion(nextQuestion?: string) {
    const text = (nextQuestion ?? question).trim();
    if (!text || isSending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: text, mode }),
      });

      const data = (await response.json()) as unknown;
      const parsed = parseChatResponse(data, mode);

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: parsed.answer,
        },
      ]);
      onThinkingUpdate(parsed.thinking);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant-error`,
          role: "assistant",
          content: "I could not reach /api/chat. Check if your Pages Function is running.",
        },
      ]);
      onThinkingUpdate(null);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="panel chat-drawer inline" aria-label="Documentation assistant">
      <div className="panel-header">
        <h2>Ask AI a question</h2>
      </div>

      <label
        className="mode-switch mode-under-chat"
        title="Structured ON improves retrieval ranking; OFF weakens retrieval to demonstrate answer quality changes."
      >
        <input
          type="checkbox"
          checked={mode === "structured"}
          onChange={(event) => onModeChange(event.target.checked ? "structured" : "unstructured")}
        />
        <span>Structured Knowledge {mode === "structured" ? "ON" : "OFF"}</span>
      </label>

      <div className="message-history" aria-live="polite">
        <div className="message-stack">
          {messages.length === 0 ? (
            <p className="empty-state">Ask a question to start the conversation.</p>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`message ${message.role}`}>
                <span className="message-role">{message.role === "user" ? "You" : "Assistant"}</span>
                <p>{message.content}</p>
              </div>
            ))
          )}
        </div>
        <div className="message-history-tools">
          <div className="sample-questions">
            <span>Sample questions</span>
            <div className="sample-actions">
              {SAMPLE_QUESTIONS.map((sample) => (
                <button key={sample} type="button" onClick={() => sendQuestion(sample)} disabled={isSending}>
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <form
        className="chat-input-row wide"
        onSubmit={(event) => {
          event.preventDefault();
          void sendQuestion();
        }}
      >
        <input
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask about Git workflows, mistakes, or troubleshooting..."
        />
        <button type="submit" disabled={isSending || question.trim().length === 0}>
          {isSending ? "Sending..." : "Send"}
        </button>
      </form>
    </section>
  );
}
