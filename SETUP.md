# Setup Guide

This guide is the human checklist for getting the project from a clean checkout to a live, ingest-ready deployment.

## 1. Gemini API setup

Reference: [Using Gemini API keys](https://ai.google.dev/gemini-api/docs/api-key)

1. Open [Google AI Studio](https://aistudio.google.com/).
2. In the left sidebar, open `Dashboard`.
3. Open `API Keys`.
4. If you do not already have a project available:
   - open `Projects`
   - click `Import projects` or create the default project
   - return to `API Keys`
5. Click `Create API key`.
6. Copy the generated key.
7. Put it into `.env.local` as `GEMINI_API_KEY`.
8. In the same file, set:

```bash
GEMINI_MODEL=gemini-3.1-pro-preview
GEMINI_TOOLS_MODEL=gemini-3.1-pro-preview-customtools
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
```

9. If your AI Studio account shows different model aliases, replace the example values with the exact aliases shown in your account. The code reads them as plain strings.

## 2. Pinecone setup

Reference: [Create a serverless index](https://docs.pinecone.io/docs/create-an-index)

1. Open [Pinecone Console](https://app.pinecone.io/).
2. Create or open a project.
3. Click `Indexes`.
4. Click `Create index`.
5. Choose a dense serverless index.
6. Use these values:
   - Name: `together-healthcare`
   - Dimension: `3072` if your Gemini embedding output is 3072 in your account, otherwise use the dimension reported by your embedding model
   - Metric: `cosine`
   - Cloud/region: choose the cheapest low-latency serverless region available to you
7. After the index is ready, copy:
   - your Pinecone API key
   - the index name
   - the host value if Pinecone shows one
8. Put them into `.env.local`:

```bash
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=together-healthcare
PINECONE_NAMESPACE=together-healthcare
PINECONE_HOST=...
```

## 3. Install and normalize local data

Run:

```bash
npm install
npm run prepare:data
```

What this does:

- installs the app and script dependencies
- parses the three provided PDFs into structured JSON under `data/generated`

## 4. Ingest the corpus

Run:

```bash
npm run ingest
```

What this does:

- fetches all 21 URLs from the corpus PDF
- extracts text from HTML or PDF sources
- writes extracted text to `data/ingest/raw`
- creates `data/ingest/articles.json`
- creates `data/ingest/chunks.json`
- creates `data/ingest/manifest.json`
- upserts vectors into Pinecone when Pinecone credentials are present

Important note:

- Articles 11 and 12 have manual fallback notes under `data/overrides/` because they returned `403` during local validation. If you later obtain full accessible text for those articles, replace the override files with better notes or exported text before rerunning `npm run ingest`.

## 5. Run local checks

Run:

```bash
npm run smoke
npm run typecheck
npm run build
```

What each command validates:

- `smoke`: corpus JSON, eval JSON, manifest existence, chunk existence, and Article 21 presence
- `typecheck`: TypeScript correctness
- `build`: App Router production build success

## 6. Start the app locally

Run:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Expected first-run behavior:

- the homepage loads without secrets errors in the shell
- `/api/health` returns JSON
- the chat route works only after Gemini + Pinecone are configured

## 7. Run the evaluation harness

Run:

```bash
npm run eval
```

Outputs:

- `EVAL_REPORT.md`
- `data/generated/eval-results.json`

## 8. Build the submission zip

Run:

```bash
npm run package:submission
```

Output:

- `dist/together-healthcare-agent-submission.zip`
