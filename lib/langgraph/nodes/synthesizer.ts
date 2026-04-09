import type { LangGraphRunnableConfig } from "@langchain/langgraph";

import { getServerEnv } from "@/lib/config/env";
import { buildSynthesizerPrompt } from "@/lib/gemini/prompts";
import { streamText } from "@/lib/gemini/client";
import { emitStreamEvent, withTiming } from "@/lib/langgraph/helpers";
import type { GraphState } from "@/lib/langgraph/state";

export async function synthesizerNode(state: GraphState, config?: LangGraphRunnableConfig) {
  const startedAt = Date.now();
  emitStreamEvent(config, {
    type: "phase",
    phase: "Reasoning across articles",
    node: "synthesizer",
    status: "running",
    detail: "Drafting a grounded answer with inline article citations."
  });

  const env = getServerEnv();
  const answerMarkdown = await streamText({
    model: env.GEMINI_MODEL,
    prompt: buildSynthesizerPrompt(state, state.retrievalCandidates),
    onChunk: (chunk) => {
      if (chunk.text) {
        emitStreamEvent(config, {
          type: "answer_token",
          node: "synthesizer",
          text: chunk.text
        });
      }
    }
  });

  return {
    answerMarkdown,
    reasoningSteps: [
      ...state.reasoningSteps,
      {
        key: "synthesis" as const,
        label: "Synthesis Summary",
        summary: `Drafted the final response using ${state.retrievedSources.length} article bundles.`,
        details: state.subQuestions.length ? state.subQuestions : [state.question]
      }
    ],
    ...withTiming(state, "synthesizer", startedAt)
  };
}
