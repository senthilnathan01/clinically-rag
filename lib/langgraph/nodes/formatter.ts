import type { LangGraphRunnableConfig } from "@langchain/langgraph";

import { attachCitationAnchors } from "@/lib/citations/anchors";
import { emitStreamEvent, withTiming } from "@/lib/langgraph/helpers";
import type { GraphState } from "@/lib/langgraph/state";

export async function formatterNode(state: GraphState, config?: LangGraphRunnableConfig) {
  const startedAt = Date.now();
  emitStreamEvent(config, {
    event: "phase",
    data: { label: "Finalizing response" }
  });

  const anchored = attachCitationAnchors({
    answerMarkdown: state.answerMarkdown,
    sourceTemplates: state.retrievedSources,
    sourceDetails: state.sourceDetails
  });

  const finalArtifact = {
    answerMarkdown: anchored.answerMarkdown,
    routeTaken: state.routeTaken,
    citationAnchors: anchored.citationAnchors,
    reasoningTrace: {
      routeTaken: state.routeTaken,
      routeRationale: state.routeRationale,
      subQuestions: state.subQuestions,
      retrievedSources: state.retrievedSources,
      evidenceSnippets: state.evidenceSnippets,
      synthesisSummary: state.synthesisSummary,
      criticSummary: state.criticSummary
    },
    criticSummary: state.criticSummary,
    sourceDetails: anchored.sourceDetails
  };

  emitStreamEvent(config, {
    event: "artifact",
    data: finalArtifact
  });

  return {
    finalArtifact,
    ...withTiming(state, "formatter", startedAt)
  };
}
