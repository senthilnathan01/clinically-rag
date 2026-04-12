import type {
  CitationAnchor,
  RetrievedSourceSummary,
  SourceDetail
} from "@/lib/types/agent";
import { normalizeText, scoreTokenOverlap } from "@/lib/utils/text";

export const CITATION_PATTERN = /\[Art\.\s*(\d{1,2})\s*·\s*([^\]]+)\]/g;
const LOOSE_CITATION_PATTERN = /\[(?:Article|Art(?:icle)?\.?)\s*(\d{1,2})(?:\s*[·:-]\s*([^\]]+))?\]/gi;

function buildCitationLabel(
  articleNumber: number,
  sourceTemplates: RetrievedSourceSummary[],
  sourceDetails: SourceDetail[]
) {
  const detail = sourceDetails.find((entry) => entry.articleNumber === articleNumber);
  if (detail) {
    return `Art. ${articleNumber} · ${detail.title}`;
  }

  const template = sourceTemplates.find((entry) => entry.articleNumber === articleNumber);
  if (template) {
    return `Art. ${articleNumber} · ${template.title}`;
  }

  return null;
}

function buildFallbackDetail(source: RetrievedSourceSummary): SourceDetail {
  return {
    citationId: "",
    articleNumber: source.articleNumber,
    title: source.title,
    publication: source.publication,
    url: source.url,
    rationale: source.rationale,
    snippet: "",
    verificationText: "",
    chunkId: source.chunkId,
    chunkIndex: source.chunkIndex
  };
}

function findCitationContext(answerMarkdown: string, offset: number) {
  const sentenceStart = Math.max(
    answerMarkdown.lastIndexOf("\n", offset),
    answerMarkdown.lastIndexOf(". ", offset),
    answerMarkdown.lastIndexOf("! ", offset),
    answerMarkdown.lastIndexOf("? ", offset)
  );
  const nextBreakCandidates = [
    answerMarkdown.indexOf("\n", offset),
    answerMarkdown.indexOf(". ", offset),
    answerMarkdown.indexOf("! ", offset),
    answerMarkdown.indexOf("? ", offset)
  ].filter((value) => value >= 0);
  const sentenceEnd =
    nextBreakCandidates.length > 0 ? Math.min(...nextBreakCandidates) : answerMarkdown.length;

  return answerMarkdown.slice(Math.max(0, sentenceStart + 1), sentenceEnd).trim();
}

function normalizeLooseCitations(
  answerMarkdown: string,
  sourceTemplates: RetrievedSourceSummary[],
  sourceDetails: SourceDetail[]
) {
  return answerMarkdown.replace(LOOSE_CITATION_PATTERN, (_, articleNumberRaw) => {
    const articleNumber = Number(articleNumberRaw);

    return `[${buildCitationLabel(articleNumber, sourceTemplates, sourceDetails) ?? `Art. ${articleNumber}`}]`;
  });
}

function stripUnsupportedCitations(
  answerMarkdown: string,
  sourceTemplates: RetrievedSourceSummary[],
  sourceDetails: SourceDetail[]
) {
  const supportedArticleNumbers = new Set([
    ...sourceTemplates.map((source) => source.articleNumber),
    ...sourceDetails.map((detail) => detail.articleNumber)
  ]);

  return answerMarkdown.replace(CITATION_PATTERN, (match, articleNumberRaw) => {
    const articleNumber = Number(articleNumberRaw);

    return supportedArticleNumbers.has(articleNumber) ? match : "";
  });
}

export function prepareAnswerCitations(
  answerMarkdown: string,
  sourceTemplates: RetrievedSourceSummary[],
  sourceDetails: SourceDetail[]
) {
  return normalizeText(
    stripUnsupportedCitations(
      normalizeLooseCitations(answerMarkdown, sourceTemplates, sourceDetails),
      sourceTemplates,
      sourceDetails
    )
  );
}

export function selectSourceDetailForContext({
  articleNumber,
  contextText,
  sourceTemplates,
  sourceDetails
}: {
  articleNumber: number;
  contextText: string;
  sourceTemplates: RetrievedSourceSummary[];
  sourceDetails: SourceDetail[];
}) {
  const normalizedContext = normalizeText(contextText);
  const matchingDetails = sourceDetails.filter((detail) => detail.articleNumber === articleNumber);

  if (matchingDetails.length) {
    if (matchingDetails.length === 1) {
      return matchingDetails[0];
    }

    return matchingDetails
      .map((detail) => ({
        detail,
        score: scoreTokenOverlap(
          normalizedContext,
          `${detail.title} ${detail.verificationText || detail.snippet}`
        )
      }))
      .sort((left, right) => right.score - left.score)[0]?.detail;
  }

  const matchingSource = sourceTemplates.find((source) => source.articleNumber === articleNumber);
  if (!matchingSource) return null;

  return buildFallbackDetail(matchingSource);
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
  const normalizedAnswerMarkdown = prepareAnswerCitations(
    answerMarkdown,
    sourceTemplates,
    sourceDetails
  );
  const citationAnchors: CitationAnchor[] = [];
  const anchoredSourceDetails: SourceDetail[] = [];
  let anchorIndex = 0;

  const answerMarkdownWithLinks = normalizedAnswerMarkdown.replace(
    CITATION_PATTERN,
    (match, articleNumberRaw, title, offset) => {
      const articleNumber = Number(articleNumberRaw);
      const anchorId = `citation-${articleNumber}-${anchorIndex}`;
      anchorIndex += 1;
      const detail = selectSourceDetailForContext({
        articleNumber,
        contextText: findCitationContext(normalizedAnswerMarkdown, offset),
        sourceTemplates,
        sourceDetails
      });

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
