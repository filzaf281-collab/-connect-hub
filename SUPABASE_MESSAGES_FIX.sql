-- ============================================================================
-- ConnectHub: fix messages schema (add receiver_id / message_type, etc.)
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- (The frontend already works WITHOUT this via a fallback, but running it
--  enables storing receiver_id + message_type properly.)
-- ============================================================================

-- Check messages table structure and fix it
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS receiver_id UUID REFERENCES auth.users(id);

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES auth.users(id);

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id);

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS content TEXT;

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';

-- Also ensure RLS policies allow insert
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.messages;
CREATE POLICY "Enable insert for authenticated users" ON public.messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.messages;
CREATE POLICY "Enable select for authenticated users" ON public.messages FOR SELECT USING (auth.role() = 'authenticated');

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
