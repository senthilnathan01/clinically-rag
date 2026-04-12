"use client";

import { useState } from "react";

import type { AssistantArtifact, ChatTurn } from "@/lib/types/agent";

function createTurn(partial: Partial<ChatTurn> & Pick<ChatTurn, "role" | "content" | "status">): ChatTurn {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...partial
  } as ChatTurn;
}

function mergeArtifact(
  current: Partial<AssistantArtifact> | undefined,
  patch: Partial<AssistantArtifact>
): Partial<AssistantArtifact> {
  return {
    ...current,
    ...patch,
    intent: patch.intent ?? current?.intent,
    citationAnchors: patch.citationAnchors ?? current?.citationAnchors ?? [],
    sourceDetails: patch.sourceDetails ?? current?.sourceDetails ?? [],
    criticSummary: patch.criticSummary ?? current?.criticSummary,
    reasoningTrace: patch.reasoningTrace
      ? {
          routeTaken: patch.reasoningTrace.routeTaken ?? current?.reasoningTrace?.routeTaken ?? "multi_hop",
          routeRationale:
            patch.reasoningTrace.routeRationale ?? current?.reasoningTrace?.routeRationale ?? "",
          subQuestions: patch.reasoningTrace.subQuestions ?? current?.reasoningTrace?.subQuestions ?? [],
          querySourceMappings:
            patch.reasoningTrace.querySourceMappings ??
            current?.reasoningTrace?.querySourceMappings ?? [],
          retrievedSources:
            patch.reasoningTrace.retrievedSources ?? current?.reasoningTrace?.retrievedSources ?? [],
          evidenceSnippets:
            patch.reasoningTrace.evidenceSnippets ?? current?.reasoningTrace?.evidenceSnippets ?? [],
          synthesisSummary:
            patch.reasoningTrace.synthesisSummary ?? current?.reasoningTrace?.synthesisSummary ?? "",
          criticSummary:
            patch.reasoningTrace.criticSummary ??
            current?.reasoningTrace?.criticSummary ?? {
              overall: "weak",
              summary: "",
              checks: []
            }
        }
      : current?.reasoningTrace
  };
}

export function useChatSession() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draftTurn, setDraftTurn] = useState<ChatTurn | null>(null);
  const [input, setInput] = useState("");
  const [phaseLabel, setPhaseLabel] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const started = turns.length > 0 || draftTurn !== null;

  async function submitQuestion(question: string) {
    if (!question.trim() || isStreaming) return;

    const userTurn = createTurn({
      role: "user",
      content: question.trim(),
      status: "complete"
    });
    const assistantId = crypto.randomUUID();
    const conversation = turns
      .filter((turn) => turn.content.trim().length > 0)
      .map((turn) => ({ role: turn.role, content: turn.content }));

    setTurns((current) => [...current, userTurn]);
    setDraftTurn({
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      status: "streaming"
    });
    setInput("");
    setPhaseLabel("Preparing sources");
    setIsStreaming(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question,
          conversation
        })
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "The chat request failed.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const eventLine = part.split("\n").find((line) => line.startsWith("event: "));
          const dataLine = part.split("\n").find((line) => line.startsWith("data: "));
          if (!eventLine || !dataLine) continue;

          const event = eventLine.replace("event: ", "").trim();
          const payload = JSON.parse(dataLine.replace("data: ", ""));

          if (event === "phase") {
            setPhaseLabel(payload.label);
          }

          if (event === "token") {
            setDraftTurn((current) =>
              current
                ? {
                    ...current,
                    content: `${current.content}${payload.text}`
                  }
                : current
            );
          }

          if (event === "artifact") {
            setDraftTurn((current) =>
              current
                ? {
                    ...current,
                    artifact: mergeArtifact(current.artifact, payload)
                  }
                : current
            );
          }

          if (event === "complete") {
            const artifact = payload as AssistantArtifact;
            const finalTurn: ChatTurn = {
              id: assistantId,
              role: "assistant",
              content: artifact.answerMarkdown,
              createdAt: new Date().toISOString(),
              status: "complete",
              artifact
            };
            setTurns((current) => [...current, finalTurn]);
            setDraftTurn(null);
            setPhaseLabel(null);
          }

          if (event === "error") {
            throw new Error(payload.message);
          }
        }
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unexpected chat error.";
      setError(message);
      setPhaseLabel(null);
      setDraftTurn((current) =>
        current
          ? {
              ...current,
              status: "error",
              error: message
            }
          : null
      );
    } finally {
      setIsStreaming(false);
    }
  }

  function resetConversation() {
    setTurns([]);
    setDraftTurn(null);
    setInput("");
    setPhaseLabel(null);
    setIsStreaming(false);
    setError(null);
  }

  return {
    turns,
    draftTurn,
    input,
    setInput,
    phaseLabel,
    isStreaming,
    error,
    started,
    submitQuestion,
    resetConversation
  };
}
