-- ============================================================================
-- ConnectHub: REALTIME + READ RECEIPTS fix
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Fixes:
--   1. UPDATE RLS policy so receivers can claim delivery / mark messages read
--      (without it the delivered/read UPDATEs silently affect 0 rows).
--   2. REPLICA IDENTITY FULL + realtime publication so UPDATE events are
--      actually emitted to clients (blue ticks flipping live).
-- ============================================================================

DROP POLICY IF EXISTS "messages_update_policy" ON public.messages;
CREATE POLICY "messages_update_policy" ON public.messages FOR UPDATE USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
) WITH CHECK (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Guarded so the statement can't abort the run if messages is already a member
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
