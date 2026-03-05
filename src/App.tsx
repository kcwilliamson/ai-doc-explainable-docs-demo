import { useMemo, useState } from "react";
import docs from "./content/docs.json";
import SidebarDocs from "./components/SidebarDocs";
import ChatWindow, { type ThinkingPayload } from "./components/ChatWindow";
import ThinkingPanel from "./components/ThinkingPanel";
import type { DocEntry, DocSection } from "./types/docs";
import "./App.css";

const DEFAULT_SECTION: DocSection = "concepts";

export default function App() {
  const [selectedSection, setSelectedSection] = useState<DocSection>(DEFAULT_SECTION);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [thinking, setThinking] = useState<ThinkingPayload | null>(null);

  const typedDocs = docs as DocEntry[];

  const selectedDoc = useMemo(
    () => typedDocs.find((doc) => doc.id === selectedDocId) ?? null,
    [selectedDocId, typedDocs]
  );

  function handleSelectDoc(doc: DocEntry) {
    setSelectedDocId(doc.id);
    setSelectedSection(doc.section);
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">AI Doc Explainable Demo</p>
        <h1>Portfolio-style Retrieval + Chat Playground</h1>
      </header>

      <div className="layout-grid">
        <SidebarDocs
          docs={typedDocs}
          selectedSection={selectedSection}
          selectedDocId={selectedDocId}
          onSelectSection={setSelectedSection}
          onSelectDoc={handleSelectDoc}
        />

        <ChatWindow selectedDoc={selectedDoc} onThinkingUpdate={setThinking} />

        <ThinkingPanel thinking={thinking} />
      </div>
    </main>
  );
}
