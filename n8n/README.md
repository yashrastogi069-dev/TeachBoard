# Praxis n8n workflows

Three background jobs that keep Praxis fresh while the app itself stays
fully functional without them (AGENTS.md rule 2). They run on the n8n
instance installed locally on this machine and call the Next.js cron
routes over localhost.

## Import steps

1. Start n8n locally and open its editor (usually http://localhost:5678).
2. For each JSON file in this folder: Workflows -> Add workflow ->
   Import from File... -> pick the file.
3. Open the imported workflow's HTTP Request node and replace
   `PASTE_CRON_SECRET_HERE` in the `x-cron-key` header with the value of
   `CRON_SECRET` from `praxis/.env.local`.
4. Activate the workflow (toggle top right).

The target URL in all three is `http://localhost:3000/api/cron/...`.
If the dev server runs on another port, or the app moves to Vercel,
change the URL in the HTTP Request node (and keep the header).

## The three workflows

| File | Schedule | Route | What it does |
| --- | --- | --- | --- |
| `keepalive.json` | daily 08:00 | `/api/cron/keepalive` | Pings Supabase so the free-tier project never pauses after 7 idle days. |
| `refresh.json` | daily 02:00 | `/api/cron/refresh` | Pulls fresh industry news per active track into `resource_cache` for the dashboard insights feed. |
| `deadlines.json` | daily 09:00 | `/api/cron/deadlines` | Pushes ntfy reminders for deadlines due within a day and marks overdue ones missed. |

Every run logs into `system_events` (visible in the dashboard System
Health panel), and failures push to the ntfy topic, so a silent breakage
is impossible.
