-- ============================================================
-- Kori AML Platform – Complete Database Migrations
-- Run in Supabase SQL Editor
-- Order: execute top-to-bottom
-- ============================================================

-- 1. Add risk_breakdown column to transactions (if not exists)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS risk_breakdown JSONB;

-- 2. Audit Logs table (CBN §5.1.6 – immutable record)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT,
  action_type TEXT NOT NULL,
  entity_id  TEXT,
  old_value  JSONB,
  new_value  JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit logs: anyone authenticated can read; only service_role can insert
CREATE POLICY "Authenticated can read audit"
  ON public.audit_logs FOR SELECT
  TO authenticated USING (true);

-- Service role bypasses RLS for inserts (no explicit policy needed)

-- 3. API Keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        TEXT NOT NULL,
  key_hash       TEXT UNIQUE NOT NULL,
  key_preview    TEXT NOT NULL,
  tier           TEXT DEFAULT 'free'
                   CHECK (tier IN ('free','pro','enterprise')),
  requests_count INTEGER DEFAULT 0,
  daily_limit    INTEGER DEFAULT 1000,
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  expires_at     TIMESTAMPTZ
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own keys"
  ON public.api_keys FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "Service role full access on api_keys"
  ON public.api_keys FOR ALL
  USING (true);

-- 4. Travel Rule Logs table (FATF R.16)
CREATE TABLE IF NOT EXISTS public.travel_rule_logs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference               TEXT UNIQUE NOT NULL,
  originator_name         TEXT NOT NULL,
  originator_account      TEXT NOT NULL,
  originator_institution  TEXT NOT NULL,
  beneficiary_name        TEXT NOT NULL,
  beneficiary_account     TEXT NOT NULL,
  beneficiary_institution TEXT NOT NULL,
  amount                  DECIMAL(16,2) NOT NULL,
  currency                TEXT DEFAULT 'NGN',
  timestamp               TIMESTAMPTZ NOT NULL,
  status                  TEXT DEFAULT 'submitted',
  ivms101_compliant       BOOLEAN DEFAULT true,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.travel_rule_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read travel_rule_logs"
  ON public.travel_rule_logs FOR SELECT
  TO authenticated USING (true);

-- 5. Add unique constraint on blocklist to prevent duplicates
ALTER TABLE public.blocklist
  DROP CONSTRAINT IF EXISTS blocklist_type_value_unique;

ALTER TABLE public.blocklist
  ADD CONSTRAINT blocklist_type_value_unique UNIQUE (type, value);

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp
  ON public.transactions (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_risk
  ON public.transactions (risk_score DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_status
  ON public.alerts (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created
  ON public.audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON public.audit_logs (action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blocklist_type_value
  ON public.blocklist (type, value);

CREATE INDEX IF NOT EXISTS idx_api_keys_user
  ON public.api_keys (user_id, is_active);

-- 7. Verify everything
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS col_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('transactions','alerts','blocklist','users','audit_logs','api_keys','travel_rule_logs')
ORDER BY table_name;