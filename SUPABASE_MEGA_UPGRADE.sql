-- ============================================================================
-- ConnectHub MEGA UPGRADE — groups, media columns, typing, presence, stories
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- (The app degrades gracefully until this runs, and auto-upgrades after —
--  no redeploy needed.)
-- ============================================================================

-- 1. Groups
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  avatar_url text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.group_members (
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY(group_id, user_id)
);
CREATE TABLE IF NOT EXISTS public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id),
  content text,
  file_url text,
  file_type text,
  audio_url text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 2. File messages already in messages table - add columns if missing
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_type text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS audio_url text;

-- 3. Typing indicator (ephemeral, no RLS blocking)
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid,
  receiver_id uuid,
  group_id uuid,
  is_typing boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- 4. Presence / Online
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  is_online boolean DEFAULT false,
  last_seen timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Stories / Status 24h
CREATE TABLE IF NOT EXISTS public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text DEFAULT 'image',
  caption text,
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  created_at timestamptz DEFAULT now()
);

-- 6. Storage Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('stories', 'stories', true) ON CONFLICT (id) DO NOTHING;

-- RLS Policies - Enable all
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "groups_all" ON public.groups;
CREATE POLICY "groups_all" ON public.groups FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "group_members_all" ON public.group_members;
CREATE POLICY "group_members_all" ON public.group_members FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "group_messages_all" ON public.group_messages;
CREATE POLICY "group_messages_all" ON public.group_messages FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "typing_all" ON public.typing_indicators;
CREATE POLICY "typing_all" ON public.typing_indicators FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "presence_all" ON public.user_presence;
CREATE POLICY "presence_all" ON public.user_presence FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "stories_all" ON public.stories;
CREATE POLICY "stories_all" ON public.stories FOR ALL USING (auth.uid() = user_id OR expires_at > now());

DROP POLICY IF EXISTS "storage_chat_files" ON storage.objects;
CREATE POLICY "storage_chat_files" ON storage.objects FOR ALL USING (bucket_id = 'chat-files') WITH CHECK (bucket_id = 'chat-files');
DROP POLICY IF EXISTS "storage_stories" ON storage.objects;
CREATE POLICY "storage_stories" ON storage.objects FOR ALL USING (bucket_id = 'stories') WITH CHECK (bucket_id = 'stories');

-- Realtime
ALTER TABLE public.group_messages REPLICA IDENTITY FULL;
ALTER TABLE public.typing_indicators REPLICA IDENTITY FULL;
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;
ALTER TABLE public.stories REPLICA IDENTITY FULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='group_messages') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='typing_indicators') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='user_presence') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='stories') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.stories; END IF;
END $$;

-- ============================================================================
-- SUPPLEMENTAL (required for the features below — kept separate on purpose)
-- ============================================================================

-- 7. Group delivery + per-user read receipts:
--    group tick = single grey (sent) -> double grey (delivered_at claimed by
--    any member's client) -> blue (EVERY other member has a reads row).
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

CREATE TABLE IF NOT EXISTS public.group_message_reads (
  message_id uuid REFERENCES public.group_messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  PRIMARY KEY(message_id, user_id)
);
ALTER TABLE public.group_message_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "group_message_reads_all" ON public.group_message_reads;
CREATE POLICY "group_message_reads_all" ON public.group_message_reads FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.group_message_reads REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='group_message_reads') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_message_reads;
  END IF;
END $$;

-- 8. Stories auto-delete cron (best-effort: skipped silently if pg_cron
--    extension is not enabled on the project).
DO $outer$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'connecthub-delete-expired-stories',
      '*/30 * * * *',
      $q$DELETE FROM public.stories WHERE expires_at < now()$q$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $outer$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
