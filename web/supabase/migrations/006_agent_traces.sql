-- P5: structured agent traces for audit / admin (run in Supabase SQL Editor after 005)

create table if not exists public.agent_traces (
  id uuid primary key,
  session_id text,
  user_id uuid references auth.users(id) on delete set null,
  question text not null,
  mode text not null default 'agent',
  status text not null check (
    status in ('ok', 'error', 'blocked', 'awaiting_plan')
  ),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_ms integer,
  steps jsonb not null default '[]'::jsonb,
  answer_preview text,
  sources text[] not null default '{}',
  meta jsonb not null default '{}'::jsonb
);

create index if not exists agent_traces_started_idx
  on public.agent_traces (started_at desc);

create index if not exists agent_traces_session_idx
  on public.agent_traces (session_id)
  where session_id is not null;

create index if not exists agent_traces_user_idx
  on public.agent_traces (user_id, started_at desc)
  where user_id is not null;

alter table public.agent_traces enable row level security;

-- No client policies: only service role (admin API) reads/writes traces.
drop policy if exists "agent_traces_no_client" on public.agent_traces;
