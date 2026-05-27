-- ============================================================================
--  Job Ledger — Supabase Schema
--  Run this in Supabase Dashboard -> SQL Editor -> New Query -> paste & RUN.
-- ============================================================================

-- 1) JOBS TABLE -------------------------------------------------------------
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  last_date date not null,
  exam_date date,
  apply_link text not null,
  notes text,
  applied boolean not null default false,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_last_date_idx on public.jobs (last_date);
create index if not exists jobs_applied_idx on public.jobs (applied);

-- 2) updated_at TRIGGER -----------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

-- 3) ROW LEVEL SECURITY -----------------------------------------------------
alter table public.jobs enable row level security;

-- Anyone (anon + authenticated) can READ jobs.
drop policy if exists "jobs_select_public" on public.jobs;
create policy "jobs_select_public" on public.jobs
for select using (true);

-- Only the admin user (matched by email) can WRITE.
-- IMPORTANT: replace 'bidyadhar@joblegder.app' below if you changed REACT_APP_ADMIN_EMAIL.
drop policy if exists "jobs_insert_admin" on public.jobs;
create policy "jobs_insert_admin" on public.jobs
for insert with check (auth.jwt() ->> 'email' = 'bidyadhar@joblegder.app');

drop policy if exists "jobs_update_admin" on public.jobs;
create policy "jobs_update_admin" on public.jobs
for update using (auth.jwt() ->> 'email' = 'bidyadhar@joblegder.app')
           with check (auth.jwt() ->> 'email' = 'bidyadhar@joblegder.app');

drop policy if exists "jobs_delete_admin" on public.jobs;
create policy "jobs_delete_admin" on public.jobs
for delete using (auth.jwt() ->> 'email' = 'bidyadhar@joblegder.app');

-- ============================================================================
-- 4) ADMIN USER ------------------------------------------------------------
-- Manually create the admin user in Supabase Dashboard:
--   Authentication -> Users -> Add user -> Create new user
--     Email   : bidyadhar@joblegder.app
--     Password: Bidyadhar1!
--     Auto Confirm User: YES (toggle on)
-- This single account is what the admin signs in with (username "bidyadhar"
-- in the UI is mapped to this email behind the scenes).
-- ============================================================================
