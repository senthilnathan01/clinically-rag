import type { LangGraphRunnableConfig } from "@langchain/langgraph";

import type { GraphState } from "@/lib/langgraph/state";
import type { GraphStreamEvent } from "@/lib/types/agent";

export function emitStreamEvent(config: LangGraphRunnableConfig | undefined, payload: GraphStreamEvent) {
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
