import type { DocEntry, DocSection } from "../types/docs";

const SECTION_ORDER: { key: DocSection; label: string; intro: string }[] = [
  { key: "concepts", label: "Concepts", intro: "Core ideas in plain language" },
  { key: "tutorials", label: "Tutorials", intro: "Step-by-step how to guides" },
  { key: "reference", label: "Reference", intro: "Commands and quick lookups" },
  { key: "troubleshooting", label: "Troubleshooting", intro: "Fix common Git problems" },
];

interface SidebarDocsProps {
  docs: DocEntry[];
  selectedDocId: string | null;
  onSelectDoc: (doc: DocEntry) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onGoHome: () => void;
}

export default function SidebarDocs({
  docs,
  selectedDocId,
  onSelectDoc,
  collapsed,
  onToggleCollapse,
  onGoHome,
}: SidebarDocsProps) {
  if (collapsed) {
    return (
      <aside className="panel sidebar-panel docs-menu collapsed">
        <button type="button" className="nav-collapse-btn compact" onClick={onToggleCollapse} aria-label="Expand menu">
          ›
        </button>
      </aside>
    );
  }

  return (
    <aside className="panel sidebar-panel docs-menu">
      <div className="panel-header">
        <h2>Navigation</h2>
        <button type="button" className="nav-collapse-btn" onClick={onToggleCollapse} aria-label="Collapse menu">
          ‹
        </button>
      </div>

      <nav aria-label="Documentation Navigation" className="menu-sections">
        <section className="menu-section">
          <ul>
            <li>
              <button
                type="button"
                className={`menu-link home-overview ${selectedDocId === null ? "active" : ""}`}
                onClick={onGoHome}
              >
                <span aria-hidden="true">⌂</span> Work Project Overview
              </button>
            </li>
          </ul>
        </section>

        {SECTION_ORDER.map((section) => {
          const sectionDocs = docs.filter((doc) => doc.section === section.key);

          return (
            <section key={section.key} className="menu-section">
              <h3>{section.label}</h3>
              <p>{section.intro}</p>
              <ul>
                {sectionDocs.map((doc) => (
                  <li key={doc.id}>
                    <button
                      type="button"
                      className={`menu-link ${selectedDocId === doc.id ? "active" : ""}`}
                      onClick={() => onSelectDoc(doc)}
                    >
                      {doc.title}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </nav>
    </aside>
  );
}
