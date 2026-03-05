export type DocSection =
  | "concepts"
  | "tutorials"
  | "reference"
  | "troubleshooting";

export interface DocEntry {
  id: string;
  section: DocSection;
  title: string;
  body: string;
  tags: string[];
}

export interface DocChunk {
  docId: string;
  chunkId: string;
  section: DocSection;
  title: string;
  text: string;
  tags: string[];
}
