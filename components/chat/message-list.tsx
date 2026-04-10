"use client";

import { useEffect, useRef } from "react";

import type { ChatTurn } from "@/lib/types/agent";

import { AssistantMessage } from "./assistant-message";
import { StatusLine } from "./status-line";
import { UserMessage } from "./user-message";

interface MessageListProps {
  turns: ChatTurn[];
  draftTurn: ChatTurn | null;
  phaseLabel: string | null;
}

export function MessageList({ turns, draftTurn, phaseLabel }: MessageListProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const lastTurn = turns.at(-1);
  const latestUserTurn = draftTurn && lastTurn?.role === "user" ? lastTurn : null;
  const settledTurns = latestUserTurn ? turns.slice(0, -1) : turns;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const distanceFromBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;

    if (distanceFromBottom < 160) {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [turns, draftTurn?.content, draftTurn?.artifact, draftTurn?.status]);

  return (
    <div ref={viewportRef} className="flex-1 overflow-y-auto pb-6">
      <div className="space-y-8">
        {settledTurns.map((turn) =>
          turn.role === "user" ? (
            <UserMessage key={turn.id} turn={turn} />
          ) : (
            <AssistantMessage key={turn.id} turn={turn} />
          )
        )}

        {latestUserTurn && draftTurn ? (
          <div className="space-y-3">
            <UserMessage turn={latestUserTurn} />
            <StatusLine label={phaseLabel} className="pl-1" />
            <AssistantMessage turn={draftTurn!} />
          </div>
        ) : draftTurn ? (
          <AssistantMessage turn={draftTurn} />
        ) : null}
      </div>
    </div>
  );
}
