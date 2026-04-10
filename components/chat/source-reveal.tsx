import type { SourceDetail } from "@/lib/types/agent";

import { Badge } from "@/components/ui/badge";

interface SourceRevealProps {
  details: SourceDetail[];
}

export function SourceReveal({ details }: SourceRevealProps) {
  if (!details.length) {
    return (
      <div className="rounded-3xl border border-border/70 bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
        No supporting source details were attached to this answer.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {details.map((detail) => (
        <div
          key={`${detail.citationId}-${detail.chunkId}`}
          className="rounded-[1.5rem] border border-border/70 bg-muted/30 px-4 py-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Art. {detail.articleNumber}</Badge>
            <span className="text-sm font-medium">{detail.title}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {detail.publication} ·{" "}
            <a href={detail.url} target="_blank" rel="noreferrer" className="underline decoration-border underline-offset-4">
              open source
            </a>
          </p>
          <p className="mt-3 text-sm leading-7 text-foreground/90">{detail.snippet}</p>
          <p className="mt-2 text-xs text-muted-foreground">{detail.rationale}</p>
        </div>
      ))}
    </div>
  );
}
