import type { CorpusArticle } from "@/lib/types/corpus";
import type { ArticleChunkRecord, IndexedArticleRecord } from "@/lib/types/agent";

import { countTerms, splitIntoChunks, summarizeExtractively, tokenize } from "@/lib/utils/text";

export function createIndexedArticle(
  article: CorpusArticle,
  text: string,
  extractionMethod: IndexedArticleRecord["extractionMethod"]
): IndexedArticleRecord {
  return {
    ...article,
    summary: summarizeExtractively(text, 3),
    extractionMethod,
    extractedTextLength: text.length,
    status: "indexed"
  };
}

export function createChunkRecords(article: IndexedArticleRecord, text: string): ArticleChunkRecord[] {
  const chunks = splitIntoChunks(text);

  return chunks.map((chunkText, chunkIndex) => {
    const embeddingInput = [
      `Article ${article.articleNumber}: ${article.title}`,
      `Cluster: ${article.cluster}`,
      `Summary: ${article.summary}`,
      chunkText
    ].join("\n");
    const tokens = tokenize(embeddingInput);

    return {
      id: `art-${String(article.articleNumber).padStart(2, "0")}-chunk-${String(chunkIndex).padStart(3, "0")}`,
      articleNumber: article.articleNumber,
      articleTitle: article.title,
      publication: article.publication,
      cluster: article.cluster,
      url: article.url,
      chunkIndex,
      text: chunkText,
      summary: article.summary,
      embeddingInput,
      sparseTerms: countTerms(tokens),
      wordCount: chunkText.split(/\s+/).filter(Boolean).length
    };
  });
}
