create table if not exists profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::now, now()),
  last_seen_at timestamp with time zone default timezone('utc'::now, now())
);

comment on table profiles is 'User profile information';
comment on column profiles.id is 'Auth user ID';
comment on column profiles.email is 'User email';
comment on column profiles.full_name is 'Display name';
comment on column profiles.avatar_url is 'URL to user avatar';
comment on column profiles.created_at is 'Account creation timestamp';
comment on column profiles.last_seen_at is 'Last time user was online';