import * as React from "react";

import { cn } from "@/lib/utils/cn";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-full border border-border/70 bg-background/80 px-4 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20",
        className
      )}
      {...props}
    />
  );
}
