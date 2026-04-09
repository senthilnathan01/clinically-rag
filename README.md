# Clarity Care

Clarity Care is a submission-ready healthcare AI agentic RAG app built for the Together Fund take-home. It ingests the 21-article healthcare corpus, routes questions through a LangGraph workflow, performs hybrid retrieval, shows a structured reasoning trace, streams the final answer, and surfaces reviewer-friendly article citations.

## What was optimized for

- Retrieval quality: hybrid dense + sparse retrieval, article/title boosts, article-level summaries, and multi-query decomposition.
- Reasoning transparency: a visible trace shows route choice, sub-questions, retrieved articles, evidence assembly, synthesis, and critic verification.
- Citation accuracy: answers are instructed to cite with reviewer-friendly article chips, and a critic agent checks grounded support.
- Reviewer UX: editorial landing shell inspired by Together Fund's premium visual language, with a polished empty state, chat panel, trace panel, and source inspector.
- Eval readiness: all 11 eval prompts are normalized from the provided PDF, and Q11 is explicitly guarded around live Article 21 ingestion.

## Architecture

### Frontend

- Next.js App Router
- Tailwind CSS
- `next-themes` dark mode toggle
- streaming chat UI with separate trace and source panels

### Agent graph

LangGraph nodes:

1. `router`
2. `decomposer`
3. `retriever`
4. `evidenceAssembler`
5. `synthesizer`
6. `critic`
7. `formatter`

Routing behavior:

- `simple_factual` questions skip decomposition and go straight to retrieval.
- `multi_hop`, `live`, and `follow_up` queries take the full path.

### Retrieval

- Dense retrieval: Pinecone with Gemini embeddings
- Sparse retrieval: local BM25-style scoring over chunk text, title, and summary
- Merge and rerank: dense score + sparse score + title overlap + article hint boost
- Evidence shaping: retrieved chunks are grouped into article bundles for the UI and the synthesizer

### Ingestion

- Corpus and eval metadata are parsed from the provided local PDFs
- Each source URL is fetched with a resilient static strategy
- HTML extraction uses Readability first, then a DOM fallback
- PDF extraction uses `pdf-parse`
- Chunk records are persisted locally under `data/ingest`
- Pinecone upsert runs when Pinecone credentials are present
- Article 21 is treated as mandatory live content
- Articles 11 and 12 include documented manual fallback notes because the publishers returned `403` during local validation

## Project structure

```text
app/
components/
data/
  generated/
  ingest/
  overrides/
lib/
  config/
  corpus/
  gemini/
  ingest/
  langgraph/
  retrieval/
  types/
scripts/
README.md
SETUP.md
DEPLOY_VERCEL.md
SUBMISSION_WRITEUP.md
EVAL_REPORT.md
.env.example
```

## Local development

1. Install dependencies:

```bash
npm install
```

2. Normalize the provided PDFs into JSON:

```bash
npm run prepare:data
```

3. Copy `.env.example` to `.env.local` and fill in Gemini + Pinecone values.

4. Ingest the corpus:

```bash
npm run ingest
```

5. Start the app:

```bash
npm run dev
```

6. Optional checks:

```bash
npm run smoke
npm run build
```

7. Run the eval harness after secrets are configured:

```bash
npm run eval
```

## Notes on model configuration

The app reads model identifiers directly from environment variables. Set them to the exact Gemini model IDs available in your account. The default example values use the requested Gemini 3.1 Pro Preview naming, but if your AI Studio account exposes a different alias, use that alias directly in `.env.local` and in Vercel.

## Validation status

- Implemented: full app scaffold, PDF normalization, ingestion pipeline, hybrid retrieval, LangGraph orchestration, chat UI, dark mode, docs, eval harness, packaging script.
- Syntax-checked: yes, via `npm run typecheck`.
- Locally validated: yes, via `npm run build`, `npm run ingest`, `npm run smoke`, and live local route checks.
- Fully run and verified end-to-end with Gemini answers: not completed in this environment because `GEMINI_API_KEY` and Pinecone credentials were not provided.
