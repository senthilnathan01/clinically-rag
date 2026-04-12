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

export function uniqueTokens(text: string) {
  return [...new Set(tokenize(text))];
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

const FACT_CUE_PATTERN =
  /\b(?:fda|device|devices|approval|approvals|radiology|imaging|deploy|deployment|success|demographic|bias|worker|workers|strike|limbic|phase|trial|merger|agentic|chatrwd)\b/i;

export function extractKeyFactHighlights(text: string, maxHighlights = 3) {
  return splitSentences(text)
    .map((sentence) => {
      const compact = sentence.replace(/\s+/g, " ").trim();
      const score =
        Number(/\d/.test(compact)) * 3 +
        Number(/%|percent|ratio|vs\.?/i.test(compact)) * 2 +
        Number(FACT_CUE_PATTERN.test(compact));

      return {
        sentence: compact,
        score
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.sentence.length - right.sentence.length)
    .slice(0, maxHighlights)
    .map((entry) => entry.sentence);
}

export function summarizeForRetrieval(text: string, sentenceCount = 2) {
  const highlights = extractKeyFactHighlights(text, sentenceCount);

  if (highlights.length) {
    return highlights.join(" ");
  }

  return summarizeExtractively(text, sentenceCount);
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

export function scoreTokenOverlap(left: string, right: string) {
  const leftTokens = uniqueTokens(left);
  const rightTokenSet = new Set(uniqueTokens(right));

  if (!leftTokens.length || !rightTokenSet.size) {
    return 0;
  }

  const shared = leftTokens.reduce((count, token) => count + Number(rightTokenSet.has(token)), 0);

  return shared / leftTokens.length;
}

export function splitSentences(text: string) {
  return normalizeText(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}
