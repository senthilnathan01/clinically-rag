import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import nextEnv from "@next/env";

import { getCorpusDataset } from "@/lib/data/load-data";
import { getServerEnv } from "@/lib/config/env";
import { embedTexts } from "@/lib/gemini/client";
import { createChunkRecords, createIndexedArticle } from "@/lib/ingest/chunk";
import { extractArticleFromHtml, extractPdfTextFromBuffer } from "@/lib/ingest/extractors";
import { fetchSource } from "@/lib/ingest/fetch-source";
import { getPineconeIndex } from "@/lib/retrieval/providers/pinecone";
import { clearChunkStoreCache } from "@/lib/retrieval/store";
import type { ArticleChunkRecord, IndexedArticleRecord, IngestionManifest } from "@/lib/types/agent";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

async function writeJson(fileName: string, value: unknown) {
  const outputPath = path.join(process.cwd(), "data", "ingest", fileName);
  await writeFile(outputPath, JSON.stringify(value, null, 2));
}

async function writeRawText(articleNumber: number, text: string) {
  const fileName = `article-${String(articleNumber).padStart(2, "0")}.txt`;
  await writeFile(path.join(process.cwd(), "data", "ingest", "raw", fileName), text);
}

async function readManualOverride(articleNumber: number) {
  const basePath = path.join(
    process.cwd(),
    "data",
    "overrides",
    `article-${String(articleNumber).padStart(2, "0")}.txt`
  );

  try {
    return await readFile(basePath, "utf8");
  } catch {
    return null;
  }
}

async function upsertChunksToPinecone(chunks: ArticleChunkRecord[]) {
  const env = getServerEnv();
  if (!env.PINECONE_API_KEY || !env.PINECONE_INDEX_NAME) return;

  const index = getPineconeIndex();
  const batchSize = 8;

  for (let cursor = 0; cursor < chunks.length; cursor += batchSize) {
    const batch = chunks.slice(cursor, cursor + batchSize);
    const vectors = await embedTexts(batch.map((chunk) => chunk.embeddingInput));

    await index.upsert({
      records: batch.map((chunk, indexInBatch) => ({
        id: chunk.id,
        values: vectors[indexInBatch],
        metadata: {
          articleNumber: chunk.articleNumber,
          articleTitle: chunk.articleTitle,
          publication: chunk.publication,
          cluster: chunk.cluster,
          url: chunk.url,
          chunkIndex: chunk.chunkIndex,
          summary: chunk.summary,
          text: chunk.text
        }
      }))
    });
  }
}

async function main() {
  const corpus = getCorpusDataset();

  await mkdir(path.join(process.cwd(), "data", "ingest", "raw"), { recursive: true });

  const indexedArticles: IndexedArticleRecord[] = [];
  const failedArticles: IngestionManifest["failedArticles"] = [];
  const chunks: ArticleChunkRecord[] = [];

  for (const article of corpus.articles) {
    console.log(`Fetching article ${article.articleNumber}: ${article.title}`);

    try {
      let extractionMethod: IndexedArticleRecord["extractionMethod"] = "html-fallback";
      let extractedText = "";
      const overrideText = await readManualOverride(article.articleNumber);

      if (overrideText) {
        extractionMethod = "manual-override";
        extractedText = overrideText;
      } else {
        const fetched = await fetchSource(article.url);

        if (fetched.contentType.includes("pdf") || article.url.endsWith(".pdf")) {
          extractionMethod = "pdf";
          extractedText = await extractPdfTextFromBuffer(fetched.buffer);
        } else {
          const extracted = extractArticleFromHtml(fetched.text, article.url);
          extractionMethod = extracted.method;
          extractedText = extracted.text;
        }
      }

      if (extractedText.length < 500) {
        throw new Error("Extracted article text was too short to index reliably.");
      }

      const indexedArticle = createIndexedArticle(article, extractedText, extractionMethod);
      const articleChunks = createChunkRecords(indexedArticle, extractedText);

      indexedArticles.push(indexedArticle);
      chunks.push(...articleChunks);
      await writeRawText(article.articleNumber, extractedText);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown ingestion error";
      failedArticles.push({
        articleNumber: article.articleNumber,
        title: article.title,
        url: article.url,
        error: message
      });
      console.error(`Failed article ${article.articleNumber}: ${message}`);
    }
  }

  const manifest: IngestionManifest = {
    generatedAt: new Date().toISOString(),
    articleCount: indexedArticles.length,
    chunkCount: chunks.length,
    indexedArticles,
    failedArticles
  };

  await Promise.all([
    writeJson("articles.json", indexedArticles),
    writeJson("chunks.json", chunks),
    writeJson("manifest.json", manifest)
  ]);

  clearChunkStoreCache();
  await upsertChunksToPinecone(chunks);

  const article21Present = indexedArticles.some((article) => article.articleNumber === 21);
  console.log(
    JSON.stringify(
      {
        indexedArticles: indexedArticles.length,
        failedArticles: failedArticles.length,
        chunkCount: chunks.length,
        article21Present
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
