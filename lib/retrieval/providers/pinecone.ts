import { Pinecone, type Index } from "@pinecone-database/pinecone";

import { getServerEnv } from "@/lib/config/env";

interface PineconeMetadata {
  [key: string]: string | number | boolean | string[];
  articleNumber: number;
  articleTitle: string;
  publication: string;
  cluster: string;
  url: string;
  chunkIndex: number;
  summary: string;
  text: string;
}

let cachedIndex: Index<PineconeMetadata> | null = null;

export function getPineconeIndex() {
  if (cachedIndex) return cachedIndex;

  const env = getServerEnv();
  if (!env.PINECONE_API_KEY || !env.PINECONE_INDEX_NAME) {
    throw new Error("Pinecone is not configured. Set PINECONE_API_KEY and PINECONE_INDEX_NAME.");
  }

  const client = new Pinecone({ apiKey: env.PINECONE_API_KEY });
  cachedIndex = client.index<PineconeMetadata>({
    name: env.PINECONE_INDEX_NAME,
    host: env.PINECONE_HOST,
    namespace: env.PINECONE_NAMESPACE
  });

  return cachedIndex;
}
