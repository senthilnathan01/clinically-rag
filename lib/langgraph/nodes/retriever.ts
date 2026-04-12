import type { LangGraphRunnableConfig } from "@langchain/langgraph";

import { hybridRetrieve } from "@/lib/retrieval/hybrid";
import { emitStreamEvent, withTiming } from "@/lib/langgraph/helpers";
import type { GraphState } from "@/lib/langgraph/state";
import type { QuerySourceMapping } from "@/lib/types/agent";

type RetrievedCandidate = Awaited<ReturnType<typeof hybridRetrieve>>[number];

function mergeCandidate(
  current: RetrievedCandidate | undefined,
  incoming: RetrievedCandidate,
  query: string
) {
  if (!current) {
    return {
      ...incoming,
      matchedQueries: [query]
    };
  }

  const matchedQueries = [...new Set([...current.matchedQueries, query])];

  if (incoming.combinedScore > current.combinedScore) {
    return {
      ...incoming,
      matchedQueries
    };
  }

  return {
    ...current,
    matchedQueries
  };
}

function buildQuerySourceMappings(
  perQueryCandidates: Array<{ query: string; candidates: RetrievedCandidate[] }>
): QuerySourceMapping[] {
  return perQueryCandidates.map(({ query, candidates }) => {
    const seen = new Set<number>();
    const sources: QuerySourceMapping["sources"] = [];

    for (const candidate of candidates) {
      const articleNumber = candidate.article.articleNumber;

      if (seen.has(articleNumber)) {
        continue;
      }

      seen.add(articleNumber);
      sources.push({
        articleNumber,
        title: candidate.article.title
      });

      if (sources.length >= 3) {
        break;
      }
    }

    return {
      query,
      sources
    };
  });
}

export async function retrieverNode(state: GraphState, config?: LangGraphRunnableConfig) {
  const startedAt = Date.now();
  emitStreamEvent(config, {
    event: "phase",
    data: { label: "Searching the corpus" }
  });

  const searchQueries =
    state.routeTaken === "simple_factual"
      ? [state.question]
      : state.searchQueries.length
        ? state.searchQueries
        : [state.question];

  const candidateMap = new Map<string, RetrievedCandidate>();
  const perQueryCandidates = await Promise.all(
    searchQueries.map(async (query) => ({
      query,
      candidates: await hybridRetrieve({
        query,
        focusArticleNumbers: state.focusArticleNumbers,
        limit: 10
      })
    }))
  );

  for (const { query, candidates } of perQueryCandidates) {
    for (const candidate of candidates) {
      candidateMap.set(
        candidate.id,
        mergeCandidate(candidateMap.get(candidate.id), candidate, query)
      );
    }
  }

  const retrievalCandidates: RetrievedCandidate[] = [];
  const selectedIds = new Set<string>();
  const articleCounts = new Map<number, number>();

  const addCandidate = (candidate: RetrievedCandidate, maxPerArticle: number) => {
    if (retrievalCandidates.length >= 10) {
      return false;
    }

    if (selectedIds.has(candidate.id)) {
      return false;
    }

    const articleNumber = candidate.article.articleNumber;
    const currentArticleCount = articleCounts.get(articleNumber) ?? 0;

    if (currentArticleCount >= maxPerArticle) {
      return false;
    }

    retrievalCandidates.push(candidate);
    selectedIds.add(candidate.id);
    articleCounts.set(articleNumber, currentArticleCount + 1);

    return true;
  };

  for (const { candidates } of perQueryCandidates) {
    let addedForQuery = 0;
    let topArticleNumber: number | null = null;
    let topScore = 0;

    for (const candidate of candidates) {
      const mergedCandidate = candidateMap.get(candidate.id) ?? candidate;
      const articleNumber = mergedCandidate.article.articleNumber;

      if (addedForQuery === 1 && topArticleNumber !== null && articleNumber === topArticleNumber) {
        const diverseAlternative = candidates.find((alternative) => {
          const mergedAlternative = candidateMap.get(alternative.id) ?? alternative;

          return (
            mergedAlternative.article.articleNumber !== topArticleNumber &&
            mergedAlternative.combinedScore >= topScore * 0.8 &&
            !selectedIds.has(mergedAlternative.id)
          );
        });

        if (diverseAlternative) {
          const mergedAlternative = candidateMap.get(diverseAlternative.id) ?? diverseAlternative;

          if (addCandidate(mergedAlternative, 3)) {
            addedForQuery += 1;
          }

          break;
        }
      }

      if (addCandidate(mergedCandidate, 3)) {
        if (addedForQuery === 0) {
          topArticleNumber = articleNumber;
          topScore = mergedCandidate.combinedScore;
        }
        addedForQuery += 1;
      }

      if (addedForQuery >= 2) {
        break;
      }
    }
  }

  for (const candidate of [...candidateMap.values()].sort((left, right) => right.combinedScore - left.combinedScore)) {
    const maxPerArticle = candidate.matchedQueries.length > 1 ? 3 : 2;

    addCandidate(candidate, maxPerArticle);

    if (retrievalCandidates.length >= 10) {
      break;
    }
  }

  return {
    searchQueries,
    querySourceMappings: buildQuerySourceMappings(perQueryCandidates),
    retrievalCandidates,
    ...withTiming(state, "retriever", startedAt)
  };
}
