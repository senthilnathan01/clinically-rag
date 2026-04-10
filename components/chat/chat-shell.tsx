"use client";

import { ArrowUpRight, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

import { Composer } from "./composer";
import { MessageList } from "./message-list";
import { useChatSession } from "./use-chat-session";

interface ChatShellProps {
  sampleQuestions: Array<{ id: string; prompt: string }>;
}

export function ChatShell({ sampleQuestions }: ChatShellProps) {
  const {
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
  } = useChatSession();
  const [promptIndex, setPromptIndex] = useState(0);

  const promptPills = useMemo(() => sampleQuestions.slice(0, 5), [sampleQuestions]);

  const nextPrompt = () => {
    const question = sampleQuestions[promptIndex % sampleQuestions.length];
    setInput(question.prompt);
    setPromptIndex((current) => (current + 1) % sampleQuestions.length);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-transparent bg-background/92 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="text-sm font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Clinically Rag
          </div>
          <div className="flex items-center gap-2">
            {started ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full"
                onClick={resetConversation}
              >
                <RotateCcw className="size-3.5" />
                New chat
              </Button>
            ) : null}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 sm:px-6">
        <div
          className={cn(
            "flex flex-1 flex-col transition-all duration-500",
            started ? "pt-8" : "justify-center pb-24"
          )}
        >
          {started ? (
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
              <MessageList turns={turns} draftTurn={draftTurn} phaseLabel={phaseLabel} />
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-2xl flex-col items-center">
              <div className="mb-6 text-center text-sm text-muted-foreground">
                Ask a question and inspect the reasoning traces when you want it.
              </div>
            </div>
          )}

          <div
            className={cn(
              "mx-auto w-full max-w-3xl transition-all duration-500",
              started
                ? "sticky bottom-0 mt-auto bg-gradient-to-t from-background via-background pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4"
                : ""
            )}
          >
            <Composer
              value={input}
              onChange={setInput}
              onSubmit={() => void submitQuestion(input)}
              onUseEvalPrompt={nextPrompt}
              disabled={isStreaming || !input.trim()}
              isStreaming={isStreaming}
              docked={started}
              showPromptControl
            />

            <div
              className={cn(
                "mt-3 flex gap-2",
                started ? "flex-wrap justify-start" : "flex-wrap justify-center"
              )}
            >
              {promptPills.map((question) => (
                <button
                  key={question.id}
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-panel/70 px-3 py-2 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                  onClick={() => setInput(question.prompt)}
                >
                  <span>{question.id}</span>
                  <ArrowUpRight className="size-3.5 text-primary" />
                </button>
              ))}
            </div>

            {error && !draftTurn ? (
              <div className="mt-4 rounded-3xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </main>

      <footer className="px-4 pb-6 text-center text-xs text-muted-foreground sm:px-6">
        Built by Senthilnathan T, IIT Madras
      </footer>
    </div>
  );
}
