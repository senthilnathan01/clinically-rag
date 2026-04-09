import { z } from "zod";

import type { AgentAnswer, ChatMessage } from "@/lib/types/agent";

export const citationSchema = z.object({
  articleNumber: z.number(),
  title: z.string()
});

export const sourceEvidenceSchema = z.object({
  articleNumber: z.number(),
  title: z.string(),
  cluster: z.string(),
  publication: z.string(),
  url: z.string(),
  rationale: z.string(),
  score: z.number(),
  snippets: z.array(z.string())
});

export const criticCheckSchema = z.object({
  claim: z.string(),
  status: z.enum(["supported", "weak", "unsupported"]),
  citations: z.array(citationSchema),
  note: z.string()
});

export const reasoningTraceStepSchema = z.object({
  key: z.enum([
    "query_type",
    "sub_questions",
    "retrieval",
    "evidence",
    "synthesis",
    "critic",
    "formatting"
  ]),
  label: z.string(),
  summary: z.string(),
  details: z.array(z.string())
});

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string()
});

export const graphStateSchema = z.object({
  question: z.string(),
  conversation: z.array(chatMessageSchema).default([]),
  routeTaken: z
    .enum(["simple_factual", "multi_hop", "live", "follow_up"])
    .default("multi_hop"),
  routeRationale: z.string().default(""),
  subQuestions: z.array(z.string()).default([]),
  searchQueries: z.array(z.string()).default([]),
  focusArticleNumbers: z.array(z.number()).default([]),
  retrievalCandidates: z.array(z.any()).default([]),
  retrievedSources: z.array(sourceEvidenceSchema).default([]),
  citations: z.array(citationSchema).default([]),
  criticReport: z.array(criticCheckSchema).default([]),
  reasoningSteps: z.array(reasoningTraceStepSchema).default([]),
  answerMarkdown: z.string().default(""),
  timingBreakdown: z.record(z.string(), z.number()).default({}),
  finalResponse: z.any().optional(),
  errors: z.array(z.string()).default([])
});

export type GraphState = z.infer<typeof graphStateSchema> & {
  finalResponse?: AgentAnswer;
};

export function createInitialGraphState({
  question,
  conversation
}: {
  question: string;
  conversation: ChatMessage[];
}): GraphState {
  return {
    question,
    conversation,
    routeTaken: "multi_hop",
    routeRationale: "",
    subQuestions: [],
    searchQueries: [],
    focusArticleNumbers: [],
    retrievalCandidates: [],
    retrievedSources: [],
    citations: [],
    criticReport: [],
    reasoningSteps: [],
    answerMarkdown: "",
    timingBreakdown: {},
    errors: []
  };
}
