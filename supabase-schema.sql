-- ============================================================================
--  Job Ledger — Supabase Schema (copy-paste this entire file into Supabase SQL Editor)
--  Dashboard → SQL Editor → New Query → paste → click RUN.
-- ============================================================================

-- 1) JOBS TABLE -------------------------------------------------------------
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  last_date date,
  exam_date date,
  apply_link text not null,
  notes text,
  app_username text,
  app_password text,
  start_date date,
  tags text,
  notified boolean not null default false,
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

-- Anyone (anon + authenticated) can READ jobs (public landing page).
drop policy if exists "jobs_select_public" on public.jobs;
create policy "jobs_select_public" on public.jobs
for select using (true);

-- Only the admin user (matched by email) can WRITE (except update which is public).
drop policy if exists "jobs_insert_admin" on public.jobs;
create policy "jobs_insert_admin" on public.jobs
for insert with check (auth.jwt() ->> 'email' = 'bidyadhar.sahu.cse.2022@nist.edu');

drop policy if exists "jobs_update_public" on public.jobs;
create policy "jobs_update_public" on public.jobs
for update using (true);

drop policy if exists "jobs_delete_admin" on public.jobs;
create policy "jobs_delete_admin" on public.jobs
for delete using (auth.jwt() ->> 'email' = 'bidyadhar.sahu.cse.2022@nist.edu');
--  AFTER running this SQL, create your admin user in Supabase Dashboard:
--    Authentication → Users → Add user → Create new user
--      Email   : bidyadhar.sahu.cse.2022@nist.edu
--      Password: Bidyadhar1!
--      Auto Confirm User: ✅ ON
-- ============================================================================

ALTER TABLE public.jobs ADD COLUMN start_date date;
ALTER TABLE public.jobs ADD COLUMN tags text;
ALTER TABLE public.jobs ADD COLUMN notified boolean not null default false;
