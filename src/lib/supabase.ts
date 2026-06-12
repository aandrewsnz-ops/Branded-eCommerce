/**
 * Placeholder Supabase client.
 *
 * The real client (and `@supabase/supabase-js`) will be wired in later.
 * For now this file only reads the environment variables and reports whether
 * they are configured, without throwing if they are missing. This keeps the
 * app shell running locally before any backend exists.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

/** True once both env vars are present. Used to gate future Supabase calls. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabaseConfig = {
  url: supabaseUrl ?? null,
  anonKey: supabaseAnonKey ?? null,
};

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.info(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set. " +
      "Running in local-only mode; Supabase features are disabled."
  );
}

/**
 * Returns the configured Supabase client once it has been implemented.
 * Currently returns `null` so callers can safely no-op until then.
 */
export function getSupabaseClient(): null {
  return null;
}
