-- ============================================================================
--  Job Ledger — Supabase Schema (copy-paste into Supabase SQL Editor → Run)
-- ============================================================================

-- 1) JOBS TABLE ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jobs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name      text        NOT NULL,
  last_date     date,
  exam_date     date,
  apply_link    text        NOT NULL,
  notes         text,
  app_username  text,
  app_password  text,
  start_date    date,
  tags          text,
  notified      boolean     NOT NULL DEFAULT false,
  applied       boolean     NOT NULL DEFAULT false,
  applied_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- Auto-discovery fields
  source        text        NOT NULL DEFAULT 'manual',
  match_reason  text,
  match_score   integer     DEFAULT 0
);

CREATE INDEX IF NOT EXISTS jobs_last_date_idx ON public.jobs (last_date);
CREATE INDEX IF NOT EXISTS jobs_applied_idx   ON public.jobs (applied);
CREATE INDEX IF NOT EXISTS jobs_source_idx    ON public.jobs (source);

-- 2) updated_at trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jobs_set_updated_at ON public.jobs;
CREATE TRIGGER jobs_set_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jobs_select_public"  ON public.jobs;
CREATE POLICY "jobs_select_public"  ON public.jobs FOR SELECT USING (true);

DROP POLICY IF EXISTS "jobs_insert_admin"   ON public.jobs;
CREATE POLICY "jobs_insert_admin"   ON public.jobs FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'email' = 'bidyadhar.sahu.cse.2022@nist.edu'
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "jobs_update_public"  ON public.jobs;
CREATE POLICY "jobs_update_public"  ON public.jobs FOR UPDATE USING (true);

DROP POLICY IF EXISTS "jobs_delete_admin"   ON public.jobs;
CREATE POLICY "jobs_delete_admin"   ON public.jobs FOR DELETE
  USING (
    auth.jwt() ->> 'email' = 'bidyadhar.sahu.cse.2022@nist.edu'
    OR auth.role() = 'service_role'
  );

-- 4) ARCHIVED JOBS TABLE ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.archived_jobs (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id    uuid,
  job_name       text,
  last_date      date,
  exam_date      date,
  apply_link     text,
  notes          text,
  tags           text,
  start_date     date,
  source         text        DEFAULT 'manual',
  created_at     timestamptz,
  archived_at    timestamptz NOT NULL DEFAULT now(),
  archive_reason text
);

ALTER TABLE public.archived_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "archived_select_public" ON public.archived_jobs;
CREATE POLICY "archived_select_public" ON public.archived_jobs FOR SELECT USING (true);

DROP POLICY IF EXISTS "archived_insert_all"    ON public.archived_jobs;
CREATE POLICY "archived_insert_all"    ON public.archived_jobs FOR INSERT WITH CHECK (true);

-- 5) USER PROFILE TABLE (for AI job matching) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_profile (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text        DEFAULT 'Bidyadhar',
  qualifications text        DEFAULT 'B.Com, Graduation',
  age            integer     DEFAULT 24,
  state          text        DEFAULT 'Odisha',
  categories     text        DEFAULT 'SSC, Railway, Bank, OPSC, State Govt, Central Govt',
  max_age_limit  integer     DEFAULT 32,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_select" ON public.user_profile;
CREATE POLICY "profile_select" ON public.user_profile FOR SELECT USING (true);

DROP POLICY IF EXISTS "profile_all"    ON public.user_profile;
CREATE POLICY "profile_all"    ON public.user_profile FOR ALL USING (auth.role() = 'service_role');

-- Insert default profile (skip if already exists)
INSERT INTO public.user_profile (name, qualifications, age, state, categories, max_age_limit)
SELECT 'Bidyadhar', 'B.Com, Graduation', 24, 'Odisha',
       'SSC, Railway, Bank, OPSC, State Govt, Central Govt', 32
WHERE NOT EXISTS (SELECT 1 FROM public.user_profile LIMIT 1);

-- 6) JOB DOCUMENTS TABLE (for document vault) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_documents (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        uuid        REFERENCES public.jobs(id) ON DELETE CASCADE,
  file_name     text        NOT NULL,
  file_path     text        NOT NULL,
  document_type text,
  uploaded_at   timestamptz DEFAULT now()
);

ALTER TABLE public.job_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "docs_select_public" ON public.job_documents;
CREATE POLICY "docs_select_public" ON public.job_documents FOR SELECT USING (true);

DROP POLICY IF EXISTS "docs_insert_public" ON public.job_documents;
CREATE POLICY "docs_insert_public" ON public.job_documents FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "docs_delete_public" ON public.job_documents;
CREATE POLICY "docs_delete_public" ON public.job_documents FOR DELETE USING (true);

-- 7) STATUS LOG TABLE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_status_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      uuid        REFERENCES public.jobs(id) ON DELETE CASCADE,
  old_status  text,
  new_status  text,
  changed_at  timestamptz DEFAULT now(),
  note        text
);

-- Auto-log status changes
CREATE OR REPLACE FUNCTION public.log_job_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.applied IS DISTINCT FROM NEW.applied THEN
    INSERT INTO public.job_status_log (job_id, old_status, new_status)
    VALUES (NEW.id, OLD.applied, NEW.applied);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS job_status_change_trigger ON public.jobs;
CREATE TRIGGER job_status_change_trigger
AFTER UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.log_job_status_change();

-- ── INSTRUCTIONS ─────────────────────────────────────────────────────────────
-- After running this SQL:
-- 1. Go to Storage → New bucket → Name: "job-documents" → Private
-- 2. Add storage policy: allow authenticated and anon users to INSERT and SELECT
-- 3. Add env vars in Vercel:
--      SUPABASE_SERVICE_ROLE_KEY = (Supabase → Settings → API → service_role key)
--      CRON_SECRET               = any_random_string_you_choose
--      TELEGRAM_BOT_TOKEN        = (optional, from @BotFather on Telegram)
--      TELEGRAM_CHAT_ID          = (optional, your Telegram chat ID)
-- ============================================================================
