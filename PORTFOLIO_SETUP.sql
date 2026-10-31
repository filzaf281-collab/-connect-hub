-- ====================================================================
-- CONNECTHUB: 1-Click Auto Portfolio Table Setup
-- Safe, Non-Destructive, Isolated Table
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.portfolios (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  photo_url TEXT,
  skill_name TEXT NOT NULL,
  score NUMERIC NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT true,
  whatsapp_number TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for lightning-fast public lookup
CREATE INDEX IF NOT EXISTS idx_portfolios_username ON public.portfolios(lower(username));
CREATE INDEX IF NOT EXISTS idx_portfolios_created_at ON public.portfolios(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

-- Drop previous policies if re-running
DROP POLICY IF EXISTS "Allow public read of portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Allow public insert of portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Allow public update of portfolios" ON public.portfolios;

-- 1. Anyone (public visitors) can view portfolio pages
CREATE POLICY "Allow public read of portfolios"
  ON public.portfolios
  FOR SELECT
  USING (true);

-- 2. Authenticated students & guests can create their portfolio
CREATE POLICY "Allow public insert of portfolios"
  ON public.portfolios
  FOR INSERT
  WITH CHECK (true);

-- 3. Users can update their portfolio
CREATE POLICY "Allow public update of portfolios"
  ON public.portfolios
  FOR UPDATE
  USING (true);
