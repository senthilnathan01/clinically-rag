import type { LangGraphRunnableConfig } from "@langchain/langgraph";

import { emitStreamEvent, withTiming } from "@/lib/langgraph/helpers";
import type { GraphState } from "@/lib/langgraph/state";

export async function formatterNode(state: GraphState, config?: LangGraphRunnableConfig) {
  const startedAt = Date.now();
  emitStreamEvent(config, {
    type: "phase",
    phase: "Finalizing response",
    node: "formatter",
    status: "running",
    detail: "Assembling the UI-ready answer payload."
  });

  const finalResponse = {
    answerMarkdown: state.answerMarkdown,
    citations: state.citations,
    reasoningTrace: {
      route: state.routeTaken,
      phases: state.reasoningSteps
    },
    retrievedSources: state.retrievedSources,
    criticReport: state.criticReport,
    routeTaken: state.routeTaken,
    timingBreakdown: state.timingBreakdown
  };

  emitStreamEvent(config, {
    type: "final",
    node: "formatter",
    payload: finalResponse
  });

  return {
    finalResponse,
    reasoningSteps: [
      ...state.reasoningSteps,
      {
        key: "formatting" as const,
        label: "Response Packaging",
        summary: "Prepared the answer, trace, sources, and critic report for the UI.",
        details: [
          `Route taken: ${state.routeTaken}`,
          `Citations surfaced: ${state.citations.length}`
        ]
      }
    ],
    ...withTiming(state, "formatter", startedAt)
  };
}
