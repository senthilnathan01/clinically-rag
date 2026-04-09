# Deploy to Vercel

References:

- [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [Projects and deployments](https://vercel.com/docs/concepts/get-started/deploy)
- [vercel deploy](https://vercel.com/docs/cli/deploy)

## Dashboard path

1. Push this folder to a GitHub repository.
2. Open [Vercel Dashboard](https://vercel.com/dashboard).
3. Click `Add New...`.
4. Click `Project`.
5. Import the Git repository that contains this app.
6. In the import screen:
   - Framework preset should auto-detect as `Next.js`
   - Root directory should be the repository root
   - Build command should remain default
   - Output directory should remain default
7. Before clicking `Deploy`, open `Environment Variables`.
8. Add these variables for `Production`, `Preview`, and `Development`:

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

9. For `NEXT_PUBLIC_APP_URL`, use your production deployment URL after the first deploy, then redeploy once.
10. Click `Deploy`.

## CLI path

1. Install Vercel CLI:

```bash
npm i -g vercel
```

2. Log in:

```bash
vercel login
```

3. From the project root:

```bash
vercel
```

4. Answer the prompts:
   - Link to existing project? `No` for the first deploy
   - Scope: choose your personal/team scope
   - Project name: `together-healthcare-agent`
   - Directory: `.` 
   - Override build settings: `No`

5. Add env vars either in the dashboard or with:

```bash
vercel env add GEMINI_API_KEY production
vercel env add GEMINI_MODEL production
vercel env add GEMINI_TOOLS_MODEL production
vercel env add GEMINI_EMBEDDING_MODEL production
vercel env add PINECONE_API_KEY production
vercel env add PINECONE_INDEX_NAME production
vercel env add PINECONE_NAMESPACE production
vercel env add PINECONE_HOST production
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add ENABLE_DEBUG_TRACES production
```

6. Pull envs locally if needed:

```bash
vercel env pull .env.local
```

7. Redeploy:

```bash
vercel --prod
```

## Post-deploy checklist

1. Open the deployment URL.
2. Confirm `/api/health` returns `configured: true`.
3. Run ingestion locally with the same env values:

```bash
npm run ingest
```

4. Ask at least these queries in production:
   - `Q01`
   - `Q05`
   - `Q09`
   - `Q11`
5. Confirm the UI shows:
   - streaming answer text
   - structured reasoning trace
   - article citation chips
   - source inspector cards
