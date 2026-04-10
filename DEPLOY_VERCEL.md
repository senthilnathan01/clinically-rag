# Deploy to Vercel

## Dashboard flow

1. Push this repo to GitHub.
2. Open [Vercel Dashboard](https://vercel.com/dashboard).
3. Click `Add New...` -> `Project`.
4. Import the repository.
5. Keep the default Next.js build settings.
6. Add these environment variables for Production, Preview, and Development:

```bash
GEMINI_API_KEY
GEMINI_MODEL
GEMINI_TOOLS_MODEL
GEMINI_EMBEDDING_MODEL
PINECONE_API_KEY
PINECONE_INDEX_NAME
PINECONE_NAMESPACE
PINECONE_HOST
NEXT_PUBLIC_APP_URL
ENABLE_DEBUG_TRACES
```

7. Deploy once.
8. Set `NEXT_PUBLIC_APP_URL` to the real production URL.
9. Redeploy.

## Local deploy flow with CLI

```bash
npm i -g vercel
vercel login
vercel
vercel env pull .env.local
vercel --prod
```

## After deployment

1. Open the production URL.
2. Confirm the empty state shows only the minimal chat shell.
3. Confirm the first message transitions into chat mode.
4. Confirm `/api/health` returns JSON.
5. Run ingestion locally with the same production env vars:

```bash
npm run ingest
```

6. Ask these in production:
   - `Q01`
   - `Q05`
   - `Q09`
   - `Q11`

You should see:

- streamed answer text
- tiny left-aligned phase status beneath the latest user prompt
- expandable reasoning per assistant answer
- inline citations that reveal compact source details
