import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ProductProject, ProductProjectInput } from "../types";

/**
 * Supabase client for project persistence.
 *
 * Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from the environment.
 * If either is missing the app runs in local-only mode (no client is created)
 * and never throws, so a missing .env.local does not break the shell.
 *
 * Only the public anon key is used here. Never put service-role keys or other
 * backend secrets in client-side code.
 */

const PROJECTS_TABLE = "projects";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True once both env vars are present. Used to gate all Supabase calls. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.info(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set. " +
      "Running in local-only mode; projects will not be persisted."
  );
}

/** Fetch all projects, newest first. Throws on a Supabase error. */
export async function fetchProjects(): Promise<ProductProject[]> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from(PROJECTS_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ProductProject[];
}

/**
 * Insert a new project and return the saved row (with DB-generated id and
 * created_at). Throws on a Supabase error.
 */
export async function insertProject(
  input: ProductProjectInput
): Promise<ProductProject> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from(PROJECTS_TABLE)
    .insert(input)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ProductProject;
}
