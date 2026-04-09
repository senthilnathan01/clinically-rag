# Eval Report

Generated: 2026-04-10

## Status snapshot

- Implemented: `scripts/eval.ts` runs all 11 eval prompts through the LangGraph workflow and writes both Markdown and JSON outputs.
- Syntax-checked: yes.
- Locally validated: partial.
- Fully run and verified with live Gemini answers: blocked in this environment because no `GEMINI_API_KEY` or Pinecone credentials were available.

## Local validation completed

Commands run successfully:

```bash
npm run prepare:data
npm run ingest
npm run smoke
npm run typecheck
npm run build
```

Observed results:

- Corpus PDF parsed into 21 structured article records.
- Eval PDF parsed into 11 structured questions.
- Ingestion completed with 21 indexed articles and 808 chunks.
- Article 21 was confirmed present in the local index manifest.
- Next.js production build completed successfully.
- Local homepage and `/api/health` route responded successfully.

## Known limitation before secrets are added

The automated eval harness depends on Gemini model calls for routing, synthesis, and critic verification. Until `GEMINI_API_KEY` and Pinecone credentials are configured, `npm run eval` should be considered implemented but not fully verified.

## Expected next validation step

After adding real credentials:

```bash
npm run eval
```

Then inspect:

- `EVAL_REPORT.md`
- `data/generated/eval-results.json`

Priority queries to inspect manually after the automated run:

- `Q05` because it depends on the drug discovery sources
- `Q09` because it tests multi-article causal synthesis
- `Q11` because it depends on live Article 21 ingestion
