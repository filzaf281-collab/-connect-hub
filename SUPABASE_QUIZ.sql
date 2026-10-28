-- ========================================================
-- ConnectHub Quiz System - Supabase SQL Migration
-- Run this in Supabase Dashboard -> SQL Editor
-- ========================================================

-- 1. Quizzes Table
CREATE TABLE IF NOT EXISTS public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subject text NOT NULL,
  description text,
  teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  due_date timestamptz,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Questions Table
CREATE TABLE IF NOT EXISTS public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE,
  text text NOT NULL,
  options jsonb NOT NULL, -- JSON array of 4 strings e.g. ["Option A", "Option B", "Option C", "Option D"]
  correct_answer integer NOT NULL, -- Index 0-3
  points integer DEFAULT 10,
  created_at timestamptz DEFAULT now()
);

-- 3. Quiz Attempts Table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name text,
  student_email text,
  score integer NOT NULL DEFAULT 0,
  total_points integer NOT NULL DEFAULT 0,
  answers jsonb NOT NULL, -- JSON object of student's submitted answers
  created_at timestamptz DEFAULT now()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- 5. Permissive Policies (aligned with ConnectHub policy setup)
DROP POLICY IF EXISTS "quizzes_all" ON public.quizzes;
CREATE POLICY "quizzes_all" ON public.quizzes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "questions_all" ON public.questions;
CREATE POLICY "questions_all" ON public.questions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "quiz_attempts_all" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_all" ON public.quiz_attempts FOR ALL USING (true) WITH CHECK (true);

-- 6. Indexes for High Performance
CREATE INDEX IF NOT EXISTS idx_quizzes_teacher ON public.quizzes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz ON public.questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON public.quiz_attempts(student_id);

-- 7. Realtime Replication (optional, enables live attempt notifications)
ALTER TABLE public.quizzes REPLICA IDENTITY FULL;
ALTER TABLE public.quiz_attempts REPLICA IDENTITY FULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='quizzes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quizzes;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='quiz_attempts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_attempts;
  END IF;
END $$;
