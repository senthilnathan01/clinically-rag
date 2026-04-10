import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { z } from "zod";

import { getServerEnv } from "@/lib/config/env";
import { StructuredOutputError, generateObjectWithRaw } from "@/lib/vertex/client";
import { buildCriticPrompt } from "@/lib/gemini/prompts";
import { emitStreamEvent, withTiming } from "@/lib/langgraph/helpers";
import type { GraphState } from "@/lib/langgraph/state";
import type { CriticCheck, CriticSummary, SourceDetail } from "@/lib/types/agent";

const criticCheckSchema = z.object({
  claim: z.string(),
  status: z.enum(["supported", "weak", "unsupported"]),
  citationNumbers: z.array(z.number()).max(5)
});

const criticSchema = z.object({
  overall: z.enum(["pass", "weak", "fail"]),
  summary: z.string(),
  checks: z.array(criticCheckSchema).max(5).default([])
});

type CriticReview = z.infer<typeof criticSchema>;

function extractCitationNumbersFromAnswer(answerMarkdown: string) {
  return [...answerMarkdown.matchAll(/\[Art\.\s*(\d{1,2})\s*·/g)].map((match) =>
    Number(match[1])
  );
}

function extractClaimCandidates(answerMarkdown: string) {
  return answerMarkdown
    .replace(/\[Art\.[^\]]+\]/g, "")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 28)
    .slice(0, 5);
}

function selectCriticEvidence(
  state: GraphState,
  citedArticleNumbers: number[],
  maxEvidence: number
) {
  const seenChunkIds = new Set<string>();
  const preferred = state.sourceDetails.filter((detail) =>
    citedArticleNumbers.includes(detail.articleNumber)
  );
  const pool = preferred.length ? preferred : state.sourceDetails;
  const evidence: SourceDetail[] = [];

  for (const detail of pool) {
    if (seenChunkIds.has(detail.chunkId)) continue;
    seenChunkIds.add(detail.chunkId);
    evidence.push(detail);
    if (evidence.length >= maxEvidence) break;
  }

  return evidence;
}

function buildFallbackCriticReport(state: GraphState): CriticSummary {
  return {
    overall: "weak",
    summary: "Critic review degraded, so the answer is shown with a conservative verification note.",
    checks: [
      {
        claim:
          "The answer was drafted from retrieved evidence, but the structured critic output was malformed.",
        status: "weak",
        citationNumbers: state.retrievedSources.slice(0, 3).map((source) => source.articleNumber)
      }
    ]
  };
}

function normalizeCriticReview(review: CriticReview, allowedArticleNumbers: Set<number>): CriticSummary {
  const checks: CriticCheck[] = review.checks.slice(0, 5).map((check) => ({
    claim: check.claim,
    status: check.status,
    citationNumbers: [
      ...new Set(check.citationNumbers.filter((value) => allowedArticleNumbers.has(value)))
    ]
  }));

  return {
    overall: review.overall,
    summary: review.summary.trim(),
    checks
  };
}

async function runCriticAttempt({
  state,
  maxEvidence,
  retry
}: {
  state: GraphState;
  maxEvidence: number;
  retry: boolean;
}) {
  const env = getServerEnv();
  const citedArticleNumbers = extractCitationNumbersFromAnswer(state.answerMarkdown);
  const claimCandidates = extractClaimCandidates(state.answerMarkdown);
  const evidence = selectCriticEvidence(state, citedArticleNumbers, maxEvidence);

  console.info("Critic attempt", {
    retryUsed: retry,
    evidenceCount: evidence.length,
    citedArticleNumbers
  });

  const result = await generateObjectWithRaw({
    model: env.GEMINI_TOOLS_MODEL,
    prompt: buildCriticPrompt({
      answerMarkdown: state.answerMarkdown,
      claimCandidates,
      evidence,
      retry
    }),
    schema: criticSchema
  });

  console.info("Critic raw text", result.rawText);

  return normalizeCriticReview(
    result.object,
    new Set(evidence.map((detail) => detail.articleNumber))
  );
}

export async function criticNode(state: GraphState, config?: LangGraphRunnableConfig) {
  const startedAt = Date.now();
  emitStreamEvent(config, {
    event: "phase",
    data: { label: "Verifying citations" }
  });

  let criticSummary: CriticSummary = buildFallbackCriticReport(state);

  try {
    criticSummary = await runCriticAttempt({
      state,
      maxEvidence: 5,
      retry: false
    });
  } catch (error) {
    if (error instanceof StructuredOutputError) {
      console.error("Critic parse error", error.cause);
      console.error("Critic raw text", error.rawText);
    } else {
      console.error("Critic failure", error);
    }

    try {
      criticSummary = await runCriticAttempt({
        state,
        maxEvidence: 3,
        retry: true
      });
    } catch (retryError) {
      if (retryError instanceof StructuredOutputError) {
        console.error("Critic retry parse error", retryError.cause);
        console.error("Critic retry raw text", retryError.rawText);
      } else {
        console.error("Critic retry failure", retryError);
      }

      criticSummary = buildFallbackCriticReport(state);
    }
  }

  return {
    criticSummary,
    ...withTiming(state, "critic", startedAt)
  };
}
