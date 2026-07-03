# RUN_STATE — Praxis build progress

Last updated: 2026-07-04 (session: initial Phase 0 build)

## Current phase: Phase 0 — scaffold + theme + app shell

- [x] Blueprint agreed with Yash (see AGENTS.md for locked decisions)
- [x] create-next-app scaffold created at Desktop/praxis (TS, Tailwind, App Router, no src dir)
- [x] AGENTS.md blueprint written
- [ ] npm install (base deps + motion + lucide-react) — running in background
- [ ] Read node_modules/next/dist/docs/ for breaking changes before writing code
- [ ] Dark theme tokens + per-track accent variables in globals.css
- [ ] App shell: sidebar (track switcher + nav), topbar (global stats popover)
- [ ] L0 dashboard page with seed data from lib/seed.ts (replaced by DB in Phase 3)
- [ ] npm run build passes clean
- [ ] git commit Phase 0

## Waiting on Yash (needed for Phase 1, not Phase 0)

- Supabase account + new project (free tier) → URL + anon key + service role key
- Gemini API key (free, aistudio.google.com) → GEMINI_API_KEY
- Optional fallback keys: Groq, OpenRouter, Serper, Exa (Tavily already installed via tvly CLI)

## Notes

- n8n is installed locally on Yash's machine; used from Phase 4 only.
- First track to build end-to-end in Phase 1: SEO/GEO.
