# Setup Guide

## 1. Install and prepare local data

```bash
npm install
npm run prepare:data
cp .env.example .env.local
```

This parses the three provided PDFs into `data/generated`.

## 2. Create a Gemini API key

Reference: [Gemini API keys](https://ai.google.dev/gemini-api/docs/api-key)

1. Open [Google AI Studio](https://aistudio.google.com/).
2. Open `Dashboard`.
3. Open `API Keys`.
4. Create an API key.
5. Put it in `.env.local` as:

```bash
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.1-pro-preview
GEMINI_TOOLS_MODEL=gemini-3.1-pro-preview-customtools
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
```

If your account shows different Gemini aliases, replace the example model names with the exact aliases shown in your console.

## 3. Create the Pinecone index

Reference: [Create a serverless index](https://docs.pinecone.io/docs/create-an-index)

1. Open [Pinecone Console](https://app.pinecone.io/).
2. Create a dense serverless index.
3. Set:
   - Name: `together-healthcare`
   - Metric: `cosine`
   - Dimension: match your Gemini embedding model output size
4. Copy these values into `.env.local`:

```bash
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=together-healthcare
PINECONE_NAMESPACE=together-healthcare
PINECONE_HOST=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENABLE_DEBUG_TRACES=false
```

Important:

- choose `Vector embeddings` when Pinecone asks what kind of data you have
- the index dimension must exactly match the embedding model output size

## 4. Ingest the corpus

```bash
npm run ingest
```

This:

- fetches and extracts all 21 article sources
- writes raw extracted text to `data/ingest/raw`
- builds `articles.json`, `chunks.json`, and `manifest.json`
- confirms whether Article 21 is present
- upserts vectors to Pinecone when Pinecone credentials are present

Note:

- articles 11 and 12 currently rely on documented override text under `data/overrides/` because direct publisher fetches returned `403`

## 5. Run local checks

```bash
npm run smoke
npm run typecheck
npm run build
```

## 6. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Expected UI:

- sparse empty state
- centered composer
- no dashboard panels
- bottom-docked composer after the first message

## 7. Run the eval harness

```bash
npm run eval
```

Outputs:

- `EVAL_REPORT.md`
- `data/generated/eval-results.json`

## 8. Package the submission

```bash
npm run package:submission
```

Output:

- `dist/together-healthcare-agent-submission.zip`
