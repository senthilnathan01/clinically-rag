import type { LangGraphRunnableConfig } from "@langchain/langgraph";

import { emitStreamEvent, withTiming } from "@/lib/langgraph/helpers";
import type { GraphState } from "@/lib/langgraph/state";
import type { RetrievedSourceSummary, SourceDetail } from "@/lib/types/agent";

function buildRationale(titleOverlap: number, matchedQueries: string[]) {
  if (matchedQueries.length > 1) {
    return "Ranked highly across multiple sub-questions in the current request.";
  }

  return titleOverlap > 0
    ? "Ranked highly because the title and metadata align closely with the request."
    : "Ranked highly from the combined semantic and lexical retrieval score.";
}

export async function evidenceAssemblerNode(state: GraphState, config?: LangGraphRunnableConfig) {
  const startedAt = Date.now();
  emitStreamEvent(config, {
    event: "phase",
    data: { label: "Linking evidence" }
  });

  const retrievedSourceMap = new Map<number, RetrievedSourceSummary>();
  const sourceDetails: SourceDetail[] = [];
  const perArticleDetailCount = new Map<number, number>();

  for (const candidate of state.retrievalCandidates) {
    const rationale = buildRationale(candidate.titleOverlap, candidate.matchedQueries);
    const snippet = candidate.chunkText.slice(0, 320).trim();
    const existingSource = retrievedSourceMap.get(candidate.article.articleNumber);

    if (!existingSource || existingSource.score < candidate.combinedScore) {
      retrievedSourceMap.set(candidate.article.articleNumber, {
        articleNumber: candidate.article.articleNumber,
        title: candidate.article.title,
        publication: candidate.article.publication,
        url: candidate.article.url,
        chunkId: candidate.id,
        chunkIndex: candidate.chunkIndex,
        score: candidate.combinedScore,
        rationale
      });
    }

    const detailCount = perArticleDetailCount.get(candidate.article.articleNumber) ?? 0;
    const maxDetailsPerArticle =
      candidate.matchedQueries.length > 1 || candidate.article.articleNumber === 21 ? 3 : 2;

    if (detailCount < maxDetailsPerArticle) {
      sourceDetails.push({
        citationId: "",
        articleNumber: candidate.article.articleNumber,
        title: candidate.article.title,
        publication: candidate.article.publication,
        url: candidate.article.url,
        rationale,
        snippet,
        chunkId: candidate.id,
        chunkIndex: candidate.chunkIndex
      });
      perArticleDetailCount.set(candidate.article.articleNumber, detailCount + 1);
    }
  }

  const retrievedSources = [...retrievedSourceMap.values()].sort((left, right) => right.score - left.score);
  const evidenceSnippets = sourceDetails.slice(0, 8).map((detail) => ({
    articleNumber: detail.articleNumber,
    title: detail.title,
    snippet: detail.snippet,
    chunkId: detail.chunkId,
    chunkIndex: detail.chunkIndex
  }));

  emitStreamEvent(config, {
    event: "artifact",
    data: {
      routeTaken: state.routeTaken,
      reasoningTrace: {
        routeTaken: state.routeTaken,
        routeRationale: state.routeRationale,
        subQuestions: state.subQuestions,
        retrievedSources,
        evidenceSnippets,
        synthesisSummary: "",
        criticSummary: state.criticSummary
      },
      sourceDetails
    }
  });

  return {
    retrievedSources,
    evidenceSnippets,
    sourceDetails,
    ...withTiming(state, "evidence_assembler", startedAt)
  };
}
