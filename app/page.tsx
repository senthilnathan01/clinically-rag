import { Workspace } from "@/components/chat/workspace";
import { getEvalDataset } from "@/lib/data/load-data";

export default function HomePage() {
  const evalSet = getEvalDataset();

  return (
    <Workspace
      sampleQuestions={evalSet.questions.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        difficulty: question.difficulty
      }))}
    />
  );
}
