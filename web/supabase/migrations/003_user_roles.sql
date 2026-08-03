-- User roles for admin console (run in Supabase SQL Editor after 001/002)
-- role: 'user' | 'admin'

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  updated_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

-- Users can read their own role (for UI badges)
drop policy if exists "user_roles_select_own" on public.user_roles;
create policy "user_roles_select_own"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

-- Writes only via service role (admin API). No client insert/update/delete policies.
