# RUN_STATE — Praxis build progress

Last updated: 2026-07-04 (session: initial Phase 0 build)

## Current phase: Phase 0 — COMPLETE (pending Yash's visual review)

- [x] Blueprint agreed with Yash (see AGENTS.md for locked decisions)
- [x] create-next-app scaffold created at Desktop/praxis (TS, Tailwind, App Router, no src dir)
- [x] AGENTS.md blueprint written (incl. ntfy alerts, System Health panel, free-tier failsafes)
- [x] npm install (base deps + motion + lucide-react)
- [x] Read node_modules/next/dist/docs/ (Next 16: async params, PageProps helpers; nothing breaking for Phase 0)
- [x] Dark theme tokens + per-track accent variables in globals.css (data-accent switching)
- [x] App shell: sidebar (track switcher + nav), topbar (streak chip + global stats popover)
- [x] L0 dashboard page with seed data from lib/seed.ts (replaced by DB in Phases 1-3):
      resume card, mastery rings, activity chart, today plan, deadlines,
      recommendations, recent scores, system health (quotas + exact error log)
- [x] npm run build passes clean (Next 16.2.10, Turbopack)
- [x] turbopack.root pinned in next.config.ts (stray lockfile in user home dir)
- [x] git commit Phase 0 on master (6fbe669) + polish commit

## Next up: Phase 1 (do not start until Yash reviews the Phase 0 UI)

1. Yash runs `npm run dev` in Desktop/praxis and reviews the dashboard look.
2. Supabase schema migration + auth wiring.
3. SEO/GEO track end-to-end: curriculum generation, lesson player with first
   3 artifact types (flowchart, quiz, card-sort), streaming Socratic tutor.
4. lib/notify.ts (ntfy push helper) + system_events writes from all API routes.

## Waiting on Yash (needed for Phase 1, not Phase 0)

- Supabase account + new project (free tier) → URL + anon key + service role key
- Gemini API key (free, aistudio.google.com) → GEMINI_API_KEY
- An ntfy topic name (any unique string; no signup needed) → NTFY_TOPIC
- Optional fallback keys: Groq, OpenRouter, Serper, Exa (Tavily already installed via tvly CLI)

## Notes

- n8n is installed locally on Yash's machine; used from Phase 4 only.
- First track to build end-to-end in Phase 1: SEO/GEO.
- Background-session edit guard: work in a git worktree (EnterWorktree) for
  code changes; merge back with --ff-only when verified.
