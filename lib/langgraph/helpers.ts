import type { LangGraphRunnableConfig } from "@langchain/langgraph";

import type { GraphState } from "@/lib/langgraph/state";

export function emitStreamEvent(config: LangGraphRunnableConfig | undefined, payload: unknown) {
  config?.writer?.(payload);
}

export function withTiming(
  state: GraphState,
  nodeName: string,
  startedAt: number
): Pick<GraphState, "timingBreakdown"> {
  return {
    timingBreakdown: {
      ...state.timingBreakdown,
      [nodeName]: Date.now() - startedAt
    }
  };
}
