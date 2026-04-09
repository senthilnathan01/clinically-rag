import type { CorpusArticle } from "@/lib/types/corpus";

export type QueryRoute = "simple_factual" | "multi_hop" | "live" | "follow_up";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CitationChip {
  articleNumber: number;
  title: string;
}

export interface SourceEvidence {
  articleNumber: number;
  title: string;
  cluster: string;
  publication: string;
  url: string;
  rationale: string;
  score: number;
  snippets: string[];
}

export interface CriticCheck {
  claim: string;
  status: "supported" | "weak" | "unsupported";
  citations: CitationChip[];
  note: string;
}

export interface ReasoningTraceStep {
  key:
    | "query_type"
    | "sub_questions"
    | "retrieval"
    | "evidence"
    | "synthesis"
    | "critic"
    | "formatting";
  label: string;
  summary: string;
  details: string[];
}

export interface ReasoningTrace {
  route: QueryRoute;
  phases: ReasoningTraceStep[];
}

export interface AgentAnswer {
  answerMarkdown: string;
  citations: CitationChip[];
  reasoningTrace: ReasoningTrace;
  retrievedSources: SourceEvidence[];
  criticReport: CriticCheck[];
  routeTaken: QueryRoute;
  timingBreakdown: Record<string, number>;
}

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
  indexedArticles: IndexedArticleRecord[];
  failedArticles: Array<{
    articleNumber: number;
    title: string;
    url: string;
    error: string;
  }>;
}
