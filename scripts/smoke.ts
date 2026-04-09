import { access } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

import { getAssignmentSummary, getCorpusDataset, getEvalDataset } from "@/lib/data/load-data";
import { loadChunkStore, loadManifest } from "@/lib/retrieval/store";

async function main() {
  const assignment = getAssignmentSummary();
  const corpus = getCorpusDataset();
  const evalSet = getEvalDataset();

  assert.equal(corpus.articleCount, 21, "Corpus should contain 21 articles.");
  assert.equal(evalSet.questionCount, 11, "Eval set should contain 11 questions.");
  assert.ok(
    assignment.bonusFeatures.includes("Critic agent"),
    "Assignment summary should capture bonus features."
  );

  const manifestPath = path.join(process.cwd(), "data", "ingest", "manifest.json");
  await access(manifestPath);

  const manifest = await loadManifest();
  const chunks = await loadChunkStore();

  assert.ok(manifest.articleCount >= 1, "Manifest should contain at least one indexed article.");
  assert.ok(chunks.length >= 1, "Chunk store should not be empty.");
  assert.ok(
    manifest.indexedArticles.some((article) => article.articleNumber === 21),
    "Article 21 must be present in the local index manifest."
  );

  console.log(
    JSON.stringify(
      {
        assignmentTitle: assignment.title,
        indexedArticles: manifest.articleCount,
        chunkCount: manifest.chunkCount,
        article21Present: true
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
