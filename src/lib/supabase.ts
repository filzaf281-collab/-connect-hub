import { createClient } from '@supabase/supabase-js';

// Prefer values from .env.local / Vercel environment variables.
// Falls back to the known-good project values so the app never breaks
// if the env vars are missing at build/runtime.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://phofmrtdprmohyxvahgc.supabase.co';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_lggccb_jngld07Z0E3WQrA_ru7SNmJg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
