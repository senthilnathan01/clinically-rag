# Submission Writeup

## Overview

This rebuild prioritizes the reviewer experience first. Instead of a dashboard-style RAG demo, the product is a minimal chat-first application: centered composer on first load, a smooth transition into standard chat after the first question, inline citations, and structured reasoning only when expanded.

## Why this architecture

- Next.js App Router + Vercel keeps the deployment path simple.
- LangGraph provides a real multi-agent workflow instead of a thin chain.
- Gemini is used for routing, decomposition, synthesis, critic review, and embeddings.
- Pinecone is the production vector store because it is straightforward to host and works cleanly with Vercel.

## What changed in this rebuild

- Replaced the previous split-screen workspace with a single conversation column
- Moved system progress into a tiny left-aligned status line beneath the latest user prompt
- Replaced the permanent source panel with citation-triggered inline source reveals
- Rebuilt the answer contract around one canonical artifact shared by graph, API, and UI

## Retrieval design

The retrieval layer remains hybrid and evaluator-focused:

- dense similarity from Gemini embeddings stored in Pinecone
- sparse BM25-style scoring over local chunk text
- title and article-number boosting when queries hint at specific sources
- chunk-level metadata preserved through to the final source reveal

This helps especially on cross-source numeric questions and the inference-heavy eval items.

## Reasoning and citation design

The assignment asks for visible reasoning, but this implementation avoids dumping raw chain-of-thought. Each assistant answer exposes a structured reasoning trace with:

- route taken
- sub-questions
- retrieved sources
- evidence snippets
- synthesis summary
- critic summary

Citation tokens are generated in the answer text, then transformed into exact answer-span anchors so each citation can reveal the corresponding source details inline.

## Live article handling

Article 21 is treated as mandatory live content. The ingestion manifest records whether it is present, the smoke test enforces that check, and the eval harness uses special handling for Q11 so the system either answers from Article 21 or refuses cleanly if the article is missing.

## What I optimized for

- immediate usability for a non-technical reviewer
- reliable retrieval and citation mapping
- graceful failure when evidence or critic output is weak
- minimal, calm product feel rather than a feature-heavy demo

## What I would improve next

- stronger deterministic citation-to-claim validation
- persisted client-side chat history across reloads
- richer handling for publisher-blocked source text on articles 11 and 12
- a more nuanced automatic judge for eval scoring beyond heuristics
