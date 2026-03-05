import type { DocEntry, DocSection } from "../types/docs";

const SECTION_ORDER: { key: DocSection; label: string }[] = [
  { key: "concepts", label: "Concepts" },
  { key: "tutorials", label: "Tutorials" },
  { key: "reference", label: "Reference" },
  { key: "troubleshooting", label: "Troubleshooting" },
];

interface SidebarDocsProps {
  docs: DocEntry[];
  selectedSection: DocSection;
  selectedDocId: string | null;
  onSelectSection: (section: DocSection) => void;
  onSelectDoc: (doc: DocEntry) => void;
}

export default function SidebarDocs({
  docs,
  selectedSection,
  selectedDocId,
  onSelectSection,
  onSelectDoc,
}: SidebarDocsProps) {
  const sectionDocs = docs.filter((doc) => doc.section === selectedSection);

  return (
    <aside className="panel sidebar-panel">
      <div className="panel-header">
        <h2>Docs</h2>
      </div>

      <div className="tabs" role="tablist" aria-label="Doc Sections">
        {SECTION_ORDER.map((section) => (
          <button
            key={section.key}
            type="button"
            role="tab"
            aria-selected={selectedSection === section.key}
            className={`tab-btn ${selectedSection === section.key ? "active" : ""}`}
            onClick={() => onSelectSection(section.key)}
          >
            {section.label}
          </button>
        ))}
      </div>

      <ul className="doc-list" aria-label={`${selectedSection} docs`}>
        {sectionDocs.map((doc) => (
          <li key={doc.id}>
            <button
              type="button"
              className={`doc-list-item ${selectedDocId === doc.id ? "active" : ""}`}
              onClick={() => onSelectDoc(doc)}
            >
              <span className="doc-title">{doc.title}</span>
              <span className="doc-tags">{doc.tags.slice(0, 3).join(" • ")}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
