import { z } from "zod";

const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().default("gemini-3.1-pro-preview"),
  GEMINI_TOOLS_MODEL: z.string().default("gemini-3.1-pro-preview-customtools"),
  GEMINI_EMBEDDING_MODEL: z.string().default("gemini-embedding-001"),
  PINECONE_API_KEY: z.string().min(1).optional(),
  PINECONE_INDEX_NAME: z.string().min(1).optional(),
  PINECONE_NAMESPACE: z.string().default("together-healthcare"),
  PINECONE_HOST: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  OPTIONAL_VECTOR_PROVIDER: z.enum(["pinecone", "chroma"]).default("pinecone"),
  CHROMA_URL: z.string().optional(),
  CHROMA_COLLECTION: z.string().default("together-healthcare"),
  ENABLE_DEBUG_TRACES: z.enum(["true", "false"]).default("false")
});

export type ServerEnv = z.infer<typeof envSchema>;

let cachedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;

  cachedEnv = envSchema.parse(process.env);
  return cachedEnv;
}

export function hasRuntimeSecrets() {
  const env = getServerEnv();

  return Boolean(env.GEMINI_API_KEY && (env.PINECONE_API_KEY || env.CHROMA_URL));
}
