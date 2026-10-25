create table if not exists messages (
  id uuid references auth.users on delete cascade not null primary key,
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  content text,
  file_url text,
  created_at timestamp with time zone default timezone('utc'::now, now()),
  read_by jsonb default '[]'::jsonb
);

comment on table messages is 'Chat messages';
comment on column messages.id is 'Unique message ID';
comment on column messages.conversation_id is 'FK to conversation';
comment on column messages.sender_id is 'FK to sender user';
comment on column messages.content is 'Message text content';
comment on column messages.file_url is 'URL to attached file/image (if any)';
comment on column messages.created_at is 'Timestamp when message was sent';
comment on column messages.read_by is 'Array of user IDs who have read this message';