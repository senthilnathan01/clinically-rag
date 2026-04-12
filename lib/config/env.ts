import { z } from "zod";

function emptyStringToUndefined(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

function optionalString() {
  return z.preprocess(emptyStringToUndefined, z.string().min(1).optional());
}

function defaultString(value: string) {
  return z.preprocess(emptyStringToUndefined, z.string().default(value));
}

const envSchema = z.object({
  GOOGLE_API_KEY: optionalString(),
  GOOGLE_CLOUD_PROJECT: optionalString(),
  GOOGLE_CLOUD_LOCATION: defaultString("global"),
  GOOGLE_CLOUD_CREDENTIALS_JSON: optionalString(),
  GEMINI_MODEL: defaultString("gemini-3.1-pro-preview"),
  GEMINI_TOOLS_MODEL: defaultString("gemini-3.1-pro-preview"),
  GEMINI_EMBEDDING_MODEL: defaultString("gemini-embedding-001"),
  PINECONE_API_KEY: optionalString(),
  PINECONE_INDEX_NAME: optionalString(),
  PINECONE_NAMESPACE: defaultString("together-healthcare"),
  PINECONE_HOST: optionalString(),
  NEXT_PUBLIC_APP_URL: defaultString("http://localhost:3000"),
  OPTIONAL_VECTOR_PROVIDER: z.enum(["pinecone", "chroma"]).default("pinecone"),
  CHROMA_URL: optionalString(),
  CHROMA_COLLECTION: defaultString("together-healthcare"),
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

  return Boolean((env.GOOGLE_API_KEY || env.GOOGLE_CLOUD_PROJECT) && (env.PINECONE_API_KEY || env.CHROMA_URL));
}
