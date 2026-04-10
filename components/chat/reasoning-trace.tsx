import type { ReasoningTrace } from "@/lib/types/agent";

import { Badge } from "@/components/ui/badge";

interface ReasoningTraceProps {
  trace: ReasoningTrace;
}

export function ReasoningTrace({ trace }: ReasoningTraceProps) {
  return (
    <div className="space-y-4 rounded-[1.75rem] border border-border/70 bg-muted/25 px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{trace.routeTaken.replace("_", " ")}</Badge>
        <span className="text-sm text-muted-foreground">{trace.routeRationale}</span>
      </div>

      {trace.subQuestions.length ? (
        <section className="space-y-2">
          <h4 className="text-sm font-medium">Sub-questions</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {trace.subQuestions.map((question) => (
              <li key={question} className="rounded-2xl bg-background/70 px-3 py-2">
                {question}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {trace.retrievedSources.length ? (
        <section className="space-y-2">
          <h4 className="text-sm font-medium">Retrieved sources</h4>
          <div className="space-y-2">
            {trace.retrievedSources.map((source) => (
              <div key={source.chunkId} className="rounded-2xl bg-background/70 px-3 py-2 text-sm">
                <div className="font-medium">
                  Art. {source.articleNumber} · {source.title}
                </div>
                <div className="mt-1 text-muted-foreground">{source.rationale}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {trace.evidenceSnippets.length ? (
        <section className="space-y-2">
          <h4 className="text-sm font-medium">Evidence snippets</h4>
          <div className="space-y-2">
            {trace.evidenceSnippets.map((snippet) => (
              <div key={snippet.chunkId} className="rounded-2xl bg-background/70 px-3 py-2 text-sm">
                <div className="font-medium">
                  Art. {snippet.articleNumber} · {snippet.title}
                </div>
                <div className="mt-1 text-muted-foreground">{snippet.snippet}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <h4 className="text-sm font-medium">Synthesis summary</h4>
        <p className="text-sm text-muted-foreground">{trace.synthesisSummary}</p>
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-medium">Critic summary</h4>
        <p className="text-sm text-muted-foreground">{trace.criticSummary.summary}</p>
        {trace.criticSummary.checks.length ? (
          <div className="space-y-2">
            {trace.criticSummary.checks.map((check) => (
              <div key={`${check.claim}-${check.status}`} className="rounded-2xl bg-background/70 px-3 py-2 text-sm">
                <div className="font-medium capitalize">{check.status}</div>
                <div className="mt-1 text-muted-foreground">{check.claim}</div>
                {check.citationNumbers.length ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Citations: {check.citationNumbers.map((value) => `Art. ${value}`).join(", ")}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
