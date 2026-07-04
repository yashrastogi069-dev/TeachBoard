import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/*
  Service-role client, server side only. Bypasses row level security; used
  for content writes (curriculum), usage logging, and system events.
*/
let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (!cached) {
    cached = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return cached;
}
