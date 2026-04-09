import { readFile } from "node:fs/promises";
import path from "node:path";

import pdf from "pdf-parse";

export async function extractPdfText(filePath: string) {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  const buffer = await readFile(resolvedPath);
  const parsed = await pdf(buffer);

  return parsed.text.replace(/\r/g, "");
}

export function normalizeWhitespace(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
