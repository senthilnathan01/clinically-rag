import type { GraphState } from "@/lib/langgraph/state";
import type { RetrievalCandidate, SourceDetail } from "@/lib/types/agent";

function formatConversation(state: GraphState) {
  return state.conversation
    .slice(-8)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");
}

function formatEvidence(candidates: RetrievalCandidate[]) {
  return candidates
    .slice(0, 10)
    .map(
      (candidate, index) => `
Evidence ${index + 1}
Article ${candidate.article.articleNumber}: ${candidate.article.title}
Publication: ${candidate.article.publication}
Cluster: ${candidate.article.cluster}
Chunk ID: ${candidate.id}
Chunk Index: ${candidate.chunkIndex}
Summary: ${candidate.articleSummary}
Snippet: ${candidate.chunkText}
      `.trim()
    )
    .join("\n\n");
}

export function buildRouterPrompt(state: GraphState) {
  return `
You are the routing agent for a healthcare AI research assistant.

Classify the user query into one route:
- simple_factual: direct lookup, single statistic, or one-article question
- multi_hop: synthesis or comparison across multiple articles
- live: explicitly asks about recent or live reporting, especially Article 21
- follow_up: depends on the existing conversation

Return JSON with:
- routeTaken
- routeRationale
- focusArticleNumbers (likely article numbers if you can infer them)

Conversation:
${formatConversation(state) || "No previous context."}

User question:
${state.question}
  `.trim();
}

export function buildDecomposerPrompt(state: GraphState) {
  return `
You are the decomposition agent for a reviewer-facing healthcare research assistant.

Return JSON with:
- subQuestions: 1 to 4 precise sub-questions
- searchQueries: 2 to 5 retrieval queries
- focusArticleNumbers: likely article numbers if the prompt hints at them

Conversation:
${formatConversation(state) || "No previous context."}

Route:
${state.routeTaken}

User question:
${state.question}
  `.trim();
}

export function buildSynthesizerPrompt(state: GraphState, candidates: RetrievalCandidate[]) {
  return `
You are the synthesis agent in a healthcare AI evaluation app.

Instructions:
- Answer only from the provided evidence.
- Use calm, direct prose that reads well in a chat UI.
- Keep the answer concise but complete.
- After each factual claim, add an inline citation using this exact format:
  [Art. 15 · ML-Enabled Medical Devices Authorized by the FDA in 2024]
- If evidence is weak, incomplete, or missing, say so clearly instead of guessing.
- Preserve follow-up context when relevant.
- Do not cite articles that are not in the provided evidence.

Conversation:
${formatConversation(state) || "No previous context."}

Sub-questions:
${state.subQuestions.join("\n") || state.question}

Evidence:
${formatEvidence(candidates)}

User question:
${state.question}
  `.trim();
}

export function buildCriticPrompt({
  answerMarkdown,
  claimCandidates,
  evidence,
  retry = false
}: {
  answerMarkdown: string;
  claimCandidates: string[];
  evidence: SourceDetail[];
  retry?: boolean;
}) {
  const claimsBlock = claimCandidates.map((claim, index) => `${index + 1}. ${claim}`).join("\n");
  const evidenceBlock = evidence
    .map(
      (detail, index) => `
Evidence ${index + 1}
Article ${detail.articleNumber}: ${detail.title}
Chunk ID: ${detail.chunkId}
Snippet: ${detail.snippet}
      `.trim()
    )
    .join("\n\n");

  return `
You are the critic agent.

Verify the answer using only the claims and evidence below.
Return strict JSON only.

Schema:
- overall: pass | weak | fail
- summary: short reviewer-facing sentence
- checks: array of up to 5 items, each with:
  - claim: string
  - status: supported | weak | unsupported
  - citationNumbers: number[]

Rules:
- Verify each claim separately.
- Use only article numbers present in the evidence.
- If a claim is unsupported, use an empty citationNumbers array.
- Do not add any prose outside the JSON object.
${retry ? "- This is a repair retry. Return only exact JSON matching the schema." : ""}

Draft answer:
${answerMarkdown}

Claims to verify:
${claimsBlock || "1. No explicit claim candidates were extracted."}

Evidence:
${evidenceBlock || "No evidence provided."}
  `.trim();
}
