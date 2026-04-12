import { getCorpusDataset } from "@/lib/data/load-data";
import type { AssistantArtifact, AssistantIntent, ChatMessage } from "@/lib/types/agent";

const greetingPattern =
  /^(hi|hello|hey|hello there|hey there|yo|sup|good morning|good afternoon|good evening|thanks|thank you|ok|okay|cool|nice)$/i;

const productHelpPatterns = [
  /what can you (answer|do)/i,
  /what are your sources/i,
  /what sources do you have/i,
  /how do you work/i,
  /what is this app/i,
  /can you help/i,
  /help\b/i,
  /what questions can i ask/i,
  /what do you know/i
];

const followUpPattern =
  /\b(it|that|those|these|they|them|this|there|same|previous|earlier|compare|what about|and what about|how about|which one|that one)\b/i;

const strongGroundedPattern =
  /\b(ai|healthcare|health care|clinical|scribe|fda|bias|ethic|llm|rag|drug discovery|medical device|kaiser|limbic|insilico|rentosertib|eu ai act|ambient)\b/i;

const directReplies: Record<Exclude<AssistantIntent, "grounded_query">, string> = {
  greeting:
    "Hello. I can answer questions about the indexed AI-in-healthcare corpus, cite the supporting articles, and help you probe the eval questions.",
  product_help:
    "I can answer corpus-grounded questions about the 21 indexed AI-in-healthcare articles, surface article citations, show a reviewer-facing reasoning trace, and handle follow-up questions that stay within that corpus.",
  out_of_scope:
    "I’m scoped to the indexed AI-in-healthcare corpus for this assignment, so I can’t answer that from model memory. Ask about the corpus, the eval questions, or article-backed healthcare AI topics instead."
};

let cachedGroundedKeywords: Set<string> | null = null;

function buildGroundedKeywords() {
  if (cachedGroundedKeywords) {
    return cachedGroundedKeywords;
  }

  const keywords = new Set<string>([
    "ai",
    "art",
    "article",
    "assignment",
    "bias",
    "clinical",
    "corpus",
    "device",
    "discovery",
    "drug",
    "ethics",
    "eval",
    "fda",
    "gemini",
    "health",
    "healthcare",
    "hospital",
    "kaiser",
    "limbic",
    "llm",
    "medical",
    "mental",
    "patient",
    "provider",
    "rag",
    "regulation",
    "scribe",
    "survey"
  ]);

  for (const article of getCorpusDataset().articles) {
    const blob = `${article.title} ${article.publication} ${article.cluster} ${article.badge}`;

    for (const token of blob.toLowerCase().split(/[^a-z0-9]+/)) {
      if (token.length >= 4) {
        keywords.add(token);
      }
    }
  }

  cachedGroundedKeywords = keywords;
  return keywords;
}

function normalizeQuestion(value: string) {
  return value.toLowerCase().trim();
}

function countGroundedKeywordHits(question: string) {
  const normalized = normalizeQuestion(question);
  const keywords = buildGroundedKeywords();
  let hits = 0;

  for (const token of normalized.split(/[^a-z0-9]+/)) {
    if (!token) continue;
    if (keywords.has(token)) {
      hits += 1;
    }
  }

  return hits;
}

function isLikelyFollowUp(question: string, conversation: ChatMessage[]) {
  if (!conversation.length) {
    return false;
  }

  const normalized = normalizeQuestion(question);

  return normalized.length <= 120 || followUpPattern.test(normalized);
}

export function classifyAssistantIntent({
  question,
  conversation
}: {
  question: string;
  conversation: ChatMessage[];
}): AssistantIntent {
  const normalized = normalizeQuestion(question);

  if (greetingPattern.test(normalized) && normalized.split(/\s+/).length <= 4) {
    return "greeting";
  }

  if (productHelpPatterns.some((pattern) => pattern.test(normalized))) {
    return "product_help";
  }

  if (isLikelyFollowUp(normalized, conversation)) {
    return "grounded_query";
  }

  if (/\b(q\d{2}|art(?:icle)?\.?\s*\d{1,2})\b/i.test(question)) {
    return "grounded_query";
  }

  if (strongGroundedPattern.test(normalized) || countGroundedKeywordHits(normalized) >= 2) {
    return "grounded_query";
  }

  return "out_of_scope";
}

export function createDirectArtifact(intent: Exclude<AssistantIntent, "grounded_query">): AssistantArtifact {
  return {
    intent,
    answerMarkdown: directReplies[intent],
    citationAnchors: [],
    sourceDetails: []
  };
}
