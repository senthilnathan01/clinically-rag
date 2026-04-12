import { z } from "zod";

import type {
  AssistantArtifact,
  ChatMessage,
  CriticCheck,
  CriticSummary,
  EvidenceSnippet,
  QuerySourceMapping,
  RetrievedSourceSummary,
  SourceDetail
} from "@/lib/types/agent";

const criticCheckSchema = z.object({
  claim: z.string(),
  status: z.enum(["supported", "weak", "unsupported"]),
  citationNumbers: z.array(z.number())
});

const criticSummarySchema = z.object({
  overall: z.enum(["pass", "weak", "fail"]),
  summary: z.string(),
  checks: z.array(criticCheckSchema)
});

const retrievedSourceSchema = z.object({
  articleNumber: z.number(),
  title: z.string(),
  publication: z.string(),
  url: z.string(),
  chunkId: z.string(),
  chunkIndex: z.number(),
  score: z.number(),
  rationale: z.string()
});

const evidenceSnippetSchema = z.object({
  articleNumber: z.number(),
  title: z.string(),
  snippet: z.string(),
  chunkId: z.string(),
  chunkIndex: z.number()
});

const sourceDetailSchema = z.object({
  citationId: z.string(),
  articleNumber: z.number(),
  title: z.string(),
  publication: z.string(),
  url: z.string(),
  rationale: z.string(),
  snippet: z.string(),
  verificationText: z.string(),
  chunkId: z.string(),
  chunkIndex: z.number()
});

const citationChipSchema = z.object({
  articleNumber: z.number(),
  title: z.string()
});

const querySourceMappingSchema = z.object({
  query: z.string(),
  sources: z.array(citationChipSchema)
});

const chatMessageSchema = z.object({
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
  querySourceMappings: z.array(querySourceMappingSchema).default([]),
  focusArticleNumbers: z.array(z.number()).default([]),
  retrievalCandidates: z.array(z.any()).default([]),
  retrievedSources: z.array(retrievedSourceSchema).default([]),
  evidenceSnippets: z.array(evidenceSnippetSchema).default([]),
  sourceDetails: z.array(sourceDetailSchema).default([]),
  answerMarkdown: z.string().default(""),
  synthesisSummary: z.string().default(""),
  criticSummary: criticSummarySchema.default({
    overall: "weak",
    summary: "Critic review did not run yet.",
    checks: []
  }),
  timingBreakdown: z.record(z.string(), z.number()).default({}),
  finalArtifact: z.any().optional(),
  errors: z.array(z.string()).default([])
});

export type GraphState = z.infer<typeof graphStateSchema> & {
  querySourceMappings: QuerySourceMapping[];
  retrievedSources: RetrievedSourceSummary[];
  evidenceSnippets: EvidenceSnippet[];
  sourceDetails: SourceDetail[];
  criticSummary: CriticSummary;
  finalArtifact?: AssistantArtifact;
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
    querySourceMappings: [],
    focusArticleNumbers: [],
    retrievalCandidates: [],
    retrievedSources: [],
    evidenceSnippets: [],
    sourceDetails: [],
    answerMarkdown: "",
    synthesisSummary: "",
    criticSummary: {
      overall: "weak",
      summary: "Critic review did not run yet.",
      checks: [] as CriticCheck[]
    },
    timingBreakdown: {},
    errors: []
  };
}
