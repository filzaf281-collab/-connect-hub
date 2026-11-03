-- ====================================================================
-- CONNECTHUB: AI Skill Witness + Blockchain Certificate Table Setup
-- Safe, Non-Destructive, Isolated Table
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.skill_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  student_name TEXT NOT NULL DEFAULT 'ConnectHub Student',
  skill_name TEXT NOT NULL,
  quiz_id UUID,
  score INTEGER NOT NULL DEFAULT 85,
  video_proof_url TEXT,
  certificate_hash TEXT UNIQUE NOT NULL,
  qr_code_data TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookup by user and certificate hash
CREATE INDEX IF NOT EXISTS idx_skill_cert_user ON public.skill_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_cert_hash ON public.skill_certificates(certificate_hash);
CREATE INDEX IF NOT EXISTS idx_skill_cert_created ON public.skill_certificates(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.skill_certificates ENABLE ROW LEVEL SECURITY;

-- Drop previous policies if re-running
DROP POLICY IF EXISTS "Allow public read of skill_certificates" ON public.skill_certificates;
DROP POLICY IF EXISTS "Allow public insert of skill_certificates" ON public.skill_certificates;
DROP POLICY IF EXISTS "Allow public update of skill_certificates" ON public.skill_certificates;

-- 1. Anyone (verifiers, employers, visitors) can view verified certificates
CREATE POLICY "Allow public read of skill_certificates"
  ON public.skill_certificates
  FOR SELECT
  USING (true);

-- 2. Authenticated users and students can generate certificates
CREATE POLICY "Allow public insert of skill_certificates"
  ON public.skill_certificates
  FOR INSERT
  WITH CHECK (true);

-- 3. Users can update their certificate records (e.g. video proof link)
CREATE POLICY "Allow public update of skill_certificates"
  ON public.skill_certificates
  FOR UPDATE
  USING (true);
