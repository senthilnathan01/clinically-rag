import type { LangGraphRunnableConfig } from "@langchain/langgraph";

import { getServerEnv } from "@/lib/config/env";
import { generateText, streamText } from "@/lib/vertex/client";
import { buildAnswerRepairPrompt, buildSynthesizerPrompt } from "@/lib/gemini/prompts";
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
  let answerMarkdown = await streamText({
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

  const shouldRepair =
    state.retrievalCandidates.length > 0 &&
    (state.routeTaken !== "simple_factual" || state.subQuestions.length > 1);

  if (shouldRepair) {
    const repairedAnswer = await generateText({
      model: env.GEMINI_MODEL,
      prompt: buildAnswerRepairPrompt(state, answerMarkdown, state.retrievalCandidates),
      temperature: 0.1
    });

    if (repairedAnswer.trim()) {
      answerMarkdown = repairedAnswer.trim();
    }
  }

  return {
    answerMarkdown,
    synthesisSummary: summarizeAnswer(answerMarkdown),
    ...withTiming(state, "synthesizer", startedAt)
  };
}
