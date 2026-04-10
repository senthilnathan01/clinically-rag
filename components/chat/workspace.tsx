import { ChatShell } from "@/components/chat/chat-shell";

interface WorkspaceProps {
  sampleQuestions: Array<{ id: string; prompt: string; difficulty?: string }>;
}

export function Workspace({ sampleQuestions }: WorkspaceProps) {
  return (
    <ChatShell
      sampleQuestions={sampleQuestions.map((question) => ({
        id: question.id,
        prompt: question.prompt
      }))}
    />
  );
}
