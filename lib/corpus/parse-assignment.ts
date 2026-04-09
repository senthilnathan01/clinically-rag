import type { AssignmentSummary } from "@/lib/types/corpus";

import { extractPdfText, normalizeWhitespace } from "@/lib/corpus/pdf";

function extractList(text: string, heading: string) {
  const pattern = new RegExp(`${heading}[\\s\\S]*?(?=\\n[A-Z][^\\n]+\\n|$)`, "i");
  const block = text.match(pattern)?.[0] ?? "";

  return [...block.matchAll(/·\s+([^\n]+)/g)].map((match) => match[1].trim());
}

export async function parseAssignmentPdf(
  filePath = "Technical_Intern_Assignment_v2.pdf"
): Promise<AssignmentSummary> {
  const rawText = normalizeWhitespace(await extractPdfText(filePath));
  const deadline =
    rawText.match(/Deadline\s+([^\n]+)/i)?.[1]?.trim() ?? "12th April 2026";

  return {
    title: "Together Fund Technical Intern Assignment · v3",
    deadline,
    requiredFeatures: [
      "Fetch, parse, chunk, embed, and index all 21 article URLs.",
      "Expose a chat UI with visible reasoning trace and article-level citations.",
      "Support follow-up questions with maintained conversation context.",
      "Handle Q11 by indexing Article 21 from its live URL."
    ],
    bonusFeatures: [
      "Critic agent",
      "Query routing",
      "Eval automation",
      "Hybrid retrieval"
    ],
    systemRubric: [
      {
        criterion: "Retrieval Quality",
        points: 10,
        description: "Find the right articles, including multi-article questions."
      },
      {
        criterion: "Reasoning Transparency",
        points: 10,
        description: "Show visible, coherent reasoning from query to evidence to answer."
      },
      {
        criterion: "Citation Accuracy",
        points: 10,
        description: "Map each factual claim to the correct article number."
      },
      {
        criterion: "Agent Architecture",
        points: 10,
        description: "Use a meaningful multi-agent design rather than a thin wrapper."
      },
      {
        criterion: "Usability",
        points: 10,
        description: "Make the system legible to a non-technical reviewer."
      }
    ]
  };
}
