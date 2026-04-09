import { writeFile } from "node:fs/promises";
import path from "node:path";

import nextEnv from "@next/env";

import { getEvalDataset } from "@/lib/data/load-data";
import { healthcareGraph } from "@/lib/langgraph/graph";
import { createInitialGraphState } from "@/lib/langgraph/state";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

function scoreAnswer({
  answer,
  expectedShortAnswer,
  expectedAnswer,
  expectedSources
}: {
  answer: string;
  expectedShortAnswer: string;
  expectedAnswer: string;
  expectedSources: number[];
}) {
  const normalizedAnswer = answer.toLowerCase();
  const shortHit = expectedShortAnswer
    .toLowerCase()
    .split(/[·/]/)
    .map((value) => value.trim())
    .filter(Boolean)
    .every((part) => normalizedAnswer.includes(part.toLowerCase()));
  const factHitCount = expectedAnswer
    .split(/[.]/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 20)
    .slice(0, 4)
    .filter((sentence) => normalizedAnswer.includes(sentence.toLowerCase().slice(0, 20))).length;
  const citationHits = expectedSources.filter((source) =>
    normalizedAnswer.includes(`[art. ${source}`.toLowerCase())
  ).length;

  return {
    factualAccuracy: Math.min(3, shortHit ? 2 + Math.min(factHitCount, 1) : factHitCount > 0 ? 1 : 0),
    citationQuality: Math.min(3, citationHits),
    reasoningTrace: normalizedAnswer.length > 0 ? 2 : 0,
    completeness: shortHit ? 2 : 1
  };
}

function renderReport(results: Array<Record<string, unknown>>) {
  const lines = ["# Eval Report", "", `Generated: ${new Date().toISOString()}`, ""];

  for (const result of results) {
    lines.push(`## ${result.id}`);
    lines.push(`- Prompt: ${result.prompt}`);
    lines.push(`- Score: ${result.total}/10`);
    lines.push(`- Route: ${result.route}`);
    lines.push(`- Expected sources: ${result.sources}`);
    lines.push(`- Retrieved citations: ${result.citations}`);
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const evalSet = getEvalDataset();
  const results: Array<Record<string, unknown>> = [];

  for (const question of evalSet.questions) {
    const state = createInitialGraphState({
      question: question.prompt,
      conversation: []
    });
    const finalState = (await healthcareGraph.invoke(state as never)) as Record<string, any>;
    const answer = finalState.finalResponse?.answerMarkdown ?? "";
    const scores = scoreAnswer({
      answer,
      expectedShortAnswer: question.expectedShortAnswer,
      expectedAnswer: question.expectedAnswer,
      expectedSources: question.sources
    });
    const total =
      scores.factualAccuracy + scores.citationQuality + scores.reasoningTrace + scores.completeness;

    results.push({
      id: question.id,
      prompt: question.prompt,
      route: finalState.routeTaken,
      sources: question.sources.join(", "),
      citations:
        finalState.finalResponse?.citations
          .map((citation: { articleNumber: number }) => `Art. ${citation.articleNumber}`)
          .join(", ") ?? "",
      total,
      ...scores,
      answer
    });
  }

  const report = renderReport(results);
  await writeFile(path.join(process.cwd(), "EVAL_REPORT.md"), report);
  await writeFile(
    path.join(process.cwd(), "data", "generated", "eval-results.json"),
    JSON.stringify(results, null, 2)
  );

  console.log(report);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
