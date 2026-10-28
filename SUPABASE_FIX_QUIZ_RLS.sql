-- ==============================================================================
-- ConnectHub Quiz System - Fix RLS Policies & Clean Bad Data
-- Run this script in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Clean bad attempts with NULL quiz_id
DELETE FROM public.quiz_attempts WHERE quiz_id IS NULL;

-- 2. Ensure columns exist on public.quizzes
CREATE TABLE IF NOT EXISTS public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  teacher_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Ensure columns exist on public.quiz_attempts
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  score numeric DEFAULT 0,
  total numeric DEFAULT 30,
  created_at timestamptz DEFAULT now()
);

-- 3. Proper RLS Configuration for quizzes
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quizzes_select_all" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_all" ON public.quizzes;
CREATE POLICY "quizzes_select_all" ON public.quizzes 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "quizzes_insert_policy" ON public.quizzes;
CREATE POLICY "quizzes_insert_policy" ON public.quizzes 
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "quizzes_update_policy" ON public.quizzes;
CREATE POLICY "quizzes_update_policy" ON public.quizzes 
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "quizzes_delete_policy" ON public.quizzes;
CREATE POLICY "quizzes_delete_policy" ON public.quizzes 
  FOR DELETE USING (true);

-- 4. Proper RLS Configuration for quiz_attempts
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quiz_attempts_select_all" ON public.quiz_attempts;
DROP POLICY IF EXISTS "quiz_attempts_all" ON public.quiz_attempts;
-- Allows teachers to view all student submissions and students to view scores
CREATE POLICY "quiz_attempts_select_all" ON public.quiz_attempts 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "quiz_attempts_insert_policy" ON public.quiz_attempts;
-- Allows students to insert their quiz attempt
CREATE POLICY "quiz_attempts_insert_policy" ON public.quiz_attempts 
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "quiz_attempts_delete_policy" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_delete_policy" ON public.quiz_attempts 
  FOR DELETE USING (true);

-- 5. Optional One-Line Fallback (If you ever want RLS completely disabled):
-- ALTER TABLE public.quizzes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.quiz_attempts DISABLE ROW LEVEL SECURITY;

-- 6. Insert Default Web Architecture Quiz if not already present
INSERT INTO public.quizzes (id, title, description)
VALUES (
  'e1a10000-0000-0000-0000-000000000001',
  'Web Architecture & Next.js Fundamentals',
  'Test your understanding of Next.js 14, server components, and full-stack development.'
)
ON CONFLICT (id) DO UPDATE 
SET title = EXCLUDED.title, description = EXCLUDED.description;
