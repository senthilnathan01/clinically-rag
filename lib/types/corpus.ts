export type CorpusCluster =
  | "Market & Adoption"
  | "Clinical AI"
  | "Drug Discovery"
  | "Regulation & Ethics"
  | "Live";

export interface CorpusArticle {
  articleNumber: number;
  badge: string;
  title: string;
  publication: string;
  date: string;
  cluster: CorpusCluster;
  url: string;
  questionRefs: string[];
  isLive: boolean;
}

export interface CorpusDataset {
  generatedAt: string;
  articleCount: number;
  articles: CorpusArticle[];
}

export type EvalDifficulty = "easy" | "medium" | "hard" | "live";

export interface EvalQuestion {
  id: string;
  difficulty: EvalDifficulty;
  prompt: string;
  sources: number[];
  expectedShortAnswer: string;
  expectedAnswer: string;
  scoringNotes?: string;
}

export interface EvalDataset {
  generatedAt: string;
  questionCount: number;
  questions: EvalQuestion[];
}

export interface AssignmentSummary {
  title: string;
  deadline: string;
  requiredFeatures: string[];
  bonusFeatures: string[];
  systemRubric: Array<{
    criterion: string;
    points: number;
    description: string;
  }>;
}
