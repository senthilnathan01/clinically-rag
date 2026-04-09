import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { z } from "zod";

import { getServerEnv } from "@/lib/config/env";
import { generateObject } from "@/lib/gemini/client";
import { buildDecomposerPrompt } from "@/lib/gemini/prompts";
import { emitStreamEvent, withTiming } from "@/lib/langgraph/helpers";
import type { GraphState } from "@/lib/langgraph/state";

const decomposerSchema = z.object({
  subQuestions: z.array(z.string()).min(1).max(4),
  searchQueries: z.array(z.string()).min(2).max(5),
  focusArticleNumbers: z.array(z.number()).default([])
});

export async function decomposerNode(state: GraphState, config?: LangGraphRunnableConfig) {
  const startedAt = Date.now();
  emitStreamEvent(config, {
    type: "phase",
    phase: "Preparing sources",
    node: "decomposer",
    status: "running",
    detail: "Breaking the question into grounded sub-questions."
  });

  const env = getServerEnv();
  const result = await generateObject({
    model: env.GEMINI_TOOLS_MODEL,
    prompt: buildDecomposerPrompt(state),
    schema: decomposerSchema
  });

  return {
    subQuestions: result.subQuestions,
    searchQueries: result.searchQueries,
    focusArticleNumbers: [...new Set([...state.focusArticleNumbers, ...result.focusArticleNumbers])],
    reasoningSteps: [
      ...state.reasoningSteps,
      {
        key: "sub_questions" as const,
        label: "Sub-question Decomposition",
        summary: `Expanded into ${result.subQuestions.length} sub-questions.`,
        details: result.subQuestions
      }
    ],
    ...withTiming(state, "decomposer", startedAt)
  };
}
