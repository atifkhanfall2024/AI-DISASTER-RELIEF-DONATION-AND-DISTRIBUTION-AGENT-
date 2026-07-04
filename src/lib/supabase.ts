import { createClient } from '@supabase/supabase-js';

// Public client (safe for client-side use, read-only via anon key + RLS policies)
export const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

// Admin client (server-side only, uses service role key, bypasses RLS - for uploads)
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );
}

export const BUCKET = process.env.SUPABASE_BUCKET || 'evidence';
