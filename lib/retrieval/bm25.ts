import type { ArticleChunkRecord } from "@/lib/types/agent";

import { tokenize } from "@/lib/utils/text";

export function scoreSparseQuery(query: string, chunks: ArticleChunkRecord[]) {
  const tokens = tokenize(query);
  const averageDocumentLength =
    chunks.reduce((sum, chunk) => sum + chunk.wordCount, 0) / Math.max(chunks.length, 1);
  const documentFrequency = new Map<string, number>();

  for (const chunk of chunks) {
    for (const term of Object.keys(chunk.sparseTerms)) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }

  const k1 = 1.2;
  const b = 0.75;
  const scores = new Map<string, number>();

  for (const chunk of chunks) {
    let score = 0;

    for (const token of tokens) {
      const termFrequency = chunk.sparseTerms[token] ?? 0;
      if (!termFrequency) continue;

      const docFreq = documentFrequency.get(token) ?? 0;
      const idf = Math.log(1 + (chunks.length - docFreq + 0.5) / (docFreq + 0.5));
      const numerator = termFrequency * (k1 + 1);
      const denominator =
        termFrequency + k1 * (1 - b + b * (chunk.wordCount / Math.max(averageDocumentLength, 1)));

      score += idf * (numerator / denominator);
    }

    if (score > 0) scores.set(chunk.id, score);
  }

  return scores;
}
