import {
  CITATION_PATTERN,
  prepareAnswerCitations,
  selectSourceDetailForContext
} from "@/lib/citations/anchors";
import type {
  CriticCheck,
  CriticSummary,
  RetrievedSourceSummary,
  SourceDetail
} from "@/lib/types/agent";
import { normalizeText, scoreTokenOverlap, splitSentences, uniqueTokens } from "@/lib/utils/text";

const NUMBER_PATTERN = /\b\d[\d,]*(?:\.\d+)?%?\b/g;
const MARKDOWN_PREFIX_PATTERN = /^(?:[-*+]\s+|\d+\.\s+|#{1,6}\s+)/;
const CLAIM_CITATION_TOKEN_PATTERN = /\[CITATION_(\d{1,2})\]/g;

export interface ClaimSegment {
  claim: string;
  citationNumbers: number[];
}

function normalizeNumberToken(token: string) {
  return token.replace(/,/g, "").toLowerCase();
}

function extractNumberTokens(text: string) {
  return [...text.matchAll(NUMBER_PATTERN)].map((match) => normalizeNumberToken(match[0]));
}

function cleanClaimText(text: string) {
  return normalizeText(
    text
      .replace(CITATION_PATTERN, "")
      .replace(CLAIM_CITATION_TOKEN_PATTERN, "")
      .replace(/\[([^\]]+)\]\(#citation:[^)]+\)/g, "$1")
      .replace(MARKDOWN_PREFIX_PATTERN, "")
      .replace(/\*\*/g, "")
      .replace(/`/g, "")
  );
}

function injectClaimCitationTokens(text: string) {
  return text.replace(CITATION_PATTERN, (_, articleNumberRaw) => {
    return `[CITATION_${Number(articleNumberRaw)}]`;
  });
}

function extractClaimSegments(answerMarkdown: string) {
  const claims: ClaimSegment[] = [];
  const seen = new Set<string>();

  for (const line of answerMarkdown.split("\n")) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.endsWith(":")) {
      continue;
    }

    const tokenizedLine = injectClaimCitationTokens(trimmedLine);

    for (const sentence of splitSentences(tokenizedLine)) {
      const rawSentence = sentence.trim();
      const claim = cleanClaimText(rawSentence);

      if (claim.length < 24) {
        continue;
      }

      const citationNumbers = [...rawSentence.matchAll(CLAIM_CITATION_TOKEN_PATTERN)].map((match) =>
        Number(match[1])
      );
      const claimTokenCount = uniqueTokens(claim).length;
      const hasFactualShape = /\d/.test(claim) || claimTokenCount >= 6;

      if (!hasFactualShape) {
        continue;
      }

      const key = `${claim}__${citationNumbers.join(",")}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      claims.push({
        claim,
        citationNumbers
      });
    }
  }

  return claims;
}

export function prepareClaimVerification({
  answerMarkdown,
  sourceTemplates,
  sourceDetails
}: {
  answerMarkdown: string;
  sourceTemplates: RetrievedSourceSummary[];
  sourceDetails: SourceDetail[];
}) {
  const preparedAnswerMarkdown = prepareAnswerCitations(
    answerMarkdown,
    sourceTemplates,
    sourceDetails
  );

  return {
    preparedAnswerMarkdown,
    claims: extractClaimSegments(preparedAnswerMarkdown)
  };
}

function mapClaimDetails(
  claim: ClaimSegment,
  sourceTemplates: RetrievedSourceSummary[],
  sourceDetails: SourceDetail[]
) {
  const details: SourceDetail[] = [];
  const seenChunkIds = new Set<string>();

  for (const articleNumber of claim.citationNumbers) {
    const matchingDetails = sourceDetails
      .filter((detail) => detail.articleNumber === articleNumber)
      .map((detail) => ({
        detail,
        score: scoreTokenOverlap(
          claim.claim,
          `${detail.title} ${detail.verificationText || detail.snippet}`
        )
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, 3)
      .map((entry) => entry.detail);

    if (matchingDetails.length) {
      for (const detail of matchingDetails) {
        if (seenChunkIds.has(detail.chunkId)) {
          continue;
        }

        seenChunkIds.add(detail.chunkId);
        details.push(detail);
      }

      continue;
    }

    const detail = selectSourceDetailForContext({
      articleNumber,
      contextText: claim.claim,
      sourceTemplates,
      sourceDetails
    });

    if (!detail || seenChunkIds.has(detail.chunkId)) {
      continue;
    }

    seenChunkIds.add(detail.chunkId);
    details.push(detail);
  }

  return details;
}

function scoreClaimSupport(claimText: string, details: SourceDetail[]) {
  const evidenceText = details
    .map((detail) => `${detail.title} ${detail.verificationText || detail.snippet}`.trim())
    .join(" ");
  const overlap = scoreTokenOverlap(claimText, evidenceText);
  const bestDetailOverlap = details.reduce((best, detail) => {
    return Math.max(
      best,
      scoreTokenOverlap(claimText, `${detail.title} ${detail.verificationText || detail.snippet}`)
    );
  }, 0);
  const claimNumbers = extractNumberTokens(claimText);
  const evidenceNumbers = new Set(extractNumberTokens(evidenceText));
  const matchedNumbers = claimNumbers.filter((value) => evidenceNumbers.has(value)).length;
  const numericCoverage = claimNumbers.length ? matchedNumbers / claimNumbers.length : 1;

  return {
    overlap,
    bestDetailOverlap,
    numericCoverage,
    claimTokenCount: uniqueTokens(claimText).length
  };
}

function classifyClaimSupport(
  claim: ClaimSegment,
  details: SourceDetail[]
): CriticCheck["status"] {
  if (!claim.citationNumbers.length || !details.length) {
    return "unsupported";
  }

  const { overlap, bestDetailOverlap, numericCoverage, claimTokenCount } = scoreClaimSupport(
    claim.claim,
    details
  );

  if (claimTokenCount <= 4) {
    if (numericCoverage === 1 && (bestDetailOverlap >= 0.22 || overlap >= 0.18)) {
      return "supported";
    }

    if (numericCoverage > 0 || bestDetailOverlap >= 0.12) {
      return "weak";
    }

    return "unsupported";
  }

  if (numericCoverage < 0.5 && overlap < 0.2) {
    return "unsupported";
  }

  if (numericCoverage === 1 && (overlap >= 0.22 || bestDetailOverlap >= 0.3)) {
    return "supported";
  }

  if (numericCoverage >= 0.5 || overlap >= 0.12 || bestDetailOverlap >= 0.18) {
    return "weak";
  }

  return "unsupported";
}

function prioritizeChecks(checks: CriticCheck[]) {
  const priority = {
    unsupported: 0,
    weak: 1,
    supported: 2
  } as const;

  return checks
    .map((check, index) => ({ check, index }))
    .sort((left, right) => {
      return (
        priority[left.check.status] - priority[right.check.status] || left.index - right.index
      );
    })
    .map((entry) => entry.check);
}

export function summarizeCriticChecks(checks: CriticCheck[]): CriticSummary {
  if (!checks.length) {
    return {
      overall: "weak",
      summary:
        "Verification found no substantial factual claims to score in the final answer, so it stayed conservative.",
      checks: []
    };
  }

  const unsupportedCount = checks.filter((check) => check.status === "unsupported").length;
  const weakCount = checks.filter((check) => check.status === "weak").length;

  if (unsupportedCount > 0) {
    return {
      overall: "fail",
      summary:
        unsupportedCount === 1
          ? "1 factual claim in the final answer was unsupported or missing a usable inline citation."
          : `${unsupportedCount} factual claims in the final answer were unsupported or missing usable inline citations.`,
      checks: prioritizeChecks(checks).slice(0, 6)
    };
  }

  if (weakCount > 0) {
    return {
      overall: "weak",
      summary:
        weakCount === 1
          ? "1 factual claim stayed weak because the cited evidence only partially supported it."
          : `${weakCount} factual claims stayed weak because the cited evidence only partially supported them.`,
      checks: prioritizeChecks(checks).slice(0, 6)
    };
  }

  return {
    overall: "pass",
    summary: "All checked factual claims in the final answer were supported by their cited evidence.",
    checks: prioritizeChecks(checks).slice(0, 6)
  };
}

export function verifyAnswerCitations({
  answerMarkdown,
  sourceTemplates,
  sourceDetails
}: {
  answerMarkdown: string;
  sourceTemplates: RetrievedSourceSummary[];
  sourceDetails: SourceDetail[];
}) {
  const preparedAnswerMarkdown = prepareAnswerCitations(
    answerMarkdown,
    sourceTemplates,
    sourceDetails
  );
  const { claims } = prepareClaimVerification({
    answerMarkdown: preparedAnswerMarkdown,
    sourceTemplates,
    sourceDetails
  });
  const checks = claims.map((claim) => {
    const details = mapClaimDetails(claim, sourceTemplates, sourceDetails);

    return {
      claim: claim.claim,
      status: classifyClaimSupport(claim, details),
      citationNumbers: [...new Set(details.map((detail) => detail.articleNumber))]
    } satisfies CriticCheck;
  });

  return {
    answerMarkdown: preparedAnswerMarkdown,
    criticSummary: summarizeCriticChecks(checks)
  };
}
