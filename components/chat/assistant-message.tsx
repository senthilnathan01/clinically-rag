"use client";

import { Copy, FileText, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { AssistantArtifact, ChatTurn } from "@/lib/types/agent";

import { CitationInline } from "./citation-inline";
import { ReasoningTrace } from "./reasoning-trace";
import { SourceReveal } from "./source-reveal";

interface AssistantMessageProps {
  turn: ChatTurn;
}

export function AssistantMessage({ turn }: AssistantMessageProps) {
  const artifact = turn.artifact as AssistantArtifact | undefined;
  const [showReasoning, setShowReasoning] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [activeCitationId, setActiveCitationId] = useState<string | null>(null);
  const isAnswerComplete = turn.status === "complete";
  const isSourcesOpen = showSources || Boolean(activeCitationId);

  const visibleSourceDetails = useMemo(() => {
    if (!artifact?.sourceDetails?.length) return [];
    if (activeCitationId) {
      return artifact.sourceDetails.filter((detail) => detail.citationId === activeCitationId);
    }
    if (showSources) return artifact.sourceDetails;
    return [];
  }, [activeCitationId, artifact?.sourceDetails, showSources]);

  return (
    <div className="space-y-3">
      <div className="prose prose-sm max-w-none text-foreground dark:prose-invert prose-headings:font-serif prose-p:leading-8 prose-li:leading-7 prose-pre:rounded-3xl prose-pre:border prose-pre:border-border/70 prose-pre:bg-muted/60">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => {
              if (href?.startsWith("#citation:")) {
                const citationId = href.replace("#citation:", "");
                const anchor = artifact?.citationAnchors.find((item) => item.id === citationId);

                return (
                  <CitationInline
                    anchor={anchor}
                    active={activeCitationId === citationId}
                    fallbackLabel={String(children)}
                    onClick={() => {
                      setActiveCitationId((current) => (current === citationId ? null : citationId));
                      setShowSources(true);
                    }}
                  />
                );
              }

              return (
                <a href={href} target="_blank" rel="noreferrer">
                  {children}
                </a>
              );
            }
          }}
        >
          {turn.content}
        </ReactMarkdown>
      </div>

      {isAnswerComplete ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={showReasoning}
            className={cn(
              "rounded-full border border-transparent",
              showReasoning &&
                "border-border/70 bg-foreground/8 text-foreground shadow-sm hover:bg-foreground/10 dark:border-border dark:bg-foreground/10 dark:hover:bg-foreground/14"
            )}
            onClick={() => setShowReasoning((current) => !current)}
          >
            <Sparkles className="size-3.5" />
            View reasoning
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={isSourcesOpen}
            className={cn(
              "rounded-full border border-transparent",
              isSourcesOpen &&
                "border-border/70 bg-foreground/8 text-foreground shadow-sm hover:bg-foreground/10 dark:border-border dark:bg-foreground/10 dark:hover:bg-foreground/14"
            )}
            onClick={() => {
              setShowSources((current) => !current);
              if (showSources) {
                setActiveCitationId(null);
              }
            }}
          >
            <FileText className="size-3.5" />
            Sources
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={async () => {
              await navigator.clipboard.writeText(turn.content);
            }}
          >
            <Copy className="size-3.5" />
            Copy
          </Button>
        </div>
      ) : null}

      {isAnswerComplete && showReasoning && artifact?.reasoningTrace ? (
        <ReasoningTrace trace={artifact.reasoningTrace} />
      ) : null}
      {isAnswerComplete && isSourcesOpen ? <SourceReveal details={visibleSourceDetails} /> : null}
      {turn.status === "error" && turn.error ? (
        <div className="rounded-3xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          {turn.error}
        </div>
      ) : null}
    </div>
  );
}
