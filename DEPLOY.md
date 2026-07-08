# Deploying Praxis to Vercel

The app is a standard Next.js 16 project and is deploy-ready as-is. No code
changes are needed. It is already on GitHub
(github.com/yashrastogi069-dev/TeachBoard, branch master).

## What Vercel needs

1. The repo (or a `vercel --prod` from the local folder).
2. All environment variables from `.env.local`, set on the Vercel project.
   NEXT_PUBLIC_* vars are read at build time, so they must be set before the
   build. The 12 keys:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - GEMINI_API_KEY
   - OPENROUTER_API_KEY
   - NVIDIA_API_KEY
   - TAVILY_API_KEY
   - SERPER_API_KEY
   - FIRECRAWL_API_KEY
   - SCRAPEGRAPH_API_KEY
   - NTFY_TOPIC
   - CRON_SECRET

## Fastest path (CLI, secrets never typed by hand)

From the repo root, in a normal terminal:

```bash
vercel login          # one-time, opens the browser
bash scripts/deploy-vercel.sh
```

`scripts/deploy-vercel.sh` links the project, pushes every `.env.local` var to
the production environment, and deploys. Re-running it is safe.

## Alternative: dashboard import

1. vercel.com/new -> Import `yashrastogi069-dev/TeachBoard`.
2. Framework preset auto-detects Next.js. Leave build settings default.
3. Paste the 12 env vars above (Environment: Production, and Preview if you
   want preview deploys to work).
4. Deploy.

## After the first deploy (required for login to work)

In the Supabase dashboard -> Authentication -> URL Configuration:
1. Set **Site URL** to `https://<your-project>.vercel.app`.
2. Add the same domain to **Redirect URLs**.

Then sign in on the live site with the existing account.

## Notes

- Cron stays on local n8n (AGENTS.md decision). Vercel Hobby allows only 2
  cron jobs and daily-only schedules, and this app has 3 jobs, so n8n remains
  the scheduler. To point n8n at production instead of localhost, change the
  URL in each `n8n/*.json` workflow from `http://localhost:3000` to the Vercel
  domain (keep the `x-cron-key` header).
- API routes set `maxDuration = 300`. On Hobby with Fluid Compute (default on
  for new projects) this is fine. Both courses are already generated, so the
  only long call in normal use is first-open lesson generation (about 30-60s),
  well within limits.
- The `proxy.ts` middleware (this Next.js version's name for middleware) works
  the same on Vercel as locally.
