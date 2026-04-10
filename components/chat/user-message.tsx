import type { ChatTurn } from "@/lib/types/agent";

export function UserMessage({ turn }: { turn: ChatTurn }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-[1.75rem] border border-primary/20 bg-primary/8 px-5 py-4 text-[15px] leading-7 text-foreground">
        {turn.content}
      </div>
    </div>
  );
}
