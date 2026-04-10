import { GoogleGenAI, type GenerateContentResponse, type GoogleGenAIOptions } from "@google/genai";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { ZodSchema } from "zod";

import { getServerEnv } from "@/lib/config/env";

let cachedClient: GoogleGenAI | null = null;

export class StructuredOutputError extends Error {
  rawText: string;
  cause: unknown;

  constructor(message: string, rawText: string, cause: unknown) {
    super(message);
    this.name = "StructuredOutputError";
    this.rawText = rawText;
    this.cause = cause;
  }
}

function parseCredentialsJson(
  rawCredentials: string
): NonNullable<GoogleGenAIOptions["googleAuthOptions"]>["credentials"] {
  try {
    const parsed = JSON.parse(rawCredentials) as Record<string, unknown>;

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Parsed credentials were not an object.");
    }

    return parsed as NonNullable<GoogleGenAIOptions["googleAuthOptions"]>["credentials"];
  } catch (error) {
    throw new Error(
      `GOOGLE_CLOUD_CREDENTIALS_JSON must be valid Google Cloud credentials JSON. ${
        error instanceof Error ? error.message : ""
      }`.trim()
    );
  }
}

export function getVertexClient() {
  if (cachedClient) return cachedClient;

  const env = getServerEnv();
  const clientOptions: GoogleGenAIOptions = {
    vertexai: true
  };

  if (env.GOOGLE_API_KEY) {
    clientOptions.apiKey = env.GOOGLE_API_KEY;
  } else if (env.GOOGLE_CLOUD_CREDENTIALS_JSON) {
    if (!env.GOOGLE_CLOUD_PROJECT) {
      throw new Error(
        "GOOGLE_CLOUD_PROJECT is required when GOOGLE_CLOUD_CREDENTIALS_JSON is set."
      );
    }

    clientOptions.project = env.GOOGLE_CLOUD_PROJECT;
    clientOptions.location = env.GOOGLE_CLOUD_LOCATION;
    clientOptions.googleAuthOptions = {
      credentials: parseCredentialsJson(env.GOOGLE_CLOUD_CREDENTIALS_JSON)
    };
  } else {
    if (!env.GOOGLE_CLOUD_PROJECT) {
      throw new Error(
        "Set GOOGLE_API_KEY for Vertex AI express mode, or GOOGLE_CLOUD_PROJECT for standard Vertex AI auth."
      );
    }

    clientOptions.project = env.GOOGLE_CLOUD_PROJECT;
    clientOptions.location = env.GOOGLE_CLOUD_LOCATION;
  }

  cachedClient = new GoogleGenAI(clientOptions);
  return cachedClient;
}

export async function generateObject<T>({
  model,
  prompt,
  schema
}: {
  model: string;
  prompt: string;
  schema: ZodSchema<T>;
}) {
  const result = await generateObjectWithRaw({
    model,
    prompt,
    schema
  });

  return result.object;
}

export async function generateObjectWithRaw<T>({
  model,
  prompt,
  schema
}: {
  model: string;
  prompt: string;
  schema: ZodSchema<T>;
}) {
  const client = getVertexClient();
  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseJsonSchema: zodToJsonSchema(schema as never, { target: "jsonSchema7" })
    }
  });

  const rawText = response.text ?? "{}";

  try {
    return {
      object: schema.parse(JSON.parse(rawText)),
      rawText
    };
  } catch (error) {
    throw new StructuredOutputError("Structured output parsing failed.", rawText, error);
  }
}

export async function generateText({
  model,
  prompt,
  temperature = 0.2
}: {
  model: string;
  prompt: string;
  temperature?: number;
}) {
  const client = getVertexClient();
  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature
    }
  });

  return response.text ?? "";
}

export async function streamText({
  model,
  prompt,
  temperature = 0.2,
  onChunk
}: {
  model: string;
  prompt: string;
  temperature?: number;
  onChunk?: (chunk: GenerateContentResponse) => void;
}) {
  const client = getVertexClient();
  const stream = await client.models.generateContentStream({
    model,
    contents: prompt,
    config: {
      temperature
    }
  });

  let text = "";

  for await (const chunk of stream) {
    const partial = chunk.text ?? "";
    if (partial) {
      text += partial;
    }
    onChunk?.(chunk);
  }

  return text;
}

export async function embedTexts(texts: string[], model?: string) {
  const env = getServerEnv();
  const client = getVertexClient();
  const targetModel = model ?? env.GEMINI_EMBEDDING_MODEL;
  const vectors: number[][] = [];

  for (const text of texts) {
    const response = await client.models.embedContent({
      model: targetModel,
      contents: text
    });
    vectors.push(response.embeddings?.[0]?.values ?? []);
  }

  return vectors;
}
