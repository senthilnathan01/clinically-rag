import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { z } from "zod";

import { getServerEnv } from "@/lib/config/env";
import { generateObject } from "@/lib/vertex/client";
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
    event: "phase",
    data: { label: "Preparing sources" }
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
    ...withTiming(state, "router", startedAt)
  };
}
