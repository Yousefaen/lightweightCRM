-- =============================================================
-- Outreach CRM — Automation UI Schema (Migration 003)
-- Run this entire file in the Supabase SQL Editor.
-- Adds write policies on automation_domains, and a key-value
-- automation_config table so personas/guardrails can be managed
-- from the UI instead of a static JSON file.
-- =============================================================

-- 1. WRITE POLICIES ON automation_domains -----------------------

CREATE POLICY "Authenticated insert automation_domains"
  ON automation_domains FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update automation_domains"
  ON automation_domains FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete automation_domains"
  ON automation_domains FOR DELETE
  USING (auth.role() = 'authenticated');


-- 2. automation_config key-value table -------------------------

CREATE TABLE IF NOT EXISTS automation_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE automation_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read automation_config"
  ON automation_config FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated write automation_config"
  ON automation_config FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update automation_config"
  ON automation_config FOR UPDATE
  USING (auth.role() = 'authenticated');


-- 3. SEED CONFIG from current config/automation.json values -----

INSERT INTO automation_config (key, value) VALUES
  ('targetPersonas', '["chief of staff","head of operations","vp operations","head of revops","head of revenue operations","founder","ceo","cofounder","head of gtm","head of growth","vp growth","head of people"]'::jsonb),
  ('guardrails', '{"maxLeadsPerRun":10,"maxDomainsPerRun":2,"minEmailConfidence":50,"excludedDomains":["rhythms.com","listenlabs.ai","ventureguides.com","aaru.com","sap.com","hbs.edu"]}'::jsonb),
  ('modelId', '"claude-sonnet-4-20250514"'::jsonb),
  ('maxTokens', '800'::jsonb)
ON CONFLICT (key) DO NOTHING;
