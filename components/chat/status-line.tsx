import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils/cn";

interface StatusLineProps {
  label: string | null;
  className?: string;
}

export function StatusLine({ label, className }: StatusLineProps) {
  if (!label) {
    return null;
  }

  return (
    <div
      className={cn("flex min-h-5 items-center gap-2 text-xs text-muted-foreground", className)}
      aria-live="polite"
    >
      <LoaderCircle className="size-3 animate-spin text-primary" />
      <span>{label}</span>
    </div>
  );
}
