import { writeFile } from "node:fs/promises";
import path from "node:path";

import nextEnv from "@next/env";

import { getEvalDataset } from "@/lib/data/load-data";
import { healthcareGraph } from "@/lib/langgraph/graph";
import { createInitialGraphState } from "@/lib/langgraph/state";
import { loadManifest } from "@/lib/retrieval/store";
import type { AssistantArtifact } from "@/lib/types/agent";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesEvery(text: string, parts: string[]) {
  const normalized = normalize(text);
  return parts.every((part) => normalized.includes(normalize(part)));
}

function citationNumbers(artifact?: AssistantArtifact) {
  return [...new Set((artifact?.citationAnchors ?? []).map((anchor) => anchor.articleNumber))];
}

function scoreBaseAnswer({
  artifact,
  expectedShortAnswer,
  expectedAnswer,
  expectedSources
}: {
  artifact?: AssistantArtifact;
  expectedShortAnswer: string;
  expectedAnswer: string;
  expectedSources: number[];
}) {
  const answer = artifact?.answerMarkdown ?? "";
  const normalizedAnswer = normalize(answer);
  const shortHit = expectedShortAnswer
    .toLowerCase()
    .split(/[·/]/)
    .map((value) => value.trim())
    .filter(Boolean)
    .every((part) => normalizedAnswer.includes(part));
  const citationHits = expectedSources.filter((source) =>
    citationNumbers(artifact).includes(source)
  ).length;
  const traceReady = Boolean(artifact?.reasoningTrace?.synthesisSummary);
  const criticReady =
    Boolean(artifact?.criticSummary?.checks.length) &&
    artifact?.criticSummary?.summary !== "Critic review did not run yet.";
  const verificationPassed = artifact?.criticSummary?.overall !== "fail";
  const sentenceHits = expectedAnswer
    .split(/[.]/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 30)
    .slice(0, 4)
    .filter((sentence) => normalizedAnswer.includes(normalize(sentence).slice(0, 26))).length;

  return {
    factualAccuracy: Math.min(4, shortHit ? 2 + sentenceHits : sentenceHits),
    citationQuality: Math.min(3, citationHits),
    reasoningQuality: traceReady ? 2 : 0,
    verificationQuality: criticReady && verificationPassed ? 1 : 0
  };
}

function evaluateTrapChecks(id: string, artifact: AssistantArtifact | undefined, article21Present: boolean) {
  const answer = artifact?.answerMarkdown ?? "";
  const normalizedAnswer = normalize(answer);
  const citations = citationNumbers(artifact);

  if (id === "Q03") {
    return {
      passed:
        includesEvery(answer, ["58%"]) &&
        (normalizedAnswer.includes("2–10%") || normalizedAnswer.includes("2-10%") || normalizedAnswer.includes("2 to 10%")) &&
        !normalizedAnswer.includes("chatrwd is a rag system") &&
        !normalizedAnswer.includes("validated retrieval augmented generation"),
      note: "Reject answers that misclassify ChatRWD as plain RAG."
    };
  }

  if (id === "Q04") {
    return {
      passed:
        (normalizedAnswer.includes("950") || normalizedAnswer.includes("~950")) &&
        (normalizedAnswer.includes("723") || normalizedAnswer.includes("76%")) &&
        !normalizedAnswer.includes("956 radiology"),
      note: "Reject answers that conflate total devices with the radiology subset."
    };
  }

  if (id === "Q09") {
    return {
      passed:
        normalizedAnswer.includes("19%") &&
        normalizedAnswer.includes("3.6%") &&
        (normalizedAnswer.includes("validation") ||
          normalizedAnswer.includes("demograph") ||
          normalizedAnswer.includes("bias")),
      note: "Require the deployment-success and demographic-reporting linkage."
    };
  }

  if (id === "Q11") {
    const honestRefusal =
      !article21Present &&
      (normalizedAnswer.includes("cannot find") ||
        normalizedAnswer.includes("lack evidence") ||
        normalizedAnswer.includes("not in the knowledge base"));

    return {
      passed:
        honestRefusal ||
        (citations.includes(21) &&
          includesEvery(answer, ["2,400", "9", "3", "Limbic"])),
      note: "Require the live Article 21 facts or an explicit epistemic refusal."
    };
  }

  return {
    passed: true,
    note: "No deterministic trap check configured."
  };
}

function renderReport(results: Array<Record<string, unknown>>) {
  const lines = ["# Eval Report", "", `Generated: ${new Date().toISOString()}`, ""];

  for (const result of results) {
    lines.push(`## ${result.id}`);
    lines.push(`- Prompt: ${result.prompt}`);
    lines.push(`- Total: ${result.total}/11`);
    lines.push(`- Route: ${result.route}`);
    lines.push(`- Citation articles: ${result.citations}`);
    lines.push(`- Trap check: ${result.trapPassed ? "pass" : "fail"} — ${result.trapNote}`);
    lines.push(`- Critic: ${result.criticOverall} — ${result.criticSummary}`);
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const evalSet = getEvalDataset();
  const manifest = await loadManifest();
  const results: Array<Record<string, unknown>> = [];

  for (const question of evalSet.questions) {
    const state = createInitialGraphState({
      question: question.prompt,
      conversation: []
    });
    const finalState = (await healthcareGraph.invoke(state as never)) as Record<string, any>;
    const artifact = finalState.finalArtifact as AssistantArtifact | undefined;
    const scores = scoreBaseAnswer({
      artifact,
      expectedShortAnswer: question.expectedShortAnswer,
      expectedAnswer: question.expectedAnswer,
      expectedSources: question.sources
    });
    const trapCheck = evaluateTrapChecks(question.id, artifact, Boolean(manifest.article21Present));
    const total =
      scores.factualAccuracy +
      scores.citationQuality +
      scores.reasoningQuality +
      scores.verificationQuality +
      (trapCheck.passed ? 1 : 0);

    results.push({
      id: question.id,
      prompt: question.prompt,
      route: artifact?.routeTaken ?? finalState.routeTaken,
      citations: citationNumbers(artifact).join(", "),
      criticOverall: artifact?.criticSummary?.overall ?? "",
      criticSummary: artifact?.criticSummary?.summary ?? "",
      total,
      trapPassed: trapCheck.passed,
      trapNote: trapCheck.note,
      ...scores,
      answer: artifact?.answerMarkdown ?? ""
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
