import { ChatShell } from "@/components/chat/chat-shell";
import { getEvalDataset } from "@/lib/data/load-data";

export default function HomePage() {
  const evalSet = getEvalDataset();
  const questionsById = new Map(evalSet.questions.map((question) => [question.id, question]));
  const homepageQuestionIds = evalSet.questions
    .map((question) => question.id)
    .filter((id) => id !== "Q02" && id !== "Q11");
  const q05Index = homepageQuestionIds.indexOf("Q05");

  if (q05Index >= 0) {
    homepageQuestionIds.splice(q05Index + 1, 0, "Q11");
  }

  return (
    <ChatShell
      sampleQuestions={homepageQuestionIds.flatMap((id) => {
        const question = questionsById.get(id);
        return question
          ? {
              id: question.id,
              prompt: question.prompt
            }
          : [];
      })}
    />
  );
}
