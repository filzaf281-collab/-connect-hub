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

-- Ensure columns exist on public.questions
CREATE TABLE IF NOT EXISTS public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  options jsonb NOT NULL,
  correct_answer integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Ensure columns exist on public.quiz_attempts
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  score numeric DEFAULT 0,
  total numeric DEFAULT 100,
  answers jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add answers column if missing
ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS answers jsonb;

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

-- 4. Proper RLS Configuration for questions
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "questions_select_all" ON public.questions;
DROP POLICY IF EXISTS "questions_all" ON public.questions;
CREATE POLICY "questions_select_all" ON public.questions 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "questions_insert_policy" ON public.questions;
CREATE POLICY "questions_insert_policy" ON public.questions 
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "questions_update_policy" ON public.questions;
CREATE POLICY "questions_update_policy" ON public.questions 
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "questions_delete_policy" ON public.questions;
CREATE POLICY "questions_delete_policy" ON public.questions 
  FOR DELETE USING (true);

-- 5. Proper RLS Configuration for quiz_attempts
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

-- 6. Insert Default Published Quiz "Web Development Fundamentals" if not already present
INSERT INTO public.quizzes (id, title, description)
VALUES (
  '1c3b49a6-0478-473d-adb9-57654670f1e7',
  'Web Development Fundamentals',
  'Test your knowledge of web development fundamentals, including HTML, CSS, JavaScript, responsive web design, and web servers. This quiz is designed for beginner-level web development students to assess their basic concepts and understanding of modern website development.'
)
ON CONFLICT (id) DO UPDATE 
SET title = EXCLUDED.title, description = EXCLUDED.description;

-- 7. Insert the 10 Questions for Web Development Fundamentals
DELETE FROM public.questions WHERE quiz_id = '1c3b49a6-0478-473d-adb9-57654670f1e7';

INSERT INTO public.questions (quiz_id, question_text, options, correct_answer) VALUES
('1c3b49a6-0478-473d-adb9-57654670f1e7', 'What does HTML stand for in web development?', '["HyperText Markup Language", "High Tech Modern Language", "Hyperlink and Text Model Language", "Home Tool Management Language"]'::jsonb, 0),
('1c3b49a6-0478-473d-adb9-57654670f1e7', 'Which HTML5 semantic tag is recommended for defining primary website navigation links?', '["<navigation>", "<nav>", "<menu>", "<section class=\\"nav\\">"]'::jsonb, 1),
('1c3b49a6-0478-473d-adb9-57654670f1e7', 'In the CSS box model, which layer provides space between the element''s content and its border?', '["Margin", "Outline", "Padding", "Spacing"]'::jsonb, 2),
('1c3b49a6-0478-473d-adb9-57654670f1e7', 'Which CSS Flexbox property specifies the alignment of items along the main axis?', '["align-items", "justify-content", "flex-direction", "align-content"]'::jsonb, 1),
('1c3b49a6-0478-473d-adb9-57654670f1e7', 'Which CSS Media Query correctly targets viewport widths that are at least 768px wide?', '["@media screen and (min-width: 768px)", "@media screen and (max-device-width: 768px)", "@media (viewport-width: 768px)", "@media only (width = 768px)"]'::jsonb, 0),
('1c3b49a6-0478-473d-adb9-57654670f1e7', 'Which keyword was introduced in modern JavaScript (ES6) to declare a block-scoped variable that cannot be reassigned?', '["var", "let", "const", "final"]'::jsonb, 2),
('1c3b49a6-0478-473d-adb9-57654670f1e7', 'Which modern DOM method selects the first element matching a specified CSS selector in a web document?', '["document.getElementsByClassName()", "document.querySelector()", "document.getElementByIdFirst()", "document.selectFirstNode()"]'::jsonb, 1),
('1c3b49a6-0478-473d-adb9-57654670f1e7', 'Which method is the standard way to attach an event handler to a button in JavaScript without overwriting other handlers?', '["button.addEventListener(''click'', handler)", "button.onclick = handler", "button.attachEvent(''click'', handler)", "button.bind(''click'', handler)"]'::jsonb, 0),
('1c3b49a6-0478-473d-adb9-57654670f1e7', 'What is the primary security advantage of HTTPS compared to standard HTTP?', '["HTTPS compresses web traffic so pages load significantly faster", "HTTPS uses TLS/SSL encryption to secure communications and prevent eavesdropping", "HTTPS bypasses client-side caching to prevent stale pages", "HTTPS operates on port 80 instead of port 443"]'::jsonb, 1),
('1c3b49a6-0478-473d-adb9-57654670f1e7', 'Which HTTP response status code indicates that a requested resource was successfully created on the server?', '["200 OK", "201 Created", "204 No Content", "301 Moved Permanently"]'::jsonb, 1);
