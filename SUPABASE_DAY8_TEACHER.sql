-- ============================================================================
-- ConnectHub DAY 8 — Teacher Dashboard + Summaries + Auto Submission Tracking
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- ============================================================================

-- Profiles role support
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'student';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_teacher boolean DEFAULT false;

-- Assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id),
  due_date timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Submissions table (presentation / assignment)
CREATE TABLE IF NOT EXISTS public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id uuid REFERENCES auth.users(id),
  student_name text,
  student_email text,
  file_url text,
  file_type text,
  content text,
  summary text,
  submitted_at timestamptz DEFAULT now(),
  status text DEFAULT 'submitted'
);

-- Add summary column to messages and group_messages if missing
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS summary text;

-- RLS
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assignments_all" ON public.assignments;
CREATE POLICY "assignments_all" ON public.assignments FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "submissions_all" ON public.submissions;
CREATE POLICY "submissions_all" ON public.submissions FOR ALL USING (true) WITH CHECK (true);

-- Storage for assignments
INSERT INTO storage.buckets (id, name, public) VALUES ('assignments', 'assignments', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "storage_assignments" ON storage.objects;
CREATE POLICY "storage_assignments" ON storage.objects FOR ALL USING (bucket_id='assignments') WITH CHECK (bucket_id='assignments');

-- Realtime
ALTER TABLE public.assignments REPLICA IDENTITY FULL;
ALTER TABLE public.submissions REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='assignments') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='submissions') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions; END IF;
END $$;

NOTIFY pgrst, 'reload schema';
