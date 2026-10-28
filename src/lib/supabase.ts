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

export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY = supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const DEMO_QUIZ_UUID = 'e1a10000-0000-0000-0000-000000000001';

export function isUuid(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

export function normalizeQuizId(id?: string | null): string {
  if (!id || typeof id !== 'string') return DEMO_QUIZ_UUID;
  const trimmed = id.trim();
  if (trimmed === 'quiz-demo-1') return DEMO_QUIZ_UUID;
  if (isUuid(trimmed)) return trimmed;
  return DEMO_QUIZ_UUID;
}
