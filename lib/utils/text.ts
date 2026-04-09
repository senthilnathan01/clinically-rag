const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "with"
]);

export function normalizeText(text: string) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token && !STOPWORDS.has(token));
}

export function countTerms(tokens: string[]) {
  return tokens.reduce<Record<string, number>>((accumulator, token) => {
    accumulator[token] = (accumulator[token] ?? 0) + 1;
    return accumulator;
  }, {});
}

export function dedupeParagraphs(text: string) {
  const seen = new Set<string>();
  const paragraphs = normalizeText(text)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 40);

  return paragraphs
    .filter((paragraph) => {
      const normalized = paragraph.toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .join("\n\n");
}

export function summarizeExtractively(text: string, sentenceCount = 3) {
  const sentences = normalizeText(text)
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.length > 40);

  return sentences.slice(0, sentenceCount).join(" ").trim();
}

export function splitIntoChunks(text: string, targetWords = 220, overlapWords = 40) {
  const words = normalizeText(text).split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(words.length, start + targetWords);
    chunks.push(words.slice(start, end).join(" "));
    if (end === words.length) break;
    start = Math.max(0, end - overlapWords);
  }

  return chunks;
}

export function cosineSimilarity(left: number[], right: number[]) {
  if (!left.length || left.length !== right.length) return 0;

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }

  if (!leftNorm || !rightNorm) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export function normalizeScoreMap(scores: Map<string, number>) {
  const values = [...scores.values()];
  const max = Math.max(...values, 1);

  return new Map([...scores.entries()].map(([key, value]) => [key, value / max]));
}

export function detectArticleHints(text: string) {
  return [...text.matchAll(/(?:art(?:icle)?\.?\s*)(\d{1,2})/gi)].map((match) =>
    Number(match[1])
  );
}
