import docsData from "../_data/docs.json";

type DocSection = "concepts" | "tutorials" | "reference" | "troubleshooting";
type ChatMode = "structured" | "unstructured";

interface Env {
  OPENAI_API_KEY?: string;
}

interface DocEntry {
  id: string;
  section: DocSection;
  title: string;
  body: string;
  tags: string[];
}

interface DocChunk {
  chunkId: string;
  docId: string;
  title: string;
  section: DocSection;
  text: string;
  tags: string[];
  tokenSet: Set<string>;
}

interface RetrievalResult {
  rank: number;
  score: number;
  title: string;
  section: DocSection;
  matchedTerms: string[];
}

interface ChatRequest {
  question?: string;
  mode?: ChatMode;
}

const OPENAI_SYSTEM_INSTRUCTION =
  "Answer using ONLY the provided documentation chunks. If the answer is not contained, say 'Not documented in this demo.' Keep it short and practical.";

const docs = docsData as DocEntry[];

function normalizeText(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");
}

function tokenize(input: string): string[] {
  return normalizeText(input)
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
}

function splitIntoSentences(input: string): string[] {
  return input
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function chunkDoc(doc: DocEntry): DocChunk[] {
  const sentences = splitIntoSentences(doc.body);
  const chunks: DocChunk[] = [];

  const maxWords = 44;
  let chunkIndex = 0;
  let cursor = 0;

  while (cursor < sentences.length) {
    const words: string[] = [];
    let end = cursor;

    while (end < sentences.length) {
      const sentenceWords = sentences[end].split(/\s+/).filter(Boolean);
      if (words.length > 0 && words.length + sentenceWords.length > maxWords) {
        break;
      }

      words.push(...sentenceWords);
      end += 1;

      if (words.length >= maxWords) {
        break;
      }
    }

    const text = words.join(" ").trim();
    if (text) {
      const tokenSet = new Set(tokenize(`${doc.title} ${text} ${doc.tags.join(" ")}`));
      chunkIndex += 1;
      chunks.push({
        chunkId: `${doc.id}-chunk-${chunkIndex}`,
        docId: doc.id,
        title: doc.title,
        section: doc.section,
        text,
        tags: doc.tags,
        tokenSet,
      });
    }

    cursor = end > cursor ? end : cursor + 1;
  }

  return chunks;
}

const allChunks: DocChunk[] = docs.flatMap((doc) => chunkDoc(doc));

function scoreChunk(chunk: DocChunk, questionTerms: string[]): { score: number; matchedTerms: string[] } {
  const matchedTerms = questionTerms.filter((term) => chunk.tokenSet.has(term));
  const coverage = questionTerms.length === 0 ? 0 : matchedTerms.length / questionTerms.length;

  const titleTokens = tokenize(chunk.title);
  const titleHits = matchedTerms.filter((term) => titleTokens.includes(term)).length;
  const titleBoost = titleHits * 0.05;

  const score = coverage + titleBoost;
  return { score, matchedTerms };
}

function parseMode(value: unknown): ChatMode {
  return value === "unstructured" ? "unstructured" : "structured";
}

function inferSectionIntent(questionTerms: string[]): DocSection | null {
  if (questionTerms.some((term) => ["tutorial", "tutorials", "step", "steps", "how"].includes(term))) {
    return "tutorials";
  }
  if (
    questionTerms.some((term) =>
      ["error", "conflict", "detached", "rejected", "troubleshoot", "issue"].includes(term)
    )
  ) {
    return "troubleshooting";
  }
  if (questionTerms.some((term) => ["what", "why", "concept", "concepts", "branch", "history"].includes(term))) {
    return "concepts";
  }
  if (
    questionTerms.some((term) =>
      ["command", "syntax", "reset", "revert", "reflog", "reference", "staged", "unstage"].includes(term)
    )
  ) {
    return "reference";
  }
  return null;
}

function scoreChunkByMode(
  chunk: DocChunk,
  questionTerms: string[],
  mode: ChatMode,
  sectionIntent: DocSection | null
): { score: number; matchedTerms: string[] } {
  const base = scoreChunk(chunk, questionTerms);
  const sectionBonus = mode === "structured" && sectionIntent && chunk.section === sectionIntent ? 0.08 : 0;
  return {
    score: base.score + sectionBonus,
    matchedTerms: base.matchedTerms,
  };
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

function extractResponseText(data: unknown): string {
  if (!data || typeof data !== "object") {
    return "";
  }

  const response = data as Record<string, unknown>;
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const outputs = response.output;
  if (!Array.isArray(outputs)) {
    return "";
  }

  const texts: string[] = [];

  for (const item of outputs) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const itemRecord = item as Record<string, unknown>;
    const content = itemRecord.content;
    if (!Array.isArray(content)) {
      continue;
    }

    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== "object") {
        continue;
      }

      const contentRecord = contentItem as Record<string, unknown>;
      if (
        (contentRecord.type === "output_text" || contentRecord.type === "text") &&
        typeof contentRecord.text === "string" &&
        contentRecord.text.trim()
      ) {
        texts.push(contentRecord.text.trim());
      }
    }
  }

  return texts.join("\n").trim();
}

function buildContextChunks(chunks: DocChunk[]): string {
  return chunks
    .map(
      (chunk, index) =>
        `Chunk ${index + 1}\n` +
        `id: ${chunk.chunkId}\n` +
        `title: ${chunk.title}\n` +
        `section: ${chunk.section}\n` +
        `tags: ${chunk.tags.join(", ")}\n` +
        `text: ${chunk.text}`
    )
    .join("\n\n");
}

async function generateAnswerWithOpenAI(
  question: string,
  selectedChunks: DocChunk[],
  apiKey: string
): Promise<{ answer: string; notes: string[] }> {
  const notes: string[] = [
    "Deterministic local retrieval path used.",
    "Answer generated with OpenAI Responses API.",
  ];

  const context = buildContextChunks(selectedChunks);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      instructions: OPENAI_SYSTEM_INSTRUCTION,
      temperature: 0,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Question:\n${question}\n\nDocumentation chunks:\n${context}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI HTTP ${response.status}`);
  }

  const data = (await response.json()) as unknown;
  const answer = extractResponseText(data);

  if (!answer) {
    notes.push("OpenAI returned no text output.");
    return {
      answer: "Not documented in this demo.",
      notes,
    };
  }

  return { answer, notes };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let payload: ChatRequest;

  try {
    payload = (await context.request.json()) as ChatRequest;
  } catch {
    return Response.json(
      {
        answer: "Not documented in this demo.",
        thinking: {
          question: "",
          mode: "structured",
          retrievalResults: [],
          selectedChunks: [],
          notes: ["Invalid JSON payload."],
        },
      },
      { status: 400 }
    );
  }

  const question = typeof payload.question === "string" ? payload.question.trim() : "";
  const mode = parseMode(payload.mode);

  if (!question) {
    return Response.json(
      {
        answer: "Not documented in this demo.",
        thinking: {
          question,
          mode,
          retrievalResults: [],
          selectedChunks: [],
          notes: ["Question is required."],
        },
      },
      { status: 400 }
    );
  }

  const questionTerms = Array.from(new Set(tokenize(question)));
  const sectionIntent = inferSectionIntent(questionTerms);

  const rankedByScore = allChunks
    .map((chunk) => {
      const { score, matchedTerms } = scoreChunkByMode(chunk, questionTerms, mode, sectionIntent);
      return { chunk, score, matchedTerms };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (a.chunk.docId !== b.chunk.docId) {
        return a.chunk.docId.localeCompare(b.chunk.docId);
      }
      return a.chunk.chunkId.localeCompare(b.chunk.chunkId);
    });

  let rankedForSelection = rankedByScore;
  const modeNotes: string[] = [];

  if (mode === "unstructured") {
    const shuffledTopTen = shuffleArray(rankedByScore.slice(0, 10));
    rankedForSelection = [...shuffledTopTen, ...rankedByScore.slice(10)];
    modeNotes.push("Unstructured mode: shuffled top 10 retrieval candidates before top-5 selection.");
    modeNotes.push("Unstructured mode: section bonus removed from scoring.");
  } else {
    modeNotes.push("Structured mode: section intent bonus applied when relevant.");
  }

  const topFive = rankedForSelection.slice(0, 5);
  const topScore = topFive[0]?.score ?? 0;

  if (topScore < 0.2) {
    return Response.json({
      answer: "Not documented in this demo.",
      thinking: {
        question,
        mode,
        retrievalResults: topFive.map((item, index): RetrievalResult => ({
          rank: index + 1,
          score: Number(item.score.toFixed(4)),
          title: item.chunk.title,
          section: item.chunk.section,
          matchedTerms: item.matchedTerms,
        })),
        selectedChunks: [],
        notes: [...modeNotes, "Top score below confidence threshold (0.20)."],
      },
    });
  }

  const selected = topFive.slice(0, 2).map((item) => item.chunk);
  const selectedChunks = selected.map(
    (chunk) => `${chunk.chunkId} | ${chunk.title} | ${chunk.section} | ${chunk.text}`
  );

  if (!context.env.OPENAI_API_KEY) {
    return Response.json({
      answer: "I cannot answer right now because OPENAI_API_KEY is not configured.",
      thinking: {
        question,
        mode,
        retrievalResults: topFive.map((item, index): RetrievalResult => ({
          rank: index + 1,
          score: Number(item.score.toFixed(4)),
          title: item.chunk.title,
          section: item.chunk.section,
          matchedTerms: item.matchedTerms,
        })),
        selectedChunks,
        notes: [...modeNotes, "OPENAI_API_KEY is missing in the environment."],
      },
    });
  }

  try {
    const { answer, notes } = await generateAnswerWithOpenAI(
      question,
      selected,
      context.env.OPENAI_API_KEY
    );

    return Response.json({
      answer,
      thinking: {
        question,
        mode,
        retrievalResults: topFive.map((item, index): RetrievalResult => ({
          rank: index + 1,
          score: Number(item.score.toFixed(4)),
          title: item.chunk.title,
          section: item.chunk.section,
          matchedTerms: item.matchedTerms,
        })),
        selectedChunks,
        notes: [...modeNotes, ...notes],
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown OpenAI error";

    return Response.json({
      answer: "I hit a temporary error while generating an answer. Please try again.",
      thinking: {
        question,
        mode,
        retrievalResults: topFive.map((item, index): RetrievalResult => ({
          rank: index + 1,
          score: Number(item.score.toFixed(4)),
          title: item.chunk.title,
          section: item.chunk.section,
          matchedTerms: item.matchedTerms,
        })),
        selectedChunks,
        notes: [
          ...modeNotes,
          "Deterministic local retrieval path used.",
          "OpenAI call failed; fallback error answer returned.",
          message,
        ],
      },
    });
  }
};
