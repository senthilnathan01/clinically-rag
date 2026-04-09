import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ArticleChunkRecord, IngestionManifest } from "@/lib/types/agent";

let cachedChunks: ArticleChunkRecord[] | null = null;
let cachedManifest: IngestionManifest | null = null;

async function readJson<T>(fileName: string) {
  const resolvedPath = path.join(process.cwd(), "data", "ingest", fileName);
  const raw = await readFile(resolvedPath, "utf8");
  return JSON.parse(raw) as T;
}

export async function loadChunkStore() {
  if (!cachedChunks) {
    cachedChunks = await readJson<ArticleChunkRecord[]>("chunks.json");
  }

  return cachedChunks;
}

export async function loadManifest() {
  if (!cachedManifest) {
    cachedManifest = await readJson<IngestionManifest>("manifest.json");
  }

  return cachedManifest;
}

export function clearChunkStoreCache() {
  cachedChunks = null;
  cachedManifest = null;
}
