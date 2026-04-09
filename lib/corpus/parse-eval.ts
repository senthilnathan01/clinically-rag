import type { EvalDataset, EvalDifficulty, EvalQuestion } from "@/lib/types/corpus";

import { extractPdfText, normalizeWhitespace } from "@/lib/corpus/pdf";

function parseDifficulty(raw: string): EvalDifficulty {
  const normalized = raw.toLowerCase().replace(/\s+/g, "");

  if (normalized.startsWith("easy")) return "easy";
  if (normalized.startsWith("medi")) return "medium";
  if (normalized.startsWith("hard")) return "hard";
  return "live";
}

export async function parseEvalPdf(filePath = "healthcare_ai_evalset_v2.pdf"): Promise<EvalDataset> {
  const rawText = normalizeWhitespace(await extractPdfText(filePath));
  const lines = rawText.split("\n").map((line) => line.trim());
  const questions: EvalQuestion[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index] !== "Q" || !/^\d{2}$/.test(lines[index + 1] ?? "")) continue;

    const id = `Q${lines[index + 1]}`;
    let cursor = index + 2;
    let difficultyLine = lines[cursor] ?? "";

    if (!difficultyLine.includes("Sources:")) {
      while (!lines[cursor + 1]?.startsWith("Sources:") && !lines[cursor + 1]?.includes("Sources:")) {
        cursor += 1;
        difficultyLine += lines[cursor] ?? "";
      }
      cursor += 1;
      difficultyLine += lines[cursor] ?? "";
    }

    const [difficultyRaw, sourcesRaw] = difficultyLine.split("Sources:");
    const difficulty = parseDifficulty(difficultyRaw);
    const sourceNumbers = [...(sourcesRaw ?? "").matchAll(/\d{2}/g)].map((value) =>
      Number(value[0])
    );

    const content: string[] = [];
    cursor += 1;

    while (cursor < lines.length && lines[cursor] !== "Q" && !lines[cursor].startsWith("Generated April")) {
      if (lines[cursor]) content.push(lines[cursor]);
      cursor += 1;
    }

    const answerStartIndex = content.findIndex((line, contentIndex) => {
      const nextLine = content[contentIndex + 1] ?? "";

      return contentIndex > 0 && line.length <= 70 && nextLine.length >= 80;
    });

    const promptLines = content.slice(0, answerStartIndex);
    const expectedShortAnswer = content[answerStartIndex] ?? "";
    const answerLines = content.slice(answerStartIndex + 1);

    const scoringNotesIndex = answerLines.findIndex((line) => line.startsWith("Scoring note:"));
    const scoringNotes =
      scoringNotesIndex >= 0 ? answerLines.slice(scoringNotesIndex).join(" ") : undefined;
    const expectedAnswer =
      scoringNotesIndex >= 0
        ? answerLines.slice(0, scoringNotesIndex).join(" ")
        : answerLines.join(" ");

    questions.push({
      id,
      difficulty,
      prompt: promptLines.join(" "),
      sources: sourceNumbers,
      expectedShortAnswer,
      expectedAnswer,
      scoringNotes
    });

    index = cursor - 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    questionCount: questions.length,
    questions
  };
}
