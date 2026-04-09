import type { LangGraphRunnableConfig } from "@langchain/langgraph";

import { emitStreamEvent, withTiming } from "@/lib/langgraph/helpers";
import type { GraphState } from "@/lib/langgraph/state";
import type { CitationChip } from "@/lib/types/agent";

export async function evidenceAssemblerNode(state: GraphState, config?: LangGraphRunnableConfig) {
  const startedAt = Date.now();
  emitStreamEvent(config, {
    type: "phase",
    phase: "Linking evidence",
    node: "evidence_assembler",
    status: "running",
    detail: "Grouping retrieved chunks into article-level evidence bundles."
  });

  const sourceMap = new Map<number, GraphState["retrievedSources"][number]>();
  const citationMap = new Map<string, CitationChip>();

  for (const candidate of state.retrievalCandidates) {
    const key = candidate.article.articleNumber;
    const existing = sourceMap.get(key);
    const snippet = candidate.chunkText.slice(0, 320).trim();

    if (!existing) {
      sourceMap.set(key, {
        articleNumber: candidate.article.articleNumber,
        title: candidate.article.title,
        cluster: candidate.article.cluster,
        publication: candidate.article.publication,
        url: candidate.article.url,
        rationale:
          candidate.titleOverlap > 0
            ? "Title and metadata strongly overlap with the query."
            : "Hybrid retrieval ranked this article highly based on semantic and lexical evidence.",
        score: candidate.combinedScore,
        snippets: [snippet]
      });
    } else {
      existing.score = Math.max(existing.score, candidate.combinedScore);
      if (existing.snippets.length < 2 && !existing.snippets.includes(snippet)) {
        existing.snippets.push(snippet);
      }
    }

    citationMap.set(String(key), {
      articleNumber: candidate.article.articleNumber,
      title: candidate.article.title
    });
  }

  const retrievedSources = [...sourceMap.values()].sort((left, right) => right.score - left.score);
  const citations = [...citationMap.values()];

  return {
    retrievedSources,
    citations,
    reasoningSteps: [
      ...state.reasoningSteps,
      {
        key: "evidence" as const,
        label: "Evidence Assembly",
        summary: `Grouped evidence into ${retrievedSources.length} article bundles.`,
        details: retrievedSources.map(
          (source) => `Art. ${source.articleNumber} · ${source.title}`
        )
      }
    ],
    ...withTiming(state, "evidence_assembler", startedAt)
  };
}
