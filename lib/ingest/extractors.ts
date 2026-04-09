import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import * as cheerio from "cheerio";
import pdf from "pdf-parse";

import { dedupeParagraphs, normalizeText } from "@/lib/utils/text";

export async function extractPdfTextFromBuffer(buffer: Buffer) {
  const result = await pdf(buffer);

  return dedupeParagraphs(result.text);
}

export function extractArticleFromHtml(html: string, url: string) {
  const dom = new JSDOM(html, { url });
  const readable = new Readability(dom.window.document).parse();
  const readabilityText = normalizeText(readable?.textContent ?? "");

  if (readabilityText.length > 800) {
    return {
      method: "html-readability" as const,
      title: readable?.title ?? dom.window.document.title ?? "",
      text: dedupeParagraphs(readabilityText)
    };
  }

  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe, nav, footer").remove();
  const fallbackText = normalizeText(
    $("article").text() || $("main").text() || $("body").text() || ""
  );

  return {
    method: "html-fallback" as const,
    title: $("title").first().text().trim(),
    text: dedupeParagraphs(fallbackText)
  };
}
