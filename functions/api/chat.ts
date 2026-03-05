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
  explanation: string;
}

interface ChatRequest {
  question?: string;
  mode?: ChatMode;
}

interface IntentProfile {
  preferredSections: DocSection[];
  reason: string;
}

interface ChunkScore {
  chunk: DocChunk;
  score: number;
  matchedTerms: string[];
  explanation: string;
}

const OPENAI_SYSTEM_INSTRUCTION =
  "Answer using ONLY the provided documentation chunks. If the answer is not contained, say 'Not documented in this demo.' Keep it short and practical.";
const NO_DOC_SENTINEL = "Not documented in this demo.";
const NO_DOC_USER_MESSAGE =
  "The model could not find documentation about this topic.\nThis prevents hallucinations.";
const OPENAI_TEMPORARY_MESSAGE = "AI temporarily unavailable — showing retrieval results only.";

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "do",
  "for",
  "from",
  "how",
  "i",
  "if",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "the",
  "to",
  "was",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
  "you",
  "your",
]);

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

function questionTerms(question: string): string[] {
  return Array.from(new Set(tokenize(question).filter((term) => !STOPWORDS.has(term))));
}

function splitIntoSentences(input: string): string[] {
  return input
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function parseMode(value: unknown): ChatMode {
  return value === "unstructured" ? "unstructured" : "structured";
}

function inferIntentProfile(question: string, terms: string[]): IntentProfile {
  const normalized = normalizeText(question).trim();
  const hasTroubleshootingSignals = terms.some((term) =>
    ["error", "conflict", "detached", "rejected", "broken", "fails", "failing"].includes(term)
  );

  if (/^how\s+(do|can|to)\b/.test(normalized) || normalized.includes("how do i")) {
    return {
      preferredSections: hasTroubleshootingSignals ? ["troubleshooting", "tutorials"] : ["tutorials"],
      reason: "Detected a how-to style question.",
    };
  }

  if (/^what\s+(is|are)\b/.test(normalized) || normalized.startsWith("define ")) {
    return {
      preferredSections: ["concepts", "reference"],
      reason: "Detected a definition/concept style question.",
    };
  }

  if (hasTroubleshootingSignals) {
    return {
      preferredSections: ["troubleshooting", "reference"],
      reason: "Detected troubleshooting signals in the question.",
    };
  }

  return {
    preferredSections: ["reference"],
    reason: "Defaulted to reference-first retrieval.",
  };
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

function scoreChunk(
  chunk: DocChunk,
  terms: string[],
  mode: ChatMode,
  intent: IntentProfile
): { score: number; matchedTerms: string[]; explanation: string } {
  const matchedTerms = terms.filter((term) => chunk.tokenSet.has(term));
  const coverage = terms.length === 0 ? 0 : matchedTerms.length / terms.length;

  const titleTokens = tokenize(chunk.title);
  const titleHits = matchedTerms.filter((term) => titleTokens.includes(term)).length;
  const titleBoost = titleHits * 0.05;

  const tagHits = matchedTerms.filter((term) => chunk.tags.map((tag) => tag.toLowerCase()).includes(term)).length;
  const tagBoost = tagHits * 0.03;

  let sectionBoost = 0;
  let sectionReason = "no section boost";

  if (mode === "structured") {
    const preferredIndex = intent.preferredSections.indexOf(chunk.section);
    if (preferredIndex === 0) {
      sectionBoost = 0.1;
      sectionReason = `section boost for primary section (${chunk.section})`;
    } else if (preferredIndex === 1) {
      sectionBoost = 0.06;
      sectionReason = `section boost for secondary section (${chunk.section})`;
    }
  }

  const score = coverage + titleBoost + tagBoost + sectionBoost;
  const explanation = `coverage=${coverage.toFixed(2)}, titleBoost=${titleBoost.toFixed(2)}, tagBoost=${tagBoost.toFixed(2)}, sectionBoost=${sectionBoost.toFixed(2)} (${sectionReason})`;

  return { score, matchedTerms, explanation };
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

function normalizeNoDocAnswer(answer: string): string {
  return answer.trim() === NO_DOC_SENTINEL ? NO_DOC_USER_MESSAGE : answer;
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

function toRetrievalResults(scored: ChunkScore[]): RetrievalResult[] {
  return scored.map((item, index) => ({
    rank: index + 1,
    score: Number(item.score.toFixed(4)),
    title: item.chunk.title,
    section: item.chunk.section,
    matchedTerms: item.matchedTerms,
    explanation: item.explanation,
  }));
}

function summarizeWhatHappened(mode: ChatMode, intent: IntentProfile, topScore: number): string {
  if (mode === "structured") {
    return `What happened: ${intent.reason} Structured ranking used section-aware boosts, giving higher-confidence chunks (top score ${topScore.toFixed(2)}).`;
  }
  return `What happened: ${intent.reason} Unstructured ranking removed section boosts and shuffled candidates, reducing retrieval reliability (top score ${topScore.toFixed(2)}).`;
}

function extractGitCommand(text: string): string | null {
  const match = text.match(/\bgit\s+[a-z-]+(?:\s+[^.,;\n]*)?/i);
  return match ? match[0].trim() : null;
}

function fallbackAnswerFromChunks(question: string, mode: ChatMode, chunks: DocChunk[]): string {
  if (chunks.length === 0) {
    return NO_DOC_USER_MESSAGE;
  }

  const [primary, secondary] = chunks;
  const firstSentence = splitIntoSentences(primary.text)[0] ?? primary.text;
  const command = extractGitCommand(primary.text) ?? (secondary ? extractGitCommand(secondary.text) : null);
  const modeHint =
    mode === "unstructured"
      ? "Note: unstructured mode may reduce answer precision."
      : "Based on top matched documentation chunks.";

  return `${firstSentence}${command ? ` Try \`${command}\`.` : ""} ${modeHint}`.trim();
}

async function generateAnswerWithOpenAI(
  question: string,
  selectedChunks: DocChunk[],
  apiKey: string
): Promise<{ answer: string; notes: string[] }> {
  const notes: string[] = ["Answer generated with OpenAI Responses API."];
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
    return { answer: NO_DOC_USER_MESSAGE, notes };
  }

  return { answer: normalizeNoDocAnswer(answer), notes };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let payload: ChatRequest;

  try {
    payload = (await context.request.json()) as ChatRequest;
  } catch {
    return Response.json(
      {
        answer: NO_DOC_USER_MESSAGE,
        thinking: {
          question: "",
          mode: "structured",
          retrievalResults: [],
          selectedChunks: [],
          notes: ["What happened: request body was invalid JSON.", "Invalid JSON payload."],
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
        answer: NO_DOC_USER_MESSAGE,
        thinking: {
          question,
          mode,
          retrievalResults: [],
          selectedChunks: [],
          notes: ["What happened: question text was empty.", "Question is required."],
        },
      },
      { status: 400 }
    );
  }

  const terms = questionTerms(question);
  const intent = inferIntentProfile(question, terms);

  const rankedByScore: ChunkScore[] = allChunks
    .map((chunk) => {
      const scored = scoreChunk(chunk, terms, mode, intent);
      return {
        chunk,
        score: scored.score,
        matchedTerms: scored.matchedTerms,
        explanation: scored.explanation,
      };
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
    modeNotes.push("Unstructured mode: section boosts disabled.");
    modeNotes.push("Unstructured mode: shuffled top 10 candidates before selecting top 5.");
  } else {
    modeNotes.push("Structured mode: section-aware boosts enabled.");
  }

  const topFive = rankedForSelection.slice(0, 5);
  const topScore = topFive[0]?.score ?? 0;
  const retrievalResults = toRetrievalResults(topFive);
  const summary = summarizeWhatHappened(mode, intent, topScore);

  if (topScore < 0.2) {
    return Response.json({
      answer: NO_DOC_USER_MESSAGE,
      thinking: {
        question,
        mode,
        retrievalResults,
        selectedChunks: [],
        notes: [summary, ...modeNotes, "Top score below confidence threshold (0.20)."],
      },
    });
  }

  const selected = topFive.slice(0, 2).map((item) => item.chunk);
  const selectedChunks = selected.map(
    (chunk) => `${chunk.chunkId} | ${chunk.title} | ${chunk.section} | ${chunk.text}`
  );

  if (!context.env.OPENAI_API_KEY) {
    return Response.json({
      answer: fallbackAnswerFromChunks(question, mode, selected),
      thinking: {
        question,
        mode,
        retrievalResults,
        selectedChunks,
        notes: [
          summary,
          ...modeNotes,
          "OPENAI_API_KEY is missing in the environment.",
          "Used deterministic local fallback answer from retrieval results.",
        ],
      },
    });
  }

  try {
    const { answer, notes } = await generateAnswerWithOpenAI(question, selected, context.env.OPENAI_API_KEY);

    return Response.json({
      answer,
      thinking: {
        question,
        mode,
        retrievalResults,
        selectedChunks,
        notes: [summary, ...modeNotes, ...notes],
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown OpenAI error";

    return Response.json({
      answer: fallbackAnswerFromChunks(question, mode, selected),
      thinking: {
        question,
        mode,
        retrievalResults,
        selectedChunks,
        notes: [
          summary,
          ...modeNotes,
          "OpenAI call failed; retrieval trace shown.",
          message,
          "Used deterministic local fallback answer from retrieval results.",
        ],
      },
    });
  }
};
