# Clinically Rag

Clinically Rag is a minimal, chat-first healthcare AI research app built for the Together Fund take-home. It ingests the provided 21-article corpus, routes each query through a real LangGraph workflow, retrieves chunk-level evidence with hybrid search, streams answers into a calm chat UI, and lets reviewers inspect reasoning and sources only when they want to.

## Product shape

- Empty state: almost empty screen, centered composer, subtle example prompts
- Chat state: single conversation column, sticky bottom composer, tiny left-aligned streaming status beneath the latest user message
- Assistant turns: inline citations, `View reasoning`, `Sources`, `Copy`
- No dashboard panels, no permanent source inspector, no marketing homepage

## Architecture

- Frontend: Next.js App Router, TypeScript, Tailwind, `next-themes`
- Backend: custom SSE chat route, LangGraph JS/TS orchestration, Gemini model calls
- Retrieval: Gemini embeddings + Pinecone dense search + local BM25-style sparse scoring
- Data: PDF-derived corpus/eval metadata, local chunk manifest, live Article 21 ingest

LangGraph nodes:

1. `router`
2. `decomposer`
3. `retriever`
4. `evidenceAssembler`
5. `synthesizer`
6. `critic`
7. `formatter`

Routing:

- `simple_factual`: `router -> retriever`
- `multi_hop | live | follow_up`: `router -> decomposer -> retriever`

## Canonical artifact

The graph, API, and UI all share one assistant artifact:

- `answerMarkdown`
- `routeTaken`
- `citationAnchors[]`
- `reasoningTrace`
- `criticSummary`
- `sourceDetails[]`

Key behavior:

- citation anchors are mapped to exact answer spans
- source details preserve chunk-level evidence metadata
- follow-up context is passed explicitly in each request
- critic degradation never erases the answer

## Ingestion and retrieval

- The provided PDFs are normalized into structured JSON under `data/generated`
- The ingest script fetches all 21 article URLs, extracts content, chunks text, stores metadata, and optionally upserts to Pinecone
- Article 21 is mandatory live content and is explicitly checked in the ingest manifest and smoke script
- Retrieval merges dense Pinecone scores with sparse BM25-style scores and article-number/title boosts

## Local run

```bash
npm install
npm run prepare:data
cp .env.example .env.local
npm run ingest
npm run dev
```

Optional checks:

```bash
npm run smoke
npm run typecheck
npm run build
npm run eval
```

## Environment variables

Required:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `GEMINI_TOOLS_MODEL`
- `GEMINI_EMBEDDING_MODEL`
- `PINECONE_API_KEY`
- `PINECONE_INDEX_NAME`
- `PINECONE_NAMESPACE`

Usually required:

- `PINECONE_HOST`
- `NEXT_PUBLIC_APP_URL`

See [SETUP.md](/Users/tsn/projects/clinically-rag/SETUP.md) and [DEPLOY_VERCEL.md](/Users/tsn/projects/clinically-rag/DEPLOY_VERCEL.md) for exact steps.

## Validation status

- Implemented: yes
- Syntax-checked: yes, `npm run typecheck`
- Locally validated: yes, `npm run build` and `npm run smoke`
- Fully run and verified: partially; the live eval run depends on outbound Gemini access and available quota
