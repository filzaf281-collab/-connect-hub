-- ============================================================================
-- ConnectHub: READ RECEIPTS fix (is_read / read_at / delivered_at on messages)
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Until this runs, the app still works: sending/receiving messages is
-- unaffected and ticks degrade to a single grey tick. Once run, the full
-- sent (single grey) -> delivered (double grey) -> read (double BLUE)
-- receipt flow activates automatically (no redeploy needed).
-- ============================================================================

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure messages default to NOT read
UPDATE public.messages SET is_read = false WHERE is_read IS NULL;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
