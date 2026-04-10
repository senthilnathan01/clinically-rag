"use client";

import { ArrowUp, WandSparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onUseEvalPrompt?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  docked: boolean;
  showPromptControl?: boolean;
}

export function Composer({
  value,
  onChange,
  onSubmit,
  onUseEvalPrompt,
  disabled,
  isStreaming,
  docked,
  showPromptControl
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 240)}px`;
  }, [value]);

  return (
    <div
      className={cn(
        "allow-text-selection [-webkit-app-region:no-drag] w-full rounded-[2rem] border border-border/80 bg-panel/92 p-3 shadow-soft transition-all duration-500",
        docked ? "backdrop-blur supports-[backdrop-filter]:bg-panel/88" : ""
      )}
    >
      <div className="flex items-end gap-3">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.metaKey || event.ctrlKey || event.altKey) {
              return;
            }

            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              onSubmit();
            }
          }}
          spellCheck={false}
          draggable={false}
          placeholder="Ask a question"
          className="[-webkit-app-region:no-drag] max-h-60 min-h-[60px] flex-1 resize-none border-0 bg-transparent px-3 py-2 text-[15px] leading-7 text-foreground outline-none placeholder:text-muted-foreground select-text"
          style={{
            userSelect: "text",
            WebkitUserSelect: "text",
            WebkitTouchCallout: "default"
          }}
        />
        <Button
          type="button"
          size="icon"
          className="mb-1 h-11 w-11 rounded-full"
          onClick={onSubmit}
          disabled={disabled}
          aria-label={isStreaming ? "Streaming response" : "Send message"}
        >
          <ArrowUp className="size-4" />
        </Button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 px-2 pb-1">
        <div className="text-[11px] text-muted-foreground">
          Enter to send, Shift+Enter for a new line
        </div>
        {showPromptControl ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground transition hover:text-foreground"
            onClick={onUseEvalPrompt}
          >
            <WandSparkles className="size-3.5 text-primary" />
            Use eval prompt
          </button>
        ) : null}
      </div>
    </div>
  );
}
