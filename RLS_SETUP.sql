-- RLS_SETUP.sql
-- Run this in Supabase SQL Editor

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

create policy "allow all" on public.profiles for all using (true) with check (true);
create policy "allow all" on public.conversations for all using (true) with check (true);
create policy "allow all" on public.conversation_participants for all using (true) with check (true);
create policy "allow all" on public.messages for all using (true) with check (true);