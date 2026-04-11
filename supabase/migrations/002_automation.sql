-- =============================================================
-- Outreach CRM — Automation Schema (Migration 002)
-- Run this entire file in the Supabase SQL Editor.
-- Adds support for the daily-outbound Vercel cron pipeline.
-- =============================================================

-- 1. ADD 'draft' TO outreach.status -------------------------
-- The existing CHECK constraint does not allow 'draft' status.
-- We drop it and re-add with the expanded enum.

ALTER TABLE outreach DROP CONSTRAINT IF EXISTS outreach_status_check;
ALTER TABLE outreach ADD CONSTRAINT outreach_status_check
  CHECK (status IN ('sent', 'replied', 'follow-up-needed', 'no-response', 'draft'));


-- 2. automation_domains --------------------------------------
-- One row per domain we monitor. last_checked_at drives
-- rotation — the cron picks the stalest domains each run.

CREATE TABLE IF NOT EXISTS automation_domains (
  domain TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  lane TEXT NOT NULL,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 3. automation_runs -----------------------------------------
-- One row per pipeline execution, for audit + debugging.

CREATE TABLE IF NOT EXISTS automation_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  triggered_by TEXT NOT NULL DEFAULT 'cron',  -- 'cron' | 'manual'
  domains_processed TEXT[] DEFAULT '{}',
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS automation_runs_started_at_idx
  ON automation_runs (started_at DESC);


-- 4. ROW LEVEL SECURITY --------------------------------------
-- Authenticated users can READ both tables (so the UI can
-- show run history and domain rotation state later).
-- WRITES are performed by the cron handler using the
-- SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS entirely.

ALTER TABLE automation_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read automation_domains"
  ON automation_domains FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read automation_runs"
  ON automation_runs FOR SELECT
  USING (auth.role() = 'authenticated');


-- 5. SEED DOMAINS --------------------------------------------
-- Initial synthetic-research lane. Edit or extend by running
-- more INSERT statements in the Supabase SQL editor, or by
-- building a simple admin UI later.

INSERT INTO automation_domains (domain, label, lane, last_checked_at) VALUES
  ('simile.ai',               'Simile',               'synthetic-research', NULL),
  ('evidenza.ai',             'Evidenza',             'synthetic-research', NULL),
  ('syntheticusers.com',      'Synthetic Users',      'synthetic-research', NULL),
  ('artificialsocieties.com', 'Artificial Societies', 'synthetic-research', NULL),
  ('quantilope.com',          'Quantilope',           'synthetic-research', NULL),
  ('remesh.ai',               'Remesh',               'synthetic-research', NULL)
ON CONFLICT (domain) DO NOTHING;
