create table if not exists conversations (
  id uuid references auth.users on delete cascade not null primary key,
  created_at timestamp with time zone default timezone('utc'::now, now()),
  participants jsonb not null default '[]'::jsonb
);

comment on table conversations is 'Chat conversations';
comment on column conversations.id is 'Unique conversation ID';
comment on column conversations.created_at is 'Conversation creation timestamp';
comment on column conversations.participants is 'Array of participant user IDs';