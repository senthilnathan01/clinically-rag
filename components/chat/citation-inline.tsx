import type { CitationAnchor } from "@/lib/types/agent";

interface CitationInlineProps {
  anchor?: CitationAnchor;
  active: boolean;
  onClick: () => void;
  fallbackLabel: string;
}

export function CitationInline({
  anchor,
  active,
  onClick,
  fallbackLabel
}: CitationInlineProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mx-0.5 inline-flex rounded-full border px-2 py-0.5 text-[0.72rem] transition ${
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border/70 bg-muted/55 text-muted-foreground hover:border-primary/30 hover:text-foreground"
      }`}
    >
      {anchor?.label ?? fallbackLabel}
    </button>
  );
}
