import type { CriticCheck, ReasoningTrace as ReasoningTraceData } from "@/lib/types/agent";

import { splitSentences } from "@/lib/utils/text";

interface ReasoningTraceProps {
  trace: ReasoningTraceData;
}

function SourceChip({
  articleNumber,
  title
}: {
  articleNumber: number;
  title: string;
}) {
  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-muted/25 px-3 py-1.5 text-xs">
      <span className="font-medium text-foreground">Art. {articleNumber}</span>
      <span className="max-w-[16rem] truncate text-muted-foreground">{title}</span>
    </div>
  );
}

function formatIssueLabel(check: CriticCheck) {
  return check.status === "unsupported" ? "Unsupported" : "Needs review";
}

function describeQuery(query: string) {
  const trimmed = query.trim().replace(/\?+$/g, "");
  if (!trimmed) return "the question";
  return `${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
}

function joinClauses(parts: string[]) {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join("; ")}; and ${parts.at(-1)}`;
}

function buildAssemblyLines(trace: ReasoningTraceData) {
  const grouped = new Map<string, { sourceLabel: string; queries: string[] }>();

  for (const mapping of trace.querySourceMappings) {
    if (!mapping.sources.length) {
      continue;
    }

    const limitedSources = mapping.sources.slice(0, 2);
    const key = limitedSources.map((source) => source.articleNumber).join(",");
    const sourceLabel = limitedSources.map((source) => `Art. ${source.articleNumber}`).join(" and ");
    const current = grouped.get(key);

    if (current) {
      current.queries.push(describeQuery(mapping.query));
      continue;
    }

    grouped.set(key, {
      sourceLabel,
      queries: [describeQuery(mapping.query)]
    });
  }

  return [...grouped.values()]
    .slice(0, 3)
    .map((group) => `Used ${group.sourceLabel} to answer ${joinClauses(group.queries)}.`);
}

export function ReasoningTrace({ trace }: ReasoningTraceProps) {
  const decomposition = trace.subQuestions;
  const querySourceMappings = trace.querySourceMappings.length
    ? trace.querySourceMappings
    : trace.subQuestions.map((query) => ({
        query,
        sources: trace.retrievedSources.slice(0, 3).map((source) => ({
          articleNumber: source.articleNumber,
          title: source.title
        }))
      }));
  const reasoningLines = buildAssemblyLines({
    ...trace,
    querySourceMappings
  });
  const fallbackSummaryLines = splitSentences(trace.synthesisSummary).slice(0, 2);
  const issueChecks = trace.criticSummary.checks
    .filter((check) => check.status !== "supported")
    .slice(0, 3);

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-panel/80">
      <section className="px-4 py-4 sm:px-5">
        <h3 className="text-sm font-semibold text-foreground">Decomposition</h3>
        {decomposition.length ? (
          <ol className="mt-3 space-y-2">
            {decomposition.map((question, index) => (
              <li key={`${question}-${index}`} className="flex gap-3 text-sm leading-6 text-foreground/90">
                <span className="font-medium text-muted-foreground">{index + 1}.</span>
                <span>{question}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Direct lookup. No explicit decomposition was needed.
          </p>
        )}
      </section>

      <section className="border-t border-border/70 px-4 py-4 sm:px-5">
        <h3 className="text-sm font-semibold text-foreground">Retrieved · Top 3 sources</h3>
        <div className="mt-3 space-y-4">
          {querySourceMappings.map((mapping, index) => (
            <div key={`${mapping.query}-${index}`} className="space-y-2">
              <div className="text-sm leading-6 text-foreground/90">{mapping.query}</div>
              {mapping.sources.length ? (
                <div className="flex flex-wrap gap-2">
                  {mapping.sources.map((source) => (
                    <SourceChip
                      key={`${mapping.query}-${source.articleNumber}`}
                      articleNumber={source.articleNumber}
                      title={source.title}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No retrieved articles were retained for this step.
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border/70 px-4 py-4 sm:px-5">
        <h3 className="text-sm font-semibold text-foreground">How the answer was assembled</h3>
        {reasoningLines.length ? (
          <ul className="mt-3 space-y-2">
            {reasoningLines.map((line, index) => (
              <li key={`${line}-${index}`} className="text-sm leading-6 text-foreground/90">
                {line}
              </li>
            ))}
          </ul>
        ) : fallbackSummaryLines.length ? (
          <ul className="mt-3 space-y-2">
            {fallbackSummaryLines.map((line, index) => (
              <li key={`${line}-${index}`} className="text-sm leading-6 text-foreground/90">
                {line}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            No reasoning summary was retained for this answer.
          </p>
        )}

        {issueChecks.length ? (
          <div className="mt-4 rounded-[1.25rem] border border-amber-500/20 bg-amber-500/5 px-3 py-3">
            <div className="text-sm font-medium text-foreground">Checks</div>
            <ul className="mt-2 space-y-2">
              {issueChecks.map((check, index) => (
                <li key={`${check.claim}-${index}`} className="text-sm leading-6 text-muted-foreground">
                  <span className="font-medium text-foreground">{formatIssueLabel(check)}:</span>{" "}
                  {check.claim}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
