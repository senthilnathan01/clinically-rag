"use client";

import { ChevronRight, LoaderCircle, MessageSquareQuote, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { AgentAnswer, ChatMessage } from "@/lib/types/agent";
import { cn } from "@/lib/utils/cn";

interface WorkspaceProps {
  sampleQuestions: Array<{ id: string; prompt: string; difficulty: string }>;
}

interface PhaseEvent {
  phase: string;
  detail: string;
  status: string;
  node: string;
}

const defaultTrace = [
  "Query type",
  "Sub-question decomposition",
  "Retrieved articles and snippets",
  "Synthesis summary",
  "Critic verification"
];

export function Workspace({ sampleQuestions }: WorkspaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draftAnswer, setDraftAnswer] = useState("");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [phaseEvents, setPhaseEvents] = useState<PhaseEvent[]>([]);
  const [lastAnswer, setLastAnswer] = useState<AgentAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exampleChips = useMemo(() => sampleQuestions.slice(0, 6), [sampleQuestions]);

  async function askQuestion(question: string) {
    if (!question.trim()) return;

    const nextMessages = [...messages, { role: "user" as const, content: question }];
    setMessages(nextMessages);
    setInput("");
    setDraftAnswer("");
    setPhaseEvents([]);
    setLastAnswer(null);
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question,
          conversation: messages
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

          if (event === "stream" && payload.type === "phase") {
            setPhaseEvents((current) => [
              ...current.filter((entry) => entry.node !== payload.node),
              payload
            ]);
          }

          if (event === "stream" && payload.type === "answer_token") {
            setDraftAnswer((current) => `${current}${payload.text}`);
          }

          if (event === "stream" && payload.type === "final") {
            setLastAnswer(payload.payload as AgentAnswer);
          }

          if (event === "complete") {
            const final = payload as AgentAnswer;
            setLastAnswer(final);
            setDraftAnswer(final.answerMarkdown);
            setMessages((current) => [...current, { role: "assistant", content: final.answerMarkdown }]);
          }

          if (event === "error") {
            throw new Error(payload.message);
          }
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected chat error.");
    } finally {
      setIsLoading(false);
    }
  }

  const reasoningPhases = lastAnswer?.reasoningTrace.phases ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-primary px-4 py-3 text-center text-sm text-primary-foreground">
        Built for the Together Fund healthcare AI take-home
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <div>
            <div className="font-serif text-3xl tracking-tight text-primary sm:text-4xl">
              Clarity Care
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Agentic healthcare research assistant with live citation tracing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge>Next.js + LangGraph + Gemini</Badge>
            <ThemeToggle />
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <Card className="overflow-hidden bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(246,238,232,0.92))] dark:bg-[linear-gradient(145deg,rgba(25,21,33,0.96),rgba(19,18,26,0.94))]">
            <CardHeader className="space-y-5">
              <Badge className="w-fit bg-secondary/80">Healthcare AI evaluation-ready</Badge>
              <CardTitle className="max-w-3xl font-serif text-4xl leading-none text-balance sm:text-6xl">
                Grounded answers across 21 healthcare AI sources, with a visible reasoning trace.
              </CardTitle>
              <CardDescription className="max-w-2xl text-base leading-7">
                The system routes each question, retrieves evidence with hybrid search, reasons over
                article snippets, and surfaces critic checks before presenting the final answer.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {exampleChips.map((question) => (
                <button
                  key={question.id}
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-4 py-2 text-left text-sm transition hover:border-primary hover:text-primary"
                  onClick={() => {
                    setInput(question.prompt);
                  }}
                >
                  <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {question.id}
                  </span>
                  <span className="line-clamp-1 max-w-[20rem]">{question.prompt}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-[linear-gradient(160deg,rgba(255,245,241,0.95),rgba(255,255,255,0.92))] dark:bg-[linear-gradient(160deg,rgba(33,27,33,0.95),rgba(18,18,26,0.92))]">
            <CardHeader>
              <CardTitle className="font-serif text-3xl">Reviewer mode</CardTitle>
              <CardDescription>
                Structured trace output replaces raw scratchpad while keeping the full reasoning path inspectable.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              {defaultTrace.map((step) => (
                <div key={step} className="flex items-start gap-3 rounded-3xl border border-border/60 px-4 py-3">
                  <ChevronRight className="mt-0.5 size-4 text-primary" />
                  <span>{step}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="min-h-[720px]">
            <CardHeader className="border-b border-border/60">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquareQuote className="size-5 text-primary" />
                    Chat workspace
                  </CardTitle>
                  <CardDescription>
                    Ask ad-hoc questions or use the eval prompts directly.
                  </CardDescription>
                </div>
                <Badge className="bg-background/80">
                  {isLoading ? "Streaming response" : "Ready for a query"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="flex h-full flex-col gap-5 pt-6">
              <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                {messages.length === 0 && !draftAnswer ? (
                  <div className="rounded-[1.75rem] border border-dashed border-border/80 bg-secondary/35 px-6 py-8 text-sm text-muted-foreground">
                    The empty state is reviewer-friendly on purpose: select a sample question above, or ask about adoption, medical devices, ethics, drug discovery, or the live NPR article.
                  </div>
                ) : null}

                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={cn(
                      "rounded-[1.5rem] border px-5 py-4",
                      message.role === "user"
                        ? "ml-auto max-w-[85%] border-primary/20 bg-primary/10"
                        : "max-w-[92%] border-border/70 bg-secondary/35"
                    )}
                  >
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {message.role === "user" ? "You" : "Assistant"}
                    </div>
                    {message.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-serif prose-p:leading-7">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="leading-7">{message.content}</p>
                    )}
                  </div>
                ))}

                {draftAnswer && isLoading ? (
                  <div className="max-w-[92%] rounded-[1.5rem] border border-border/70 bg-secondary/35 px-5 py-4">
                    <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      <LoaderCircle className="size-3.5 animate-spin" />
                      Assistant
                    </div>
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-7">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{draftAnswer}</ReactMarkdown>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-3">
                <Textarea
                  placeholder="Ask a question about the corpus, then inspect the trace and sources as the answer streams in."
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      event.preventDefault();
                      void askQuestion(input);
                    }
                  }}
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Press <span className="font-medium text-foreground">Cmd/Ctrl + Enter</span> to send.
                  </p>
                  <Button onClick={() => void askQuestion(input)} disabled={isLoading || !input.trim()}>
                    {isLoading ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" />
                        Streaming
                      </>
                    ) : (
                      <>
                        Ask the agent
                        <Sparkles className="size-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {error ? (
                <div className="rounded-[1.5rem] border border-red-400/40 bg-red-500/10 px-5 py-4 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card>
              <CardHeader className="border-b border-border/60">
                <CardTitle className="flex items-center gap-2">
                  <Search className="size-4 text-primary" />
                  Reasoning trace
                </CardTitle>
                <CardDescription>
                  Safe, structured reviewer trace with phase-by-phase evidence handling.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {phaseEvents.length === 0 && reasoningPhases.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    The trace panel will populate with routing, retrieval, evidence, synthesis, and critic events.
                  </p>
                ) : null}

                {phaseEvents.map((phase) => (
                  <div key={phase.node} className="rounded-[1.5rem] border border-border/70 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{phase.phase}</span>
                      <Badge className="bg-background/80">{phase.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{phase.detail}</p>
                  </div>
                ))}

                {reasoningPhases.map((phase) => (
                  <details
                    key={phase.key}
                    className="rounded-[1.5rem] border border-border/70 px-4 py-3"
                    open
                  >
                    <summary className="cursor-pointer list-none text-sm font-medium">
                      {phase.label}
                    </summary>
                    <p className="mt-3 text-sm text-muted-foreground">{phase.summary}</p>
                    <ul className="mt-3 space-y-2 text-sm text-foreground">
                      {phase.details.map((detail) => (
                        <li key={detail} className="rounded-2xl bg-secondary/45 px-3 py-2">
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-border/60">
                <CardTitle>Source inspector</CardTitle>
                <CardDescription>
                  Retrieved article cards with rationale, metadata, and snippet-level evidence.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {lastAnswer?.retrievedSources.length ? (
                  lastAnswer.retrievedSources.map((source) => (
                    <div key={source.articleNumber} className="rounded-[1.5rem] border border-border/70 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-background/80">Art. {source.articleNumber}</Badge>
                        <Badge>{source.cluster}</Badge>
                      </div>
                      <h4 className="mt-3 font-medium leading-6">{source.title}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {source.publication} ·{" "}
                        <a className="underline decoration-border" href={source.url} target="_blank" rel="noreferrer">
                          open source
                        </a>
                      </p>
                      <p className="mt-3 text-sm text-muted-foreground">{source.rationale}</p>
                      <div className="mt-3 space-y-2">
                        {source.snippets.map((snippet) => (
                          <div
                            key={snippet}
                            className="rounded-2xl bg-secondary/45 px-3 py-3 text-sm leading-6"
                          >
                            {snippet}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Retrieved source cards appear here after the first answer is grounded.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
