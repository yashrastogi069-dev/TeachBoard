-- Praxis schema v1. Run once in the Supabase SQL editor (or psql).
-- Content tables are written only by the server (service role); user tables
-- are protected by row level security on auth.uid().

create extension if not exists pgcrypto;

-- ---------- content ----------

create table if not exists skill_tracks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  tagline text not null default '',
  accent text not null default 'seo',
  sort_order int not null default 0,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists modules (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references skill_tracks(id) on delete cascade,
  slug text not null,
  title text not null,
  summary text not null default '',
  difficulty text not null default 'basic' check (difficulty in ('basic','advanced','pro')),
  sort_order int not null default 0,
  est_minutes int not null default 60,
  created_at timestamptz not null default now(),
  unique (track_id, slug)
);

create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  slug text not null,
  title text not null,
  sort_order int not null default 0,
  content jsonb, -- block array; null until generated on first open
  created_at timestamptz not null default now(),
  unique (module_id, slug)
);

create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  type text not null default 'scenario' check (type in ('scenario','project','quiz')),
  title text not null,
  brief text not null default '',
  rubric jsonb not null default '[]',
  max_score int not null default 100,
  pass_threshold int not null default 70,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists resource_cache (
  id uuid primary key default gen_random_uuid(),
  topic_key text not null,
  source text not null,
  kind text not null default 'article' check (kind in ('video','article','news')),
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);
create index if not exists resource_cache_topic_idx on resource_cache (topic_key, kind);

-- ---------- user data ----------

create table if not exists progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('not_started','in_progress','completed')),
  mastery numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_no int not null default 1,
  answer text not null,
  score numeric,
  rubric_scores jsonb,
  feedback jsonb,
  status text not null default 'grading' check (status in ('grading','graded','error')),
  created_at timestamptz not null default now()
);

create table if not exists deadlines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id uuid references modules(id) on delete set null,
  title text not null,
  due_date date not null,
  status text not null default 'active' check (status in ('active','met','missed')),
  created_at timestamptz not null default now()
);

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  ref_id uuid,
  minutes int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists activity_log_user_time_idx on activity_log (user_id, created_at);

create table if not exists tutor_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete set null,
  assessment_id uuid references assessments(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists tutor_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references tutor_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('next_module','revision','resource')),
  text text not null,
  track_id uuid references skill_tracks(id) on delete set null,
  status text not null default 'active' check (status in ('active','done','dismissed')),
  created_at timestamptz not null default now()
);

create table if not exists job_goals (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  weights jsonb not null default '{}', -- {"seo-geo": 0.6, "analytics": 0.4}
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists certifications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null default '',
  status text not null default 'planned' check (status in ('planned','in_progress','acquired')),
  progress_pct int not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- observability ----------

create table if not exists api_usage (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  endpoint text not null default '',
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  est_cost_usd numeric not null default 0,
  ok boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists api_usage_time_idx on api_usage (created_at);

create table if not exists system_events (
  id uuid primary key default gen_random_uuid(),
  severity text not null check (severity in ('error','warning','info')),
  source text not null,
  message text not null,
  created_at timestamptz not null default now()
);
create index if not exists system_events_time_idx on system_events (created_at desc);

-- ---------- row level security ----------

alter table skill_tracks enable row level security;
alter table modules enable row level security;
alter table lessons enable row level security;
alter table assessments enable row level security;
alter table resource_cache enable row level security;
alter table progress enable row level security;
alter table submissions enable row level security;
alter table deadlines enable row level security;
alter table activity_log enable row level security;
alter table tutor_sessions enable row level security;
alter table tutor_messages enable row level security;
alter table recommendations enable row level security;
alter table job_goals enable row level security;
alter table certifications enable row level security;
alter table api_usage enable row level security;
alter table system_events enable row level security;

-- content + observability: readable when signed in, written by service role only
create policy "read content" on skill_tracks for select to authenticated using (true);
create policy "read content" on modules for select to authenticated using (true);
create policy "read content" on lessons for select to authenticated using (true);
create policy "read content" on assessments for select to authenticated using (true);
create policy "read content" on resource_cache for select to authenticated using (true);
create policy "read content" on api_usage for select to authenticated using (true);
create policy "read content" on system_events for select to authenticated using (true);
create policy "read content" on job_goals for select to authenticated using (true);

-- certifications: solo-user app, signed-in user manages them
create policy "own certs" on certifications for all to authenticated using (true) with check (true);

-- user tables: owner only
create policy "own rows" on progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on submissions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on deadlines for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on activity_log for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on tutor_sessions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on recommendations for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own messages" on tutor_messages for all to authenticated
  using (exists (select 1 from tutor_sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from tutor_sessions s where s.id = session_id and s.user_id = auth.uid()));

-- ---------- seed ----------

insert into skill_tracks (slug, title, tagline, accent, sort_order, active) values
  ('seo-geo', 'SEO / GEO', 'Rank in search engines and AI answer engines', 'seo', 1, true),
  ('digital-marketing', 'Digital Marketing', 'Campaigns, funnels, paid and organic growth', 'marketing', 2, true),
  ('analytics', 'GA4 & Search Console', 'Measure, audit and report like an analyst', 'analytics', 3, false),
  ('ai-automation', 'AI Automation', 'Agents, workflows and n8n in real businesses', 'ai', 4, false),
  ('finance', 'Finance', 'Read numbers, build budgets, defend decisions', 'finance', 5, false)
on conflict (slug) do nothing;

insert into job_goals (role, weights, sort_order) values
  ('SEO / Content Analyst', '{"seo-geo": 0.7, "analytics": 0.3}', 1),
  ('Digital Marketing Coordinator', '{"digital-marketing": 0.5, "analytics": 0.25, "seo-geo": 0.25}', 2),
  ('Marketing Automation Associate', '{"ai-automation": 0.6, "digital-marketing": 0.4}', 3);

insert into certifications (name, provider, status, progress_pct, sort_order) values
  ('Google Analytics 4 Certification', 'Google Skillshop', 'planned', 0, 1),
  ('Google Ads Search Certification', 'Google Skillshop', 'planned', 0, 2),
  ('HubSpot Inbound Marketing', 'HubSpot Academy', 'planned', 0, 3);
