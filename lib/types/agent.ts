import type { CorpusArticle } from "@/lib/types/corpus";

export type QueryRoute = "simple_factual" | "multi_hop" | "live" | "follow_up";
export type ChatRole = "user" | "assistant";
export type ChatTurnStatus = "idle" | "streaming" | "complete" | "error";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatTurn extends ChatMessage {
  id: string;
  createdAt: string;
  status: ChatTurnStatus;
  artifact?: Partial<AssistantArtifact>;
  error?: string;
}

export interface RetrievedSourceSummary {
  articleNumber: number;
  title: string;
  publication: string;
  url: string;
  chunkId: string;
  chunkIndex: number;
  score: number;
  rationale: string;
}

export interface EvidenceSnippet {
  articleNumber: number;
  title: string;
  snippet: string;
  chunkId: string;
  chunkIndex: number;
}

export interface CriticCheck {
  claim: string;
  status: "supported" | "weak" | "unsupported";
  citationNumbers: number[];
}

export interface CriticSummary {
  overall: "pass" | "weak" | "fail";
  summary: string;
  checks: CriticCheck[];
}

export interface ReasoningTrace {
  routeTaken: QueryRoute;
  routeRationale: string;
  subQuestions: string[];
  retrievedSources: RetrievedSourceSummary[];
  evidenceSnippets: EvidenceSnippet[];
  synthesisSummary: string;
  criticSummary: CriticSummary;
}

export interface CitationAnchor {
  id: string;
  label: string;
  articleNumber: number;
  title: string;
  publication: string;
  url: string;
  snippet: string;
  startOffset: number;
  endOffset: number;
  chunkId: string;
}

export interface CitationChip {
  articleNumber: number;
  title: string;
}

export interface SourceDetail {
  citationId: string;
  articleNumber: number;
  title: string;
  publication: string;
  url: string;
  rationale: string;
  snippet: string;
  chunkId: string;
  chunkIndex: number;
}

export interface AssistantArtifact {
  answerMarkdown: string;
  routeTaken: QueryRoute;
  citationAnchors: CitationAnchor[];
  reasoningTrace: ReasoningTrace;
  criticSummary: CriticSummary;
  sourceDetails: SourceDetail[];
}

export type AgentAnswer = AssistantArtifact;

export interface RetrievalCandidate {
  id: string;
  article: CorpusArticle;
  articleSummary: string;
  chunkText: string;
  chunkIndex: number;
  denseScore: number;
  sparseScore: number;
  combinedScore: number;
  titleOverlap: number;
}

export interface ArticleChunkRecord {
  id: string;
  articleNumber: number;
  articleTitle: string;
  publication: string;
  cluster: string;
  url: string;
  chunkIndex: number;
  text: string;
  summary: string;
  embeddingInput: string;
  sparseTerms: Record<string, number>;
  wordCount: number;
}

export interface IndexedArticleRecord extends CorpusArticle {
  summary: string;
  extractionMethod: "html-readability" | "html-fallback" | "pdf" | "manual-override";
  extractedTextLength: number;
  status: "indexed" | "failed";
  error?: string;
}

export interface IngestionManifest {
  generatedAt: string;
  chunkCount: number;
  articleCount: number;
  article21Present?: boolean;
  indexedArticles: IndexedArticleRecord[];
  failedArticles: Array<{
    articleNumber: number;
    title: string;
    url: string;
    error: string;
  }>;
}

export interface GraphStreamEventMap {
  phase: { label: string };
  token: { text: string };
  artifact: Partial<AssistantArtifact>;
  complete: AssistantArtifact;
  error: { message: string };
}

export type GraphStreamEvent = {
  [Key in keyof GraphStreamEventMap]: {
    event: Key;
    data: GraphStreamEventMap[Key];
  };
}[keyof GraphStreamEventMap];
