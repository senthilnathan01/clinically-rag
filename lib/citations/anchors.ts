import type {
  CitationAnchor,
  RetrievedSourceSummary,
  SourceDetail
} from "@/lib/types/agent";

const CITATION_PATTERN = /\[Art\.\s*(\d{1,2})\s*·\s*([^\]]+)\]/g;

function selectSourceDetail(
  articleNumber: number,
  sourceTemplates: RetrievedSourceSummary[],
  sourceDetails: SourceDetail[]
) {
  const matchingDetail = sourceDetails.find((detail) => detail.articleNumber === articleNumber);
  if (matchingDetail) {
    return matchingDetail;
  }

  const matchingSource = sourceTemplates.find((source) => source.articleNumber === articleNumber);
  if (!matchingSource) return null;

  return {
    citationId: "",
    articleNumber: matchingSource.articleNumber,
    title: matchingSource.title,
    publication: matchingSource.publication,
    url: matchingSource.url,
    rationale: matchingSource.rationale,
    snippet: "",
    chunkId: matchingSource.chunkId,
    chunkIndex: matchingSource.chunkIndex
  } satisfies SourceDetail;
}

export function attachCitationAnchors({
  answerMarkdown,
  sourceTemplates,
  sourceDetails
}: {
  answerMarkdown: string;
  sourceTemplates: RetrievedSourceSummary[];
  sourceDetails: SourceDetail[];
}) {
  const citationAnchors: CitationAnchor[] = [];
  const anchoredSourceDetails: SourceDetail[] = [];
  let anchorIndex = 0;

  const answerMarkdownWithLinks = answerMarkdown.replace(
    CITATION_PATTERN,
    (match, articleNumberRaw, title, offset) => {
      const articleNumber = Number(articleNumberRaw);
      const anchorId = `citation-${articleNumber}-${anchorIndex}`;
      anchorIndex += 1;
      const detail = selectSourceDetail(articleNumber, sourceTemplates, sourceDetails);

      citationAnchors.push({
        id: anchorId,
        label: match.slice(1, -1),
        articleNumber,
        title,
        publication: detail?.publication ?? "Unknown",
        url: detail?.url ?? "",
        snippet: detail?.snippet ?? "",
        startOffset: offset,
        endOffset: offset + match.length,
        chunkId: detail?.chunkId ?? ""
      });

      if (detail) {
        anchoredSourceDetails.push({
          ...detail,
          citationId: anchorId
        });
      }

      return `[${match.slice(1, -1)}](#citation:${anchorId})`;
    }
  );

  return {
    answerMarkdown: answerMarkdownWithLinks,
    citationAnchors,
    sourceDetails: anchoredSourceDetails
  };
}
