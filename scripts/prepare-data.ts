import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { parseAssignmentPdf } from "@/lib/corpus/parse-assignment";
import { parseCorpusPdf } from "@/lib/corpus/parse-corpus";
import { parseEvalPdf } from "@/lib/corpus/parse-eval";

async function main() {
  const outputDir = path.join(process.cwd(), "data", "generated");

  await mkdir(outputDir, { recursive: true });

  const [assignment, corpus, evalSet] = await Promise.all([
    parseAssignmentPdf(),
    parseCorpusPdf(),
    parseEvalPdf()
  ]);

  await Promise.all([
    writeFile(path.join(outputDir, "assignment-summary.json"), JSON.stringify(assignment, null, 2)),
    writeFile(path.join(outputDir, "corpus.json"), JSON.stringify(corpus, null, 2)),
    writeFile(path.join(outputDir, "eval.json"), JSON.stringify(evalSet, null, 2))
  ]);

  console.log(
    JSON.stringify(
      {
        assignmentTitle: assignment.title,
        articleCount: corpus.articleCount,
        questionCount: evalSet.questionCount
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
