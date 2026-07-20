-- Praxis schema v3: spaced-repetition review state for flashcard-deck blocks
-- (TEACHING.md section 4). Run once in the Supabase SQL editor (or psql),
-- same as 0001_init.sql and 0002_mission_runs.sql. Not auto-applied: this
-- repo has no DDL execution path, so apply it by hand alongside the others.

create table if not exists review_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_key text not null,             -- "lessonId:deckId:cardId"
  ease_factor numeric not null default 2.5,
  interval_days numeric not null default 0,
  due_at timestamptz not null default now(),
  reps int not null default 0,
  lapses int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, card_key)
);
create index if not exists review_state_user_due_idx on review_state (user_id, due_at);

alter table review_state enable row level security;

create policy "own select" on review_state for select to authenticated
  using (user_id = auth.uid());
create policy "own insert" on review_state for insert to authenticated
  with check (user_id = auth.uid());
create policy "own update" on review_state for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
