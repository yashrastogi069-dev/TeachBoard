# RUN_STATE — Praxis build progress

Last updated: 2026-07-04, FULL BUILD SHIPPED (phases 0 through 5 complete).
Read CLAUDE.md -> AGENTS.md (rules/architecture), DESIGN.md (design system),
MEMORY.md (session gotchas) before touching anything.

## WHERE WORK HAPPENS (critical for any resuming session)

- Repo: C:\Users\win 10\Desktop\praxis, remote github.com/yashrastogi069-dev/TeachBoard (branch master).
- Active work: git worktree `.claude/worktrees/praxis-build`, branch `worktree-praxis-build`.
  Ship flow: commit in worktree -> `git -C <main> merge --ff-only worktree-praxis-build`
  -> `git -C <main> push origin master` -> keep worktree for continued work.
- `.env.local` exists in main checkout AND build worktree (12 keys incl.
  CRON_SECRET + NTFY_TOPIC=yash-TeachBoard). NEVER print values. No YouTube
  key, no Groq key.
- Build/verify: `npm run build`, `npm test` inside the worktree.
  A dev server may already be running for this worktree (check port 3001);
  Yash may run his own on 3000. Use 3177+ for new test servers.

## STATUS: ALL PHASES COMPLETE (2026-07-04)

- Phase 0: dark shell, tokens, dashboard preview. DONE (commits 6fbe669..c02d802).
- Phase 1a: Supabase schema APPLIED in Yash's project (16 tables + RLS + seed:
  5 tracks, 3 job_goals, 3 certifications verified live). Auth works; Yash's
  account exists (yashrastogi069@gmail.com). lib/supabase/*, proxy.ts login
  gate, lib/notify.ts, lib/ai/provider.ts (gemini->openrouter->nvidia),
  lib/apis/research.ts (cache->tavily->serper->jina). DONE.
- Phase 1b: lib/blocks.ts (11 block schemas + scoring), lib/curriculum.ts,
  routes /api/curriculum /api/lesson /api/progress /api/tutor,
  components/artifacts (Markdown, SimpleBlocks, InteractiveBlocks,
  ArtifactRenderer), TutorContext + streaming Copilot, track/module/lesson
  pages + LessonPlayer. DONE and verified live.
- Phase 2: /api/grade (strict rubric grading), /assess/[id] +
  AssessmentWorkspace (submit, per-criterion results, retry, attempts). DONE.
- Phase 3: lib/dashboard.ts (all panels live, fail-soft), live dashboard page,
  progress page, settings page (+ sign out), empty states everywhere,
  seed.ts stripped to types. DONE.
- Phase 4: /api/cron/keepalive + /api/cron/refresh (per-track news into
  resource_cache kind=news) + /api/cron/deadlines (reminders + mark missed),
  all guarded by x-cron-key == CRON_SECRET; n8n/ folder with README +
  3 importable workflows (keepalive 08:00, refresh 02:00, deadlines 09:00;
  replace PASTE_CRON_SECRET_HERE after import). DONE.
- Phase 5: vitest.config.ts + tests/blocks.test.ts (9 tests, all passing),
  `npm test` script. Progress + Settings pages shipped and nav enabled. DONE.

## CONTENT GENERATED (live in Supabase, generate-once-cache-forever)

- SEO/GEO: 6 modules (basic->pro), 24 lessons, 6 assessments. First lesson
  content generated and verified (text/analogy/worked-example/compare/quiz/
  scenario blocks render; NZ-localised examples).
- Digital Marketing: 6 modules, 29 lessons, 6 assessments.
- Remaining lesson content generates on first open (by design).
- Tutor verified: streaming, Socratic, lesson-context aware.

## RUNTIME VERIFICATION DONE (2026-07-04)

Login -> dashboard 200 -> both track pages render modules -> lesson content
generation -> lesson player renders all artifact blocks -> tutor streams.
Screenshots delivered to Yash (dashboard, both tracks, lesson player).

## WHAT'S LEFT FOR YASH (not code)

1. Change the account password (he used a temporary one).
2. Import the 3 n8n workflows (n8n/README.md has steps + the secret swap).
3. Optional: deploy to Vercel Hobby when ready (add env vars there; Vercel
   cron can replace n8n by hitting the same /api/cron/* routes with the header).
4. New tracks later: flip `active` in skill_tracks + lib/tracks.ts, open the
   track page, click "Build my course". No new code needed.

## KNOWN WATCH-OUTS

- OPENROUTER_MODEL default "meta-llama/llama-3.3-70b-instruct:free" may 404 if
  OpenRouter renames free models; override via env if grading falls back oddly.
- supabase-js nested selects are typed loosely; the code casts via `as unknown as`.
- PageProps<'/route'> helper types are global (Next 16), no import needed.
- Themes: data-accent wrapper drives all colors; never hardcode hex in components.
- Lesson blocks below the fold animate in on scroll (whileInView); a full-page
  screenshot shows them as blank space. Not a bug.
