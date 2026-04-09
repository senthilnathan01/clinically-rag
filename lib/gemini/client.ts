import { GoogleGenAI, type GenerateContentResponse } from "@google/genai";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { ZodSchema } from "zod";

import { getServerEnv } from "@/lib/config/env";

let cachedClient: GoogleGenAI | null = null;

export function getGeminiClient() {
  if (cachedClient) return cachedClient;

  const env = getServerEnv();

  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is required to run the agent.");
  }

  cachedClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
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
  const client = getGeminiClient();
  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseJsonSchema: zodToJsonSchema(schema as never, { target: "jsonSchema7" })
    }
  });

  const parsed = schema.parse(JSON.parse(response.text ?? "{}"));
  return parsed;
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
  const client = getGeminiClient();
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
  const client = getGeminiClient();
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
  const client = getGeminiClient();
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
