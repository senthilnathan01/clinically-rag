import { ChatShell } from "@/components/chat/chat-shell";
import { getEvalDataset } from "@/lib/data/load-data";

export default function HomePage() {
  const evalSet = getEvalDataset();

  return (
    <ChatShell
      sampleQuestions={evalSet.questions.map((question) => ({
        id: question.id,
        prompt: question.prompt
      }))}
    />
  );
}
