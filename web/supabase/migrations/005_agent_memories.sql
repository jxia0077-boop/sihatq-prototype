-- P2: cross-session agent memories (run in Supabase SQL Editor after 004)

create table if not exists public.agent_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  scope text not null check (scope in ('user', 'project', 'session')),
  category text not null check (
    category in ('preference', 'correction', 'project_knowledge', 'reference')
  ),
  content text not null,
  source_session_id text,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists agent_memories_user_scope_idx
  on public.agent_memories (user_id, scope, created_at desc);

create index if not exists agent_memories_session_idx
  on public.agent_memories (source_session_id)
  where source_session_id is not null;

alter table public.agent_memories enable row level security;

-- Authenticated users read: own rows + project-scope rows
drop policy if exists "agent_memories_select" on public.agent_memories;
create policy "agent_memories_select"
  on public.agent_memories for select
  to authenticated
  using (
    scope = 'project'
    or auth.uid() = user_id
  );

-- Users insert only their own user/session memories
drop policy if exists "agent_memories_insert_own" on public.agent_memories;
create policy "agent_memories_insert_own"
  on public.agent_memories for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and scope in ('user', 'session')
  );

drop policy if exists "agent_memories_delete_own" on public.agent_memories;
create policy "agent_memories_delete_own"
  on public.agent_memories for delete
  to authenticated
  using (auth.uid() = user_id and scope in ('user', 'session'));

-- Seed project-level knowledge (readable by all signed-in users)
insert into public.agent_memories (user_id, scope, category, content)
select null, 'project', 'project_knowledge', v.content
from (
  values
    ('SihatQ is preventive education for Malaysia — never diagnose or prescribe.'),
    ('Prefer citing NHMS / DOSM public statistics when discussing national context.'),
    ('Always remind users to consult a qualified clinician for personal medical decisions.')
) as v(content)
where not exists (
  select 1 from public.agent_memories m
  where m.scope = 'project' and m.content = v.content
);
