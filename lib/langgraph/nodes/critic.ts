import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { z } from "zod";

import { getServerEnv } from "@/lib/config/env";
import { generateObject } from "@/lib/gemini/client";
import { buildCriticPrompt } from "@/lib/gemini/prompts";
import { emitStreamEvent, withTiming } from "@/lib/langgraph/helpers";
import type { GraphState } from "@/lib/langgraph/state";

const criticSchema = z.object({
  checks: z.array(
    z.object({
      claim: z.string(),
      status: z.enum(["supported", "weak", "unsupported"]),
      citations: z.array(
        z.object({
          articleNumber: z.number(),
          title: z.string()
        })
      ),
      note: z.string()
    })
  )
});

export async function criticNode(state: GraphState, config?: LangGraphRunnableConfig) {
  const startedAt = Date.now();
  emitStreamEvent(config, {
    type: "phase",
    phase: "Verifying citations",
    node: "critic",
    status: "running",
    detail: "Checking the answer against the retrieved evidence."
  });

  const env = getServerEnv();
  const review = await generateObject({
    model: env.GEMINI_TOOLS_MODEL,
    prompt: buildCriticPrompt(state, state.retrievalCandidates),
    schema: criticSchema
  });

  return {
    criticReport: review.checks,
    reasoningSteps: [
      ...state.reasoningSteps,
      {
        key: "critic" as const,
        label: "Critic Verification",
        summary: `Reviewed ${review.checks.length} factual claims.`,
        details: review.checks.map(
          (check) => `${check.status.toUpperCase()}: ${check.claim}`
        )
      }
    ],
    ...withTiming(state, "critic", startedAt)
  };
}
