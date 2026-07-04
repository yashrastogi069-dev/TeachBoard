# MEMORY.md — session knowledge for any Claude working on Praxis

Hard-won context that is NOT in the code. Read after CLAUDE.md/AGENTS.md.

## Yash's rules (apply always)

- No em dashes in any prose written to him. Ask before major/irreversible
  decisions, otherwise do not stall; he wants momentum and hates token waste.
- No placeholders or "implement later" comments; complete code only.
- Additive modular changes; never rewrite working structure without need.
- Post progress updates on long tasks; never go silent.
- He reviews visually: verify UI work with a real screenshot before shipping
  (agent-browser CLI is installed; `agent-browser open <url> --viewport
  1440x900` then `agent-browser screenshot --full <path>`; close when done).

## Environment facts

- Windows 11, PowerShell 5.1 quirks: avoid complex quoting in one-liners
  (node -e with nested quotes breaks; prefer Write tool + script file).
  PowerShell tool once threw EPERM uv_spawn; retry via the Bash tool instead.
- Two Claude installs on this machine; skills live in
  C:\Users\win 10\.claude-account2\skills\ and load after /skills refresh.
- n8n is installed and used locally by Yash (his job-radar project uses it);
  n8n workflows must call localhost:3000 with the x-cron-key header.
- Yash may keep his own dev server on port 3000; test on other ports (3177).
- gh CLI is NOT installed; plain git push works (credential manager has auth).
- The background-session edit guard requires worktree isolation for edits in
  the repo; the settings.json opt-out was DENIED by the permission system,
  do not retry it. EnterWorktree(name) works when session cwd is inside the
  repo; after ExitWorktree the cwd may revert to Desktop and EnterWorktree
  will fail until you cd context back (PowerShell Set-Location does not move
  the session cwd; only EnterWorktree/ExitWorktree do).

## Secrets

- Keys live in Desktop/keys.evn (human-formatted labels). Parsed into
  praxis/.env.local (and copied into the build worktree). NEVER print values;
  list only names/lengths. Available: OPENROUTER, TAVILY, FIRECRAWL, NVIDIA,
  SCRAPEGRAPH, SERPER, GEMINI, SUPABASE url/anon/service-role. NOT available:
  YouTube API, Groq. NTFY_TOPIC=yash-TeachBoard (test push succeeded, 200).

## Decisions already made (do not relitigate; details in AGENTS.md)

- Supabase over Nhost/PocketBase/Neon (auth + free + works with Vercel).
- Smart Next.js backend; n8n only for background jobs; frontend never calls
  external APIs directly.
- AI chain gemini->openrouter->nvidia; research chain cache->tavily->serper->jina.
- Card-sort uses tap-to-place, not drag (accessibility + mobile).
- Videos: YouTube search-link cards (no API key); upgradeable later.
- Phase 1 scope: SEO/GEO + Digital Marketing only; other tracks stay
  active=false until Yash says otherwise.

## Where things are

- Blueprint/rules: AGENTS.md (CLAUDE.md includes it). Design: DESIGN.md.
- Live progress + exact next steps: RUN_STATE.md (kept current religiously).
- Global memory (cross-project): C:\Users\win 10\.claude-account2\projects\
  C--Users-win-10-Desktop\memory\ (project-praxis-learning-portal.md).
