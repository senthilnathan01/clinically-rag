import type { GraphState } from "@/lib/langgraph/state";
import type { RetrievalCandidate } from "@/lib/types/agent";

function formatConversation(state: GraphState) {
  return state.conversation
    .slice(-6)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");
}

export function buildRouterPrompt(state: GraphState) {
  return `
You are the routing agent for a healthcare AI research assistant.

Classify the user query into one route:
- simple_factual: one-hop lookup or direct statistic
- multi_hop: synthesis across multiple articles
- live: explicitly asks about breaking news, recent events, or article 21
- follow_up: depends on prior conversation context

Return JSON with:
- routeTaken
- routeRationale
- focusArticleNumbers (array of article numbers you believe are likely relevant)

Conversation:
${formatConversation(state) || "No previous context."}

User question:
${state.question}
  `.trim();
}

export function buildDecomposerPrompt(state: GraphState) {
  return `
You are the decomposition agent for a reviewer-facing healthcare research assistant.

Generate:
- subQuestions: 1 to 4 precise research sub-questions
- searchQueries: 2 to 5 search-friendly retrieval queries
- focusArticleNumbers: likely article numbers if the question implies them

Conversation:
${formatConversation(state) || "No previous context."}

Route:
${state.routeTaken}

User question:
${state.question}
  `.trim();
}

export function buildSynthesizerPrompt(state: GraphState, candidates: RetrievalCandidate[]) {
  const evidence = candidates
    .slice(0, 8)
    .map(
      (candidate) => `
Article ${candidate.article.articleNumber}: ${candidate.article.title}
Publication: ${candidate.article.publication}
Cluster: ${candidate.article.cluster}
Summary: ${candidate.articleSummary}
Snippet: ${candidate.chunkText}
      `.trim()
    )
    .join("\n\n");

  return `
You are the synthesis agent in an agentic RAG system built for a healthcare AI evaluation.

Instructions:
- Answer only from the provided evidence.
- Use precise reviewer-friendly prose.
- Add inline article citations after factual claims using this exact format:
  [Art. 15 · ML-Enabled Medical Devices Authorized by the FDA in 2024]
- If evidence is incomplete, say so explicitly.
- Preserve follow-up context when relevant.

Conversation:
${formatConversation(state) || "No previous context."}

Sub-questions:
${state.subQuestions.join("\n") || state.question}

Evidence:
${evidence}

User question:
${state.question}
  `.trim();
}

export function buildCriticPrompt(state: GraphState, candidates: RetrievalCandidate[]) {
  const evidence = candidates
    .slice(0, 8)
    .map(
      (candidate) =>
        `Article ${candidate.article.articleNumber}: ${candidate.article.title}\nSnippet: ${candidate.chunkText}`
    )
    .join("\n\n");

  return `
You are the critic agent.

Review the drafted answer against the retrieved evidence. Return JSON with a "checks" array. Each check must contain:
- claim
- status: supported | weak | unsupported
- citations: [{ articleNumber, title }]
- note

Keep the list concise and focused on the main factual claims.

Draft answer:
${state.answerMarkdown}

Evidence:
${evidence}
  `.trim();
}
