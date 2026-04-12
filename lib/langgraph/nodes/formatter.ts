import type { LangGraphRunnableConfig } from "@langchain/langgraph";

import { attachCitationAnchors } from "@/lib/citations/anchors";
import { emitStreamEvent, withTiming } from "@/lib/langgraph/helpers";
import type { GraphState } from "@/lib/langgraph/state";
import type { QuerySourceMapping, RetrievalCandidate } from "@/lib/types/agent";
import { scoreTokenOverlap } from "@/lib/utils/text";

const QUESTION_START_PATTERN =
  /\b(?:how|what|which|who|whom|when|where|why|did|does|do|is|are|was|were|can|could|should|would)\b/i;

const QUESTION_SPLIT_PATTERN =
  /(?:,\s+and\s+|,\s+|\s+and\s+)(?=(?:how|what|which|who|whom|when|where|why|did|does|do|is|are|was|were|can|could|should|would)\b)/gi;

function toQuestion(text: string) {
  const trimmed = text.trim().replace(/\?+$/g, "");
  if (!trimmed) return "";
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}?`;
}

function deriveDisplayQueries(state: GraphState) {
  if (state.subQuestions.length) {
    return state.subQuestions;
  }

  const normalizedQuestion = state.question.replace(/\s+/g, " ").trim();
  const startIndex = normalizedQuestion.search(QUESTION_START_PATTERN);
  const tail = startIndex >= 0 ? normalizedQuestion.slice(startIndex) : normalizedQuestion;
  const derived = tail
    .split(QUESTION_SPLIT_PATTERN)
    .map((part) => toQuestion(part))
    .filter(Boolean)
    .slice(0, 4);

  return derived.length ? derived : [toQuestion(normalizedQuestion)];
}

function parseCitedArticleCounts(answerMarkdown: string) {
  const counts = new Map<number, number>();

  for (const match of answerMarkdown.matchAll(/\[Art\.\s*(\d+)/g)) {
    const articleNumber = Number(match[1]);
    counts.set(articleNumber, (counts.get(articleNumber) ?? 0) + 1);
  }

  return counts;
}

function dedupeArticleChips(
  sources: Array<{
    articleNumber: number;
    title: string;
  }>
) {
  const seen = new Set<number>();

  return sources.filter((source) => {
    if (seen.has(source.articleNumber)) {
      return false;
    }

    seen.add(source.articleNumber);
    return true;
  });
}

function buildQuerySourceMappings(state: GraphState): QuerySourceMapping[] {
  const retrievalCandidates = state.retrievalCandidates as RetrievalCandidate[];
  const displayedQueries = deriveDisplayQueries(state);
  const citedArticleCounts = parseCitedArticleCounts(state.answerMarkdown);
  const preferredSourceTemplates = state.retrievedSources.filter((source) =>
    citedArticleCounts.size ? citedArticleCounts.has(source.articleNumber) : true
  );
  const fallbackSources = (preferredSourceTemplates.length
    ? preferredSourceTemplates
    : state.retrievedSources
  ).map((source) => ({
    articleNumber: source.articleNumber,
    title: source.title
  }));

  return displayedQueries.map((query) => {
    const articleScores = new Map<
      number,
      {
        articleNumber: number;
        title: string;
        score: number;
      }
    >();

    for (const candidate of retrievalCandidates) {
      if (citedArticleCounts.size && !citedArticleCounts.has(candidate.article.articleNumber)) {
        continue;
      }

      const queryOverlap = scoreTokenOverlap(
        query,
        `${candidate.article.title} ${candidate.articleSummary} ${candidate.chunkText}`
      );
      const matchedQueryOverlap = Math.max(
        ...candidate.matchedQueries.map((matchedQuery) => scoreTokenOverlap(query, matchedQuery)),
        0
      );
      const citedBoost = (citedArticleCounts.get(candidate.article.articleNumber) ?? 0) * 0.35;
      const score =
        queryOverlap * 1.15 + matchedQueryOverlap * 0.85 + candidate.combinedScore * 0.25 + citedBoost;
      const current = articleScores.get(candidate.article.articleNumber);

      if (!current || score > current.score) {
        articleScores.set(candidate.article.articleNumber, {
          articleNumber: candidate.article.articleNumber,
          title: candidate.article.title,
          score
        });
      }
    }

    return {
      query,
      sources: dedupeArticleChips([
        ...[...articleScores.values()]
          .sort((left, right) => right.score - left.score)
          .map(({ articleNumber, title }) => ({ articleNumber, title })),
        ...fallbackSources
      ]).slice(0, 3)
    };
  });
}

export async function formatterNode(state: GraphState, config?: LangGraphRunnableConfig) {
  const startedAt = Date.now();
  emitStreamEvent(config, {
    event: "phase",
    data: { label: "Finalizing response" }
  });

  const anchored = attachCitationAnchors({
    answerMarkdown: state.answerMarkdown,
    sourceTemplates: state.retrievedSources,
    sourceDetails: state.sourceDetails
  });

  const finalArtifact = {
    intent: "grounded_query" as const,
    answerMarkdown: anchored.answerMarkdown,
    routeTaken: state.routeTaken,
    citationAnchors: anchored.citationAnchors,
    reasoningTrace: {
      routeTaken: state.routeTaken,
      routeRationale: state.routeRationale,
      subQuestions: deriveDisplayQueries(state),
      querySourceMappings: state.querySourceMappings.length
        ? state.querySourceMappings
        : buildQuerySourceMappings(state),
      retrievedSources: state.retrievedSources,
      evidenceSnippets: state.evidenceSnippets,
      synthesisSummary: state.synthesisSummary,
      criticSummary: state.criticSummary
    },
    criticSummary: state.criticSummary,
    sourceDetails: anchored.sourceDetails
  };

  emitStreamEvent(config, {
    event: "artifact",
    data: finalArtifact
  });

  return {
    finalArtifact,
    ...withTiming(state, "formatter", startedAt)
  };
}
