import * as React from "react";

import { cn } from "@/lib/utils/cn";

export function Badge({
  className,
  children
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border/60 bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground",
        className
      )}
    >
      {children}
    </div>
  );
}
