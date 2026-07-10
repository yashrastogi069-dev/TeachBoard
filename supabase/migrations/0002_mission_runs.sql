-- Praxis schema v2: mission runs (branching-simulation mission block).
-- Run once in the Supabase SQL editor (or psql), same as 0001_init.sql.

create table if not exists mission_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  block_index int not null,
  path jsonb not null,             -- [{stageId, choiceId, quality}]
  metrics jsonb not null,          -- {trajectory: [...], finals: {...}}
  reflection text,
  expert_review jsonb,             -- {score, perDecision: [...], summary}
  outcome text check (outcome in ('success', 'partial', 'failed')),
  variant int not null default 0,
  mastery int,
  created_at timestamptz not null default now()
);
create index if not exists mission_runs_user_lesson_idx on mission_runs (user_id, lesson_id);

alter table mission_runs enable row level security;

create policy "own select" on mission_runs for select to authenticated
  using (user_id = auth.uid());
create policy "own insert" on mission_runs for insert to authenticated
  with check (user_id = auth.uid());
create policy "own update" on mission_runs for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
