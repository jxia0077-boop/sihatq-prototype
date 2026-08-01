-- SihatQ MVP schema + Row Level Security
-- Run this in Supabase Dashboard → SQL Editor → New query → Run

-- Profiles (no NRIC / exact birthday / precise address)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  age_group text not null,
  gender text not null,
  state text not null,
  lifestyle jsonb not null default '{}'::jsonb,
  family_history jsonb not null default '[]'::jsonb,
  privacy_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

-- Public health reference stats (NHMS etc.)
create table if not exists public.health_reference_stats (
  id uuid primary key default gen_random_uuid(),
  indicator text not null,
  year int not null,
  state text,
  age_group text,
  gender text,
  value numeric not null,
  unit text not null default 'percent',
  source_title text not null,
  source_url text,
  created_at timestamptz not null default now()
);

create unique index if not exists health_reference_stats_indicator_year_idx
  on public.health_reference_stats (indicator, year)
  where state is null and age_group is null and gender is null;

-- User risk assessment results
create table if not exists public.risk_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  risk_category text not null,
  risk_level text not null,
  explanation text not null,
  comparison_text text not null,
  recommendations jsonb not null default '[]'::jsonb,
  your_score numeric not null default 50,
  national_benchmark numeric not null default 50,
  created_at timestamptz not null default now()
);

create index if not exists risk_results_user_id_created_at_idx
  on public.risk_results (user_id, created_at desc);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.health_reference_stats enable row level security;
alter table public.risk_results enable row level security;

-- profiles: users manage only their own row
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = user_id);

-- health_reference_stats: readable by authenticated users; no client writes
drop policy if exists "health_stats_select_authenticated" on public.health_reference_stats;
create policy "health_stats_select_authenticated"
  on public.health_reference_stats for select
  to authenticated
  using (true);

-- risk_results: users manage only their own rows
drop policy if exists "risk_results_select_own" on public.risk_results;
create policy "risk_results_select_own"
  on public.risk_results for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "risk_results_insert_own" on public.risk_results;
create policy "risk_results_insert_own"
  on public.risk_results for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "risk_results_delete_own" on public.risk_results;
create policy "risk_results_delete_own"
  on public.risk_results for delete
  to authenticated
  using (auth.uid() = user_id);

-- Seed NHMS 2023 national key findings (manual MVP seed)
delete from public.health_reference_stats
where year = 2023
  and indicator in ('diabetes', 'hypertension', 'high_cholesterol', 'overweight_obesity')
  and state is null
  and age_group is null
  and gender is null;

insert into public.health_reference_stats
  (indicator, year, state, age_group, gender, value, unit, source_title, source_url)
values
  ('diabetes', 2023, null, null, null, 15.6, 'percent', 'NHMS 2023 Key Findings', 'https://iku.gov.my/nhms-2023'),
  ('hypertension', 2023, null, null, null, 29.2, 'percent', 'NHMS 2023 Key Findings', 'https://iku.gov.my/nhms-2023'),
  ('high_cholesterol', 2023, null, null, null, 33.3, 'percent', 'NHMS 2023 Key Findings', 'https://iku.gov.my/nhms-2023'),
  ('overweight_obesity', 2023, null, null, null, 54.4, 'percent', 'NHMS 2023 Key Findings', 'https://iku.gov.my/nhms-2023');
