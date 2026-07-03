<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Praxis — personal skills professor (project blueprint)

Praxis is Yash's private learning portal: it teaches complex, real-world corporate
skills (AI Automation, Digital Marketing, GA4, GSC, SEO/GEO, Finance, more) with
interactive lessons, Socratic tutoring, strict rubric-graded practical tests, and
a progress dashboard. Top-class teaching quality and UI/UX are the #1 priority.

## Locked architecture decisions (do not re-litigate)

1. **Strong frontend + smart Next.js backend.** All AI calls and external API calls
   live in Next.js Route Handlers (`app/api/*`), written in TypeScript, streaming
   where possible. The frontend never calls external APIs directly.
2. **n8n runs LOCALLY on Yash's machine** and is used ONLY for background jobs:
   nightly resource enrichment, deadline reminders, weekly digest, Supabase
   keep-alive ping. The app must work 100% with n8n switched off.
3. **Database: Supabase free tier** (Postgres + Auth + RLS). Chosen over PocketBase,
   Neon, Turso, and local SQLite because it is genuinely free, has auth built in,
   and works both for local dev and Vercel deployment. Free-tier pause after 7 days
   of inactivity is mitigated by an n8n keep-alive ping workflow.
4. **AI failsafe chain (all free):** Gemini 2.5 Flash (primary, streaming) →
   Groq Llama 3.3 70B (fallback) → OpenRouter free models (last resort).
   Provider-agnostic wrapper in `lib/ai/provider.ts`.
5. **Research failsafe chain (cache-first, all free tiers):**
   `resource_cache` table → Tavily → Serper → Exa → Jina Reader (keyless).
   Every call is logged in `api_usage`; monthly budget guards stop a source
   before its free quota is burned.
6. **Content strategy: generate once, cache forever.** Curriculum/lessons are
   AI-generated per module, stored in Supabase, served instantly afterwards.
   Live AI is only used for tutor chat and grading.
7. **Interactive Artifact Engine:** lessons are JSONB block arrays; the AI emits
   a zod-validated spec choosing from a hand-built component library
   (flowchart, slider-sim, card-sort, tree-map, chart, compare, terminal-sim,
   quiz, scenario, video). Test blocks (quiz, card-sort, scenario, checkpoint)
   are auto-scored in the browser and synced to the DB.
8. **Deployment:** local dev first; deploy to Vercel Hobby when Phase 1 works.
9. **Failure visibility (mandatory for every feature):** every caught failure in
   API routes, grading, curriculum generation, or n8n jobs is (a) written to the
   `system_events` table with the exact error message, source, and timestamp,
   (b) pushed to Yash's phone via ntfy.sh (free, topic-based, no account; topic
   name in env var NTFY_TOPIC), and (c) surfaced in the dashboard System Health
   panel showing the exact error text. Helper: `lib/notify.ts` (`reportEvent`).
   ntfy itself failing must never break the main flow (fire-and-forget).
10. **Free-tier failsafes for every service:**
    - AI: Gemini → Groq → OpenRouter free models
    - Research: cache → Tavily → Serper → Exa → Jina Reader (keyless)
    - Videos: YouTube Data API → Piped/Invidious public API → plain YouTube
      search links rendered as cards
    - DB: Supabase free; if ever limited, migration path documented to Neon
      (same Postgres SQL) with Supabase Auth swapped for Auth.js
    - Hosting: Vercel Hobby; fallback Cloudflare Pages (next-on-pages)
    - Push alerts: ntfy.sh; fallback n8n local workflow sending Gmail
    - Cron: Vercel Cron; fallback n8n local schedule hitting the same routes

## Hard rules (from Yash, non-negotiable)

- No placeholders, no truncated code, no "implement later" comments. Ever.
- New features are modular, targeted additions; never rewrite or delete existing
  structural layout.
- "Done" check before finalizing any feature: graceful error handling (API failure
  must not crash the app) + progress verified as synced to the DB.
- No em dashes in any prose written for Yash.
- Never fabricate content quality: real-world, practical, applied teaching.
- Concept CLARITY is the #1 teaching metric: every lesson must define terms in
  plain language first, use a real-world analogy, then a worked practical
  example, then the interactive artifact, then a check-for-understanding test.
  If a concept can be shown instead of told, show it.

## Dashboard information architecture (multi-layer)

- **L0 Global dashboard** (`/`): detail-rich first page. Panels: overall mastery
  + per-track mastery rings, streak + weekly activity chart, today's plan,
  upcoming deadlines, latest scores with rubric breakdown links, active
  recommendations, resume-where-you-left-off card, and the System Health panel
  (API quota usage per provider + recent errors with exact error text).
- **L1 Track hub** (`/tracks/[track]`): track-scoped dashboard with module map,
  track mastery, track resources. Accent color switches per track.
- **L2 Module** (`/tracks/[track]/[module]`): lesson list + assessment status.
- **L3 Lesson player** (`.../[lesson]`): focus mode, tutor chat in side panel.
- Persistent sidebar (track switcher + global nav) and topbar global-stats popover
  keep L0 context reachable from any depth. Breadcrumbs on every level.

## Theming

Near-black base (`#0A0A0B` family), one `--accent` CSS variable set per track:
AI Automation cyan, Finance deep gold, Marketing electric purple, SEO emerald,
GA4/GSC amber, default indigo. All components reference the variable.

## Phase plan (scope firewall — finish and verify each phase first)

- **Phase 0 (current):** scaffold, dark theme tokens, app shell (sidebar, topbar,
  dashboard with seed data in `lib/seed.ts`, clearly marked as Phase 1 replacement).
- **Phase 1:** Supabase schema + auth, one track end-to-end (SEO/GEO first):
  curriculum generation, lesson player with 3 artifact types, streaming tutor.
- **Phase 2:** assessments, rubric grading, remediation loop, attempts history.
- **Phase 3:** dashboard metrics from real data, mastery, streaks, deadlines,
  recommendations.
- **Phase 4:** remaining artifact types, YouTube/Tavily enrichment, Vercel cron,
  n8n workflows (enrichment, reminders, keep-alive).
- **Phase 5:** remaining tracks + polish pass (frontend-design / animation skills),
  Vitest unit tests for artifact engine + Playwright smoke test.

## Database schema reference (implemented in Phase 1, `supabase/migrations/`)

skill_tracks, modules, lessons, assessments, submissions, progress, deadlines,
activity_log, tutor_sessions, tutor_messages, recommendations, resource_cache,
api_usage, system_events (error/alert log feeding the System Health panel and
ntfy pushes). Column detail lives in the migration files once created.

## Checkpointing

`RUN_STATE.md` in this folder records exactly what step the current run is on.
Update it after each meaningful step. Check it (and this file) before doing work.
