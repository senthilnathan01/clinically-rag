import type { RetrievalCandidate } from "@/lib/types/agent";

import { getArticleByNumber, getCorpusDataset } from "@/lib/data/load-data";
import { getServerEnv } from "@/lib/config/env";
import { embedTexts } from "@/lib/vertex/client";
import { scoreSparseQuery } from "@/lib/retrieval/bm25";
import { getPineconeIndex } from "@/lib/retrieval/providers/pinecone";
import { loadChunkStore } from "@/lib/retrieval/store";
import {
  detectArticleHints,
  normalizeScoreMap,
  scoreTokenOverlap,
  tokenize,
  uniqueTokens
} from "@/lib/utils/text";

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

function inferMetadataHintArticles(query: string) {
  const normalized = query.toLowerCase();
  const hinted = new Set(detectArticleHints(query));

  for (const article of getCorpusDataset().articles) {
    const titleTokens = uniqueTokens(article.title).filter((token) => token.length >= 4);
    const publicationTokens = uniqueTokens(article.publication).filter((token) => token.length >= 4);
    const titleMatches = titleTokens.filter((token) => normalized.includes(token)).length;
    const publicationMatches = publicationTokens.filter((token) => normalized.includes(token)).length;

    if (titleMatches >= 2 || publicationMatches >= 2 || (titleMatches >= 1 && publicationMatches >= 1)) {
      hinted.add(article.articleNumber);
    }
  }

  return hinted;
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
  const hintedArticles = inferMetadataHintArticles(query);

  for (const articleNumber of focusArticleNumbers) {
    hintedArticles.add(articleNumber);
  }

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
    const contentOverlap = scoreTokenOverlap(query, `${chunk.summary} ${chunk.text.slice(0, 420)}`);
    const focusBoost = hintedArticles.has(chunk.articleNumber) ? 0.2 : 0;
    const summaryBoost = scoreTokenOverlap(query, chunk.summary) >= 0.18 ? 0.08 : 0;
    const combinedScore =
      denseScore * 0.42 +
      sparseScore * 0.4 +
      contentOverlap * 0.12 +
      titleOverlap * 0.015 +
      focusBoost +
      summaryBoost;

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
      titleOverlap,
      matchedQueries: []
    });
  }

  return candidates.sort((left, right) => right.combinedScore - left.combinedScore).slice(0, limit);
}
