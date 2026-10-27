# ConnectHub Web

**Live Deployment:** [https://connect-hub-plum.vercel.app](https://connect-hub-plum.vercel.app)

### Test Accounts
- **Teacher Login:** `filzaf281@gmail.com` / `12345678`
- **Student Login:** `areebiqbal630` / `12345678`

---

## Features Working

- **Teacher Dashboard at `/teacher` is LIVE ✅**:
  - Role-protected teacher view (redirects non-teachers to `/chat`).
  - Welcome greeting: *"Teacher Dashboard - Welcome filzaf281"*.
  - **Create Assignment**: Modal to publish assignments with title, description, and due date directly into Supabase.
  - **View Submissions**: Real-time table tracking student name, email, assignment title, file links, AI summaries, and submission status (`submitted`, `late`, `missing`).
  - **Manage Students**: Enrolled roster with individual submission history and chat links.
  - One-click CSV export of submissions report.
- **Chat at `/chat`**:
  - Real-time 1-on-1 and Group chats via Supabase Realtime.
  - WhatsApp Web theme with dark/light mode toggle.
  - File, document, image, and voice audio attachments.
  - Live typing indicator and online/offline user presence.
  - WhatsApp-style 24-hour Stories bar and viewer.
  - AI chat summarization powered by extractive key-point analysis.
- **Auth with Supabase**:
  - Secure authentication via Supabase Auth (`auth.users` & `profiles`).
  - Role selection for Student and Teacher on signup.
  - Seamless redirection to `/teacher` or `/chat` based on user role.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS (ConnectHub / WhatsApp Web dark and light themes)
- **Backend & Database**: Supabase (PostgreSQL, Row Level Security, Auth, Realtime, Storage)
- **Deployment**: Vercel Production ([https://connect-hub-plum.vercel.app](https://connect-hub-plum.vercel.app))

---

## Quick Start (Local Development)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://phofmrtdprmohyxvahgc.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_lggccb_jngld07Z0E3WQrA_ru7SNmJg
   ```

3. **Run local dev server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Production Build:**
   ```bash
   npm run build
   ```

---

## License

MIT
