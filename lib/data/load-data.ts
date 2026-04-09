import assignmentSummary from "@/data/generated/assignment-summary.json";
import corpusDataset from "@/data/generated/corpus.json";
import evalDataset from "@/data/generated/eval.json";
import type { AssignmentSummary, CorpusArticle, CorpusDataset, EvalDataset } from "@/lib/types/corpus";

export function getAssignmentSummary() {
  return assignmentSummary as AssignmentSummary;
}

export function getCorpusDataset() {
  return corpusDataset as CorpusDataset;
}

export function getEvalDataset() {
  return evalDataset as EvalDataset;
}

export function getArticleByNumber(articleNumber: number): CorpusArticle | undefined {
  return getCorpusDataset().articles.find((article) => article.articleNumber === articleNumber);
}
