import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { z } from "zod";

import {
  prepareClaimVerification,
  summarizeCriticChecks,
  verifyAnswerCitations,
  type ClaimSegment
} from "@/lib/citations/verify";
import { getServerEnv } from "@/lib/config/env";
import { emitStreamEvent, withTiming } from "@/lib/langgraph/helpers";
import type { GraphState } from "@/lib/langgraph/state";
import type { CriticCheck, RetrievalCandidate, SourceDetail } from "@/lib/types/agent";
import {
  StructuredOutputError,
  generateObjectWithRaw
} from "@/lib/vertex/client";
import { scoreTokenOverlap } from "@/lib/utils/text";

const semanticCriticSchema = z.object({
  checks: z
    .array(
      z.object({
        claimIndex: z.number().int().positive(),
        status: z.enum(["supported", "weak", "unsupported"]),
        citationNumbers: z.array(z.number()).default([])
      })
    )
    .max(8)
    .default([])
});

interface SemanticEvidence {
  articleNumber: number;
  title: string;
  chunkId: string;
  chunkIndex: number;
  text: string;
}

interface ClaimEvidenceBundle {
  claimIndex: number;
  claim: string;
  citationNumbers: number[];
  evidence: SemanticEvidence[];
}

function repairSemanticCriticChecks(rawText: string) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  const candidate = parsed as { checks?: unknown };
  if (!Array.isArray(candidate.checks)) {
    return null;
  }

  const repairedChecks = candidate.checks
    .flatMap((entry) => {
      if (!entry) {
        return [];
      }

      if (typeof entry === "string" && entry.trim().startsWith("{")) {
        try {
          return [JSON.parse(entry)];
        } catch {
          return [];
        }
      }

      return [entry];
    })
    .filter((entry) => entry && typeof entry === "object");

  const repaired = semanticCriticSchema.safeParse({
    checks: repairedChecks
  });

  return repaired.success ? repaired.data : null;
}

function buildSemanticCriticPrompt(bundles: ClaimEvidenceBundle[]) {
  const bundleText = bundles
    .map((bundle) => {
      const evidenceText = bundle.evidence.length
        ? bundle.evidence
            .map(
              (entry, index) => `
Evidence ${index + 1}
Article ${entry.articleNumber}: ${entry.title}
Chunk ID: ${entry.chunkId}
Chunk Index: ${entry.chunkIndex}
Text: ${entry.text}
              `.trim()
            )
            .join("\n\n")
        : "No evidence was retrieved for these citations.";

      return `
Claim ${bundle.claimIndex}
Text: ${bundle.claim}
Inline citations: ${bundle.citationNumbers.map((value) => `Art. ${value}`).join(", ") || "None"}

Evidence from the cited articles:
${evidenceText}
      `.trim();
    })
    .join("\n\n");

  return `
You are the critic agent for a corpus-grounded research assistant.

Judge whether each claim is supported by the cited evidence.

Rules:
- Support is semantic, not lexical. Do not require exact wording.
- A claim may be supported by combining multiple evidence snippets from the cited articles.
- If the cited evidence supports only part of the claim, mark it as weak.
- Mark unsupported only if the claim is materially absent from the cited evidence, contradicted by it, or has no usable inline citation.
- Use only the evidence shown for each claim.
- citationNumbers must be a subset of the inline citations that actually support the claim.
- Return strict JSON only.

Schema:
- checks: array of objects with:
  - claimIndex: number
  - status: supported | weak | unsupported
  - citationNumbers: number[]

Claims and cited evidence:
${bundleText}
  `.trim();
}

function rankRetrievalCandidates(claim: string, candidates: RetrievalCandidate[]) {
  return [...candidates].sort((left, right) => {
    const leftScore =
      scoreTokenOverlap(claim, `${left.article.title} ${left.articleSummary} ${left.chunkText}`) +
      left.combinedScore * 0.2;
    const rightScore =
      scoreTokenOverlap(claim, `${right.article.title} ${right.articleSummary} ${right.chunkText}`) +
      right.combinedScore * 0.2;

    return rightScore - leftScore;
  });
}

function rankSourceDetails(claim: string, details: SourceDetail[]) {
  return [...details].sort((left, right) => {
    const leftScore = scoreTokenOverlap(
      claim,
      `${left.title} ${left.verificationText || left.snippet}`
    );
    const rightScore = scoreTokenOverlap(
      claim,
      `${right.title} ${right.verificationText || right.snippet}`
    );

    return rightScore - leftScore;
  });
}

function buildClaimEvidenceBundles(state: GraphState, claims: ClaimSegment[]) {
  const retrievalCandidates = state.retrievalCandidates as RetrievalCandidate[];

  return claims.slice(0, 8).map((claim, index) => {
    const evidence: SemanticEvidence[] = [];
    const seenChunkIds = new Set<string>();

    for (const articleNumber of claim.citationNumbers) {
      const articleCandidates = rankRetrievalCandidates(
        claim.claim,
        retrievalCandidates.filter((candidate) => candidate.article.articleNumber === articleNumber)
      ).slice(0, 3);

      if (articleCandidates.length) {
        for (const candidate of articleCandidates) {
          if (seenChunkIds.has(candidate.id)) continue;
          seenChunkIds.add(candidate.id);
          evidence.push({
            articleNumber,
            title: candidate.article.title,
            chunkId: candidate.id,
            chunkIndex: candidate.chunkIndex,
            text: candidate.chunkText.trim()
          });
        }
        continue;
      }

      const fallbackDetails = rankSourceDetails(
        claim.claim,
        state.sourceDetails.filter((detail) => detail.articleNumber === articleNumber)
      ).slice(0, 2);

      for (const detail of fallbackDetails) {
        if (seenChunkIds.has(detail.chunkId)) continue;
        seenChunkIds.add(detail.chunkId);
        evidence.push({
          articleNumber,
          title: detail.title,
          chunkId: detail.chunkId,
          chunkIndex: detail.chunkIndex,
          text: (detail.verificationText || detail.snippet).trim()
        });
      }
    }

    return {
      claimIndex: index + 1,
      claim: claim.claim,
      citationNumbers: claim.citationNumbers,
      evidence
    } satisfies ClaimEvidenceBundle;
  });
}

function mergeSemanticChecks({
  claims,
  localChecks,
  semanticChecks
}: {
  claims: ClaimSegment[];
  localChecks: CriticCheck[];
  semanticChecks: z.infer<typeof semanticCriticSchema>["checks"];
}) {
  const semanticByIndex = new Map(semanticChecks.map((check) => [check.claimIndex, check]));

  return localChecks.map((localCheck, index) => {
    const claim = claims[index];
    const semantic = semanticByIndex.get(index + 1);

    if (!claim || !claim.citationNumbers.length || !semantic) {
      return localCheck;
    }

    const allowedCitations = new Set(claim.citationNumbers);
    const citationNumbers = [
      ...new Set(semantic.citationNumbers.filter((value) => allowedCitations.has(value)))
    ];

    return {
      claim: claim.claim,
      status: semantic.status,
      citationNumbers:
        semantic.status === "unsupported"
          ? []
          : citationNumbers.length
            ? citationNumbers
            : claim.citationNumbers
    } satisfies CriticCheck;
  });
}

export async function criticNode(state: GraphState, config?: LangGraphRunnableConfig) {
  const startedAt = Date.now();
  emitStreamEvent(config, {
    event: "phase",
    data: { label: "Verifying citations" }
  });

  const localVerification = verifyAnswerCitations({
    answerMarkdown: state.answerMarkdown,
    sourceTemplates: state.retrievedSources,
    sourceDetails: state.sourceDetails
  });
  const { preparedAnswerMarkdown, claims } = prepareClaimVerification({
    answerMarkdown: localVerification.answerMarkdown,
    sourceTemplates: state.retrievedSources,
    sourceDetails: state.sourceDetails
  });
  const claimBundles = buildClaimEvidenceBundles(state, claims).filter(
    (bundle) => bundle.citationNumbers.length > 0
  );

  if (!claimBundles.length) {
    return {
      answerMarkdown: localVerification.answerMarkdown,
      criticSummary: localVerification.criticSummary,
      ...withTiming(state, "critic", startedAt)
    };
  }

  try {
    const env = getServerEnv();
    const semanticResult = await generateObjectWithRaw({
      model: env.GEMINI_TOOLS_MODEL,
      prompt: buildSemanticCriticPrompt(claimBundles),
      schema: semanticCriticSchema
    });
    const mergedChecks = mergeSemanticChecks({
      claims,
      localChecks: localVerification.criticSummary.checks,
      semanticChecks: semanticResult.object.checks
    });

    return {
      answerMarkdown: preparedAnswerMarkdown,
      criticSummary: summarizeCriticChecks(mergedChecks),
      ...withTiming(state, "critic", startedAt)
    };
  } catch (error) {
    if (error instanceof StructuredOutputError) {
      const repaired = repairSemanticCriticChecks(error.rawText);

      if (repaired) {
        const mergedChecks = mergeSemanticChecks({
          claims,
          localChecks: localVerification.criticSummary.checks,
          semanticChecks: repaired.checks
        });

        return {
          answerMarkdown: preparedAnswerMarkdown,
          criticSummary: summarizeCriticChecks(mergedChecks),
          ...withTiming(state, "critic", startedAt)
        };
      }
    }

    console.error("Semantic critic fallback", error);
  }

  return {
    answerMarkdown: localVerification.answerMarkdown,
    criticSummary: localVerification.criticSummary,
    ...withTiming(state, "critic", startedAt)
  };
}
