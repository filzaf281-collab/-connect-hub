-- ====================================================================
-- CONNECTHUB: AI Live Client Simulator Database Setup
-- Safe, Non-Destructive, Isolated Table
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.client_simulations (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  portfolio_username TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_project TEXT NOT NULL,
  chat_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  skill_score NUMERIC NOT NULL DEFAULT 85,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for instant portfolio lookup
CREATE INDEX IF NOT EXISTS idx_simulations_portfolio ON public.client_simulations(lower(portfolio_username));
CREATE INDEX IF NOT EXISTS idx_simulations_created_at ON public.client_simulations(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.client_simulations ENABLE ROW LEVEL SECURITY;

-- Drop previous policies if re-running
DROP POLICY IF EXISTS "Allow public read of client_simulations" ON public.client_simulations;
DROP POLICY IF EXISTS "Allow public insert of client_simulations" ON public.client_simulations;
DROP POLICY IF EXISTS "Allow public update of client_simulations" ON public.client_simulations;

-- 1. Anyone can view verified chat proof on public portfolios
CREATE POLICY "Allow public read of client_simulations"
  ON public.client_simulations
  FOR SELECT
  USING (true);

-- 2. Students can insert simulation results
CREATE POLICY "Allow public insert of client_simulations"
  ON public.client_simulations
  FOR INSERT
  WITH CHECK (true);

-- 3. Students can update their simulation results
CREATE POLICY "Allow public update of client_simulations"
  ON public.client_simulations
  FOR UPDATE
  USING (true);
