import { z } from "zod";

import { hasRuntimeSecrets } from "@/lib/config/env";
import { healthcareGraph } from "@/lib/langgraph/graph";
import { createInitialGraphState } from "@/lib/langgraph/state";
import { loadManifest } from "@/lib/retrieval/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const requestSchema = z.object({
  question: z.string().min(3),
  conversation: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string()
      })
    )
    .default([])
});

function sseEvent(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(request: Request) {
  const body = requestSchema.parse(await request.json());

  if (!hasRuntimeSecrets()) {
    return Response.json(
      {
        error:
          "Missing runtime configuration. Set GEMINI_API_KEY plus Pinecone (or another configured vector provider) before chatting."
      },
      { status: 400 }
    );
  }

  await loadManifest();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, payload: unknown) =>
        controller.enqueue(encoder.encode(sseEvent(event, payload)));

      try {
        send("ready", {
          route: "starting",
          timestamp: new Date().toISOString()
        });

        const finalState = (await healthcareGraph.invoke(createInitialGraphState(body) as never, {
          writer: (chunk: unknown) => {
            send("stream", chunk);
          }
        } as never)) as Record<string, any>;

        send("complete", finalState.finalResponse ?? finalState);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown server error";
        send("error", { message });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
