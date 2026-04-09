import type { RetrievalCandidate } from "@/lib/types/agent";

import { getArticleByNumber } from "@/lib/data/load-data";
import { getServerEnv } from "@/lib/config/env";
import { embedTexts } from "@/lib/gemini/client";
import { scoreSparseQuery } from "@/lib/retrieval/bm25";
import { getPineconeIndex } from "@/lib/retrieval/providers/pinecone";
import { loadChunkStore } from "@/lib/retrieval/store";
import { detectArticleHints, normalizeScoreMap, tokenize } from "@/lib/utils/text";

async function scoreDenseQuery(query: string) {
  const env = getServerEnv();
  if (!env.PINECONE_API_KEY || !env.PINECONE_INDEX_NAME) return new Map<string, number>();

  const [vector] = await embedTexts([query]);
  const index = getPineconeIndex();
  const response = await index.query({
    vector,
    topK: 12,
    includeMetadata: true
  });

  const scores = new Map<string, number>();

  for (const match of response.matches ?? []) {
    if (match.id && typeof match.score === "number") {
      scores.set(match.id, match.score);
    }
  }

  return scores;
}

function computeTitleOverlap(query: string, title: string) {
  const queryTokens = new Set(tokenize(query));
  const titleTokens = tokenize(title);

  return titleTokens.reduce((score, token) => score + (queryTokens.has(token) ? 1 : 0), 0);
}

export async function hybridRetrieve({
  query,
  focusArticleNumbers = [],
  limit = 8
}: {
  query: string;
  focusArticleNumbers?: number[];
  limit?: number;
}) {
  const chunks = await loadChunkStore();
  const hintedArticles = new Set([...focusArticleNumbers, ...detectArticleHints(query)]);
  const [denseScores, sparseScores] = await Promise.all([
    scoreDenseQuery(query),
    Promise.resolve(scoreSparseQuery(query, chunks))
  ]);

  const normalizedDense = normalizeScoreMap(denseScores);
  const normalizedSparse = normalizeScoreMap(sparseScores);
  const candidates: RetrievalCandidate[] = [];

  for (const chunk of chunks) {
    const article = getArticleByNumber(chunk.articleNumber);
    if (!article) continue;

    const denseScore = normalizedDense.get(chunk.id) ?? 0;
    const sparseScore = normalizedSparse.get(chunk.id) ?? 0;
    const titleOverlap = computeTitleOverlap(query, chunk.articleTitle);
    const focusBoost = hintedArticles.has(chunk.articleNumber) ? 0.2 : 0;
    const summaryBoost = chunk.summary.toLowerCase().includes(query.toLowerCase()) ? 0.1 : 0;
    const combinedScore =
      denseScore * 0.55 + sparseScore * 0.35 + titleOverlap * 0.04 + focusBoost + summaryBoost;

    if (combinedScore <= 0) continue;

    candidates.push({
      id: chunk.id,
      article,
      articleSummary: chunk.summary,
      chunkText: chunk.text,
      chunkIndex: chunk.chunkIndex,
      denseScore,
      sparseScore,
      combinedScore,
      titleOverlap
    });
  }

  return candidates.sort((left, right) => right.combinedScore - left.combinedScore).slice(0, limit);
}
