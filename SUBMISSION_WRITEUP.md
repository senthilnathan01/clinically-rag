# Submission Writeup

## Overview

I built a single-repo Next.js App Router application that ingests the provided healthcare AI corpus, stores chunked evidence in a vector index, and answers reviewer questions through a LangGraph-based multi-agent workflow. The design prioritizes the assignment rubric: retrieval quality, reasoning transparency, citation accuracy, meaningful agent structure, and reviewer usability.

## Why this architecture

- Next.js + Vercel keeps the deploy path simple and reviewer-friendly.
- LangGraph provides a real graph with routing and separate agent responsibilities instead of a linear chain.
- Gemini is used for routing, decomposition, synthesis, and critic verification, with environment-configurable model IDs so the same code works with the exact Gemini aliases available in the deployment account.
- Pinecone is the primary vector layer because it is straightforward to deploy and matches the rubric's expectation for a production-style hosted system.

## Retrieval design

The retrieval layer combines:

- dense retrieval over embedded chunks in Pinecone
- sparse BM25-style scoring over locally persisted chunk text
- title/article-number boosts when the query hints at specific sources
- article-level summaries persisted alongside chunk records

This produces a hybrid candidate set that is more robust than naive vector search alone, especially for eval questions that mix numeric facts, named entities, and cross-article synthesis.

## Agent design

The graph uses:

1. `router`
2. `decomposer`
3. `retriever`
4. `evidenceAssembler`
5. `synthesizer`
6. `critic`
7. `formatter`

The router enables a fast path for simple factual questions while preserving a full path for multi-hop, live, and follow-up queries. The critic agent provides bonus-point coverage and helps keep unsupported claims visible instead of silently leaking into final answers.

## Reasoning transparency and citations

The assignment asks for visible chain-of-thought. I translated that into a safer structured reasoning trace:

- query type
- sub-question decomposition
- retrieved articles
- evidence assembly
- synthesis summary
- critic verification

The UI keeps this trace visible and collapsible. Final prose answers are required to cite specific articles in-line with reviewer-friendly chips like `[Art. 15 · ...]`.

## Live ingestion handling

Article 21 is treated as a mandatory live source and is checked in the smoke script. During local validation, the ingestion pipeline successfully indexed Article 21 and confirmed its presence in the local manifest.

Two publisher-hosted drug discovery sources returned `403` in clean fetches, so I added documented manual fallback notes under `data/overrides/` to keep the local index complete without hiding the fetch constraint.

## What I optimized for

- dependable retrieval over the assignment corpus
- clarity for a non-technical reviewer
- explicit traceability from answer to evidence
- low-friction Vercel deployment

## What I would improve next

- add richer source extraction for publisher-blocked content through optional authenticated or exported-PDF workflows
- add a stronger automatic judge for eval scoring instead of purely heuristic scoring
- add persisted chat sessions and richer trace visualizations
- tighten the evidence-to-claim critic granularity further for sentence-level coverage
