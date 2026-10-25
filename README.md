# ConnectHub - WhatsApp Clone

A full-featured WhatsApp Web clone built with Next.js 14, Tailwind CSS, and Supabase.

## Features

- **Authentication**: Email + Password via Supabase Auth
- **Real-time Messaging**: Using Supabase Realtime
- **File/Image Sharing**: Supabase Storage bucket `chat-files`
- **Online Status**: Real-time user presence
- **Responsive Design**: Works on mobile and desktop
- **Modern UI**: WhatsApp-inspired dark theme

## Project Structure

```
connect-hub/
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Main layout with auth check
│   │   ├── globals.css      # Tailwind + custom styles
│   │   ├── page.tsx         # Landing page (redirects to auth)
│   │   ├── auth/
│   │   │   ├── login/       # Login page
│   │   │   └── signup/      # Signup page
│   │   └── chat/            # Chat page with messaging
│   ├── components/          # Reusable UI components
│   └── lib/
│       └── supabase.ts      # Supabase client
├── supabase/
│   └── migrations/          # Database schema migrations
├── tailwind.config.js       # WhatsApp theme configuration
├── .env.example           # Environment variables template
└── package.json
```

## Setup & Deployment

### 1. Prerequisites

- Node.js 18+ 
- Supabase account
- Vercel account (for deployment)

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

**Never commit these values to version control.** The `.env.example` file shows the required variables without exposing sensitive values.

### 3. Supabase Setup

Run the migrations to create the required tables:

```sql
-- Profiles table (runs via migration file 20261023000001_create_profiles.sql)
create table if not exists profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::now, now()),
  last_seen_at timestamp with time zone default timezone('utc'::now, now())
);

-- Conversations table (runs via migration file 20261023000002_create_conversations.sql)
create table if not exists conversations (
  id uuid references auth.users on delete cascade not null primary key,
  created_at timestamp with time zone default timezone('utc'::now, now()),
  participants jsonb not null default '[]'::jsonb
);

-- Messages table (runs via migration file 20261023000003_create_messages.sql)
create table if not exists messages (
  id uuid references auth.users on delete cascade not null primary key,
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  content text,
  file_url text,
  created_at timestamp with time zone default timezone('utc'::now, now()),
  read_by jsonb default '[]'::jsonb
)
```

#### Enable Realtime

1. Go to Supabase Dashboard > Database > Replication
2. Click "Enable Realtime" for the `messages` table
3. Ensure RLS (Row Level Security) is properly configured

#### Row Level Security (RLS) Policies

Ensure these policies are set on each table:

**profiles table:**
- Allow authenticated users to insert their own profile
- Allow users to update their own profile

**conversations table:**
- Allow authenticated users to select conversations they participate in
- Allow authenticated users to insert conversations

**messages table:**
- Allow authenticated users to select messages from conversations they participate in
- Allow authenticated users to insert messages
- Allow users to update their own message read status

### 4. Storage Setup

Create a storage bucket called `chat-files`:

1. Go to Supabase Dashboard > Storage
2. Click "New Bucket"
3. Name: `chat-files`
4. Public: `No` (or `Yes` if you want shared links)

Set the bucket policy to allow authenticated users to upload and download files.

### 5. Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit `http://localhost:3000` to access the app.

### 6. Vercel Deployment

1. Push your code to GitHub/GitLab/Bitbucket
2. Connect your repository to Vercel
3. In Vercel Dashboard > Settings > Environment Variables, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

The app will be available at your Vercel subdomain with Always-On enabled.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS with WhatsApp green theme
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Database**: PostgreSQL with RLS
- **Real-time**: Supabase Realtime subscriptions
- **Storage**: Supabase Storage for files/images

## API Routes (Server-Side)

The app uses Supabase client-side SDK, but you can also set up server-side routes:

- `POST /api/auth/signin` - Sign in with email/password
- `POST /api/auth/signup` - Create new account  
- `POST /api/auth/signout` - Sign out
- `GET /api/user` - Get current user info

## License

MIT