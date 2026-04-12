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

const criticStatuses = ["supported", "weak", "unsupported"] as const;
const criticOveralls = ["pass", "weak", "fail"] as const;

function coerceCriticStatus(value: unknown): CriticCheck["status"] | null {
  if (typeof value !== "string") return null;

  return (criticStatuses as readonly string[]).includes(value)
    ? (value as CriticCheck["status"])
    : null;
}

function coerceCriticOverall(value: unknown): CriticSummary["overall"] | null {
  if (typeof value !== "string") return null;

  return (criticOveralls as readonly string[]).includes(value)
    ? (value as CriticSummary["overall"])
    : null;
}

function coerceCitationNumbers(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => coerceCitationNumbers(entry))
      .slice(0, 5);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return [value];
  }

  if (typeof value !== "string") {
    return [];
  }

  return [...value.matchAll(/\d+/g)]
    .map((match) => Number(match[0]))
    .filter((entry) => Number.isFinite(entry))
    .slice(0, 5);
}

function parseCriticCheck(value: unknown): CriticCheck | null {
  if (typeof value === "string" && value.trim().startsWith("{")) {
    try {
      return parseCriticCheck(JSON.parse(value));
    } catch {
      return null;
    }
  }

  const parsed = criticCheckSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const status = coerceCriticStatus(candidate.status);

  if (typeof candidate.claim !== "string" || !status) {
    return null;
  }

  return {
    claim: candidate.claim.trim(),
    status,
    citationNumbers: coerceCitationNumbers(candidate.citationNumbers)
  };
}

function parseFlattenedCriticChecks(values: unknown[]): CriticCheck[] {
  const checks: CriticCheck[] = [];
  let current: Partial<CriticCheck> = {};

  const pushCurrent = () => {
    if (!current.claim || !current.status) return;

    checks.push({
      claim: current.claim.trim(),
      status: current.status,
      citationNumbers: current.citationNumbers ?? []
    });
    current = {};
  };

  for (let index = 0; index < values.length && checks.length < 5; index += 1) {
    const entry = values[index];
    const parsedObject = parseCriticCheck(entry);

    if (parsedObject) {
      pushCurrent();
      checks.push(parsedObject);
      continue;
    }

    if (typeof entry !== "string" && typeof entry !== "number") {
      continue;
    }

    const token = String(entry).trim();

    if (!token) {
      continue;
    }

    switch (token) {
      case "claim": {
        const next = values[index + 1];
        if (typeof next === "string" || typeof next === "number") {
          if (current.claim && current.status) {
            pushCurrent();
          }

          current.claim = String(next).trim();
          index += 1;
        }
        break;
      }
      case "status": {
        const next = values[index + 1];
        const status = coerceCriticStatus(next);
        if (status) {
          current.status = status;
          index += 1;
        }
        break;
      }
      case "citationNumbers": {
        const next = values[index + 1];
        current.citationNumbers = coerceCitationNumbers(next);
        index += 1;
        break;
      }
      default: {
        if (!current.claim) {
          current.claim = token;
        } else if (current.status) {
          pushCurrent();
          current.claim = token;
        }
      }
    }
  }

  pushCurrent();

  return checks.slice(0, 5);
}

function repairCriticReview(rawText: string): CriticReview | null {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    return null;
  }

  const direct = criticSchema.safeParse(parsedJson);
  if (direct.success) {
    return direct.data;
  }

  if (!parsedJson || typeof parsedJson !== "object" || Array.isArray(parsedJson)) {
    return null;
  }

  const candidate = parsedJson as Record<string, unknown>;
  const checks = Array.isArray(candidate.checks)
    ? parseFlattenedCriticChecks(candidate.checks)
    : [];

  const repaired = criticSchema.safeParse({
    overall: coerceCriticOverall(candidate.overall) ?? "weak",
    summary:
      typeof candidate.summary === "string" && candidate.summary.trim().length > 0
        ? candidate.summary.trim()
        : "Critic review degraded, so the answer is shown with a conservative verification note.",
    checks
  });

  return repaired.success ? repaired.data : null;
}

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
    summary:
      "Verification stayed conservative because the structured critic output was weak, so the answer is shown with grounded citations only.",
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

  if (!checks.length) {
    return {
      overall: "weak",
      summary:
        "Verification stayed conservative because the critic response was too thin to support a stronger judgment.",
      checks: []
    };
  }

  const containsUnsupportedClaim = checks.some((check) => check.status === "unsupported");
  const overall =
    review.overall === "fail" && !containsUnsupportedClaim ? "weak" : review.overall;

  return {
    overall,
    summary:
      overall === "weak" && review.overall === "fail" && !containsUnsupportedClaim
        ? "Verification flagged uncertainty, but it did not identify a clearly unsupported cited claim."
        : review.summary.trim(),
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

  try {
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
  } catch (error) {
    if (error instanceof StructuredOutputError) {
      const repairedReview = repairCriticReview(error.rawText);

      if (repairedReview) {
        console.warn("Critic structured output repaired from raw text.");
        console.info("Critic repaired raw text", error.rawText);

        return normalizeCriticReview(
          repairedReview,
          new Set(evidence.map((detail) => detail.articleNumber))
        );
      }
    }

    throw error;
  }
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
