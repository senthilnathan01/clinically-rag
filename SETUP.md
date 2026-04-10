# Setup Guide

## 1. Install and prepare local data

```bash
npm install
npm run prepare:data
cp .env.example .env.local
```

This parses the three provided PDFs into `data/generated`.

## 2. Configure Vertex AI auth

References:

- [Get a Google Cloud API key for Vertex AI express mode](https://cloud.google.com/vertex-ai/generative-ai/docs/start/api-keys?usertype=expressmode)
- [Google Gen AI SDK for JS: Vertex AI initialization](https://googleapis.github.io/js-genai/)

Choose one path.

If both paths are populated, the app prefers `GOOGLE_API_KEY` and skips project/location-based Vertex initialization.

### Option A: Vertex AI express mode with API key

```bash
GOOGLE_API_KEY=...
GEMINI_MODEL=gemini-3-flash-preview
GEMINI_TOOLS_MODEL=gemini-3-flash-preview
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
```

### Option B: standard Vertex AI auth with ADC or service account credentials

For local development with Application Default Credentials:

```bash
gcloud auth application-default login
```

Then set:

```bash
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=global
GEMINI_MODEL=gemini-3-flash-preview
GEMINI_TOOLS_MODEL=gemini-3-flash-preview
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
```

If you already use different Gemini Flash aliases in Vertex AI, keep those exact model IDs instead of the examples above.

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
- if you later migrate retrieval to Vertex AI RAG Engine, use a supported regional location instead of relying on the `global` default used here for model calls

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
