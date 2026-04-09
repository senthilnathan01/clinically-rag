import type { LangGraphRunnableConfig } from "@langchain/langgraph";

import { hybridRetrieve } from "@/lib/retrieval/hybrid";
import { emitStreamEvent, withTiming } from "@/lib/langgraph/helpers";
import type { GraphState } from "@/lib/langgraph/state";

export async function retrieverNode(state: GraphState, config?: LangGraphRunnableConfig) {
  const startedAt = Date.now();
  emitStreamEvent(config, {
    type: "phase",
    phase: "Searching the corpus",
    node: "retriever",
    status: "running",
    detail: "Running dense and sparse retrieval across indexed chunks."
  });

  const searchQueries =
    state.routeTaken === "simple_factual" ? [state.question] : state.searchQueries.length ? state.searchQueries : [state.question];

  const candidateMap = new Map<string, Awaited<ReturnType<typeof hybridRetrieve>>[number]>();

  for (const query of searchQueries) {
    const candidates = await hybridRetrieve({
      query,
      focusArticleNumbers: state.focusArticleNumbers,
      limit: 8
    });

    for (const candidate of candidates) {
      const existing = candidateMap.get(candidate.id);

      if (!existing || candidate.combinedScore > existing.combinedScore) {
        candidateMap.set(candidate.id, candidate);
      }
    }
  }

  const retrievalCandidates = [...candidateMap.values()]
    .sort((left, right) => right.combinedScore - left.combinedScore)
    .slice(0, 10);

  return {
    searchQueries,
    retrievalCandidates,
    reasoningSteps: [
      ...state.reasoningSteps,
      {
        key: "retrieval" as const,
        label: "Retrieval",
        summary: `Selected ${retrievalCandidates.length} candidate chunks using hybrid retrieval.`,
        details: retrievalCandidates.map(
          (candidate) =>
            `Art. ${candidate.article.articleNumber} · ${candidate.article.title} (dense ${candidate.denseScore.toFixed(2)}, sparse ${candidate.sparseScore.toFixed(2)})`
        )
      }
    ],
    ...withTiming(state, "retriever", startedAt)
  };
}
