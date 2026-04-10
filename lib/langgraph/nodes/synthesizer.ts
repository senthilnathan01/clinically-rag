import type { LangGraphRunnableConfig } from "@langchain/langgraph";

import { getServerEnv } from "@/lib/config/env";
import { streamText } from "@/lib/gemini/client";
import { buildSynthesizerPrompt } from "@/lib/gemini/prompts";
import { emitStreamEvent, withTiming } from "@/lib/langgraph/helpers";
import type { GraphState } from "@/lib/langgraph/state";

function summarizeAnswer(text: string) {
  const stripped = text.replace(/\[Art\.[^\]]+\]/g, "").replace(/\s+/g, " ").trim();
  if (!stripped) return "No grounded answer was produced.";
  return stripped.slice(0, 220);
}

export async function synthesizerNode(state: GraphState, config?: LangGraphRunnableConfig) {
  const startedAt = Date.now();
  emitStreamEvent(config, {
    event: "phase",
    data: { label: "Reasoning across articles" }
  });

  const env = getServerEnv();
  const answerMarkdown = await streamText({
    model: env.GEMINI_MODEL,
    prompt: buildSynthesizerPrompt(state, state.retrievalCandidates),
    onChunk: (chunk) => {
      if (chunk.text) {
        emitStreamEvent(config, {
          event: "token",
          data: { text: chunk.text }
        });
      }
    }
  });

  return {
    answerMarkdown,
    synthesisSummary: summarizeAnswer(answerMarkdown),
    ...withTiming(state, "synthesizer", startedAt)
  };
}
