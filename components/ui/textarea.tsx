import * as React from "react";

import { cn } from "@/lib/utils/cn";

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[120px] w-full rounded-[1.5rem] border border-border/70 bg-background/80 px-5 py-4 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20",
        className
      )}
      {...props}
    />
  );
}
