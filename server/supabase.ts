import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client.
 *
 * Uses the same public (publishable / anon) key as the frontend, read from
 * .env.local. We deliberately do NOT use a service-role key here, so all
 * access still respects row-level security.
 *
 * Env reads are lazy (inside the function) so this module never throws at
 * import time and dotenv has a chance to load first.
 */

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and " +
        "VITE_SUPABASE_ANON_KEY in .env.local."
    );
  }

  cached = createClient(url, anonKey);
  return cached;
}
