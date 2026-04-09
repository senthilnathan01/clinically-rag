import type { CorpusArticle, CorpusCluster, CorpusDataset } from "@/lib/types/corpus";

import { extractPdfText, normalizeWhitespace } from "@/lib/corpus/pdf";

const CLUSTER_MAP: Array<{ marker: string; cluster: CorpusCluster }> = [
  { marker: "MARKET & ADOPTION", cluster: "Market & Adoption" },
  { marker: "CLINICAL AI", cluster: "Clinical AI" },
  { marker: "DRUG DISCOVERY", cluster: "Drug Discovery" },
  { marker: "REGULATION & BIAS", cluster: "Regulation & Ethics" },
  { marker: "LIVE — INDEXED TODAY", cluster: "Live" }
];

function inferCluster(articleNumber: number): CorpusCluster {
  if (articleNumber <= 6) return "Market & Adoption";
  if (articleNumber <= 10) return "Clinical AI";
  if (articleNumber <= 14) return "Drug Discovery";
  if (articleNumber <= 20) return "Regulation & Ethics";
  return "Live";
}

function extractQuestionRefs(line: string) {
  return [...line.matchAll(/Q\d{2}/g)].map((match) => match[0]);
}

export async function parseCorpusPdf(filePath = "healthcare_ai_corpus_v2.pdf"): Promise<CorpusDataset> {
  const rawText = normalizeWhitespace(await extractPdfText(filePath));
  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const articles: CorpusArticle[] = [];
  let currentCluster: CorpusCluster = "Market & Adoption";

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const clusterMatch = CLUSTER_MAP.find(({ marker }) => marker === line);

    if (clusterMatch) {
      currentCluster = clusterMatch.cluster;
      continue;
    }

    if (!/^\d{2}$/.test(line)) continue;

    const articleNumber = Number(line);
    const badge = lines[index + 1] ?? "";
    const title = lines[index + 2] ?? "";
    const metaLine = lines[index + 3] ?? "";
    const url = lines[index + 4] ?? "";

    if (!title || !url.startsWith("http")) continue;

    const metaParts = metaLine.split("·").map((part) => part.trim());
    const publication = metaParts[0] ?? "Unknown";
    const date = metaParts[1] ?? "Unknown";
    const questionRefs = extractQuestionRefs(metaLine);

    articles.push({
      articleNumber,
      badge,
      title,
      publication,
      date,
      cluster: currentCluster ?? inferCluster(articleNumber),
      url,
      questionRefs,
      isLive: articleNumber === 21
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    articleCount: articles.length,
    articles
  };
}
