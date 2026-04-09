import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { z } from "zod";

import { getServerEnv } from "@/lib/config/env";
import { generateObject } from "@/lib/gemini/client";
import { buildRouterPrompt } from "@/lib/gemini/prompts";
import { emitStreamEvent, withTiming } from "@/lib/langgraph/helpers";
import type { GraphState } from "@/lib/langgraph/state";

const routerSchema = z.object({
  routeTaken: z.enum(["simple_factual", "multi_hop", "live", "follow_up"]),
  routeRationale: z.string(),
  focusArticleNumbers: z.array(z.number()).default([])
});

export async function routerNode(state: GraphState, config?: LangGraphRunnableConfig) {
  const startedAt = Date.now();
  emitStreamEvent(config, {
    type: "phase",
    phase: "Preparing sources",
    node: "router",
    status: "running",
    detail: "Classifying the query and deciding whether to use the fast path."
  });

  const env = getServerEnv();
  const routed = await generateObject({
    model: env.GEMINI_TOOLS_MODEL,
    prompt: buildRouterPrompt(state),
    schema: routerSchema
  });

  return {
    routeTaken: routed.routeTaken,
    routeRationale: routed.routeRationale,
    focusArticleNumbers: routed.focusArticleNumbers,
    reasoningSteps: [
      ...state.reasoningSteps,
      {
        key: "query_type" as const,
        label: "Query Type",
        summary: routed.routeRationale,
        details: [
          `Route selected: ${routed.routeTaken}`,
          routed.focusArticleNumbers.length
            ? `Likely articles: ${routed.focusArticleNumbers.join(", ")}`
            : "No explicit article hints inferred."
        ]
      }
    ],
    ...withTiming(state, "router", startedAt)
  };
}
