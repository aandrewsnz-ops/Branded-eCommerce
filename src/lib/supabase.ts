import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AdCopySet,
  CustomerAvatarOutput,
  MassDesire,
  MarketingAngle,
  ProductProject,
  ProductProjectInput,
  ResearchInsight,
  ResearchSource,
} from "../types";

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

/**
 * Fetch the saved research sources for a project's latest completed research
 * run (stage = "research"). Returns an empty array if there is no completed run
 * or no sources, and in local-only mode (no Supabase client).
 */
export async function fetchLatestResearchSources(
  projectId: string
): Promise<ResearchSource[]> {
  if (!supabase) {
    return [];
  }

  const { data: runData, error: runError } = await supabase
    .from("research_runs")
    .select("id")
    .eq("project_id", projectId)
    .eq("stage", "research")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (runError) {
    throw new Error(runError.message);
  }

  if (!runData) {
    return [];
  }

  const runId = (runData as { id: string }).id;

  const { data, error } = await supabase
    .from("research_sources")
    .select("*")
    .eq("run_id", runId)
    .order("relevance_score", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ResearchSource[];
}

/**
 * Fetch the most recent saved insight report for a project, or null if none
 * exists. Returns null in local-only mode (no Supabase client).
 */
export async function fetchLatestInsight(
  projectId: string
): Promise<ResearchInsight | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("research_insights")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as ResearchInsight) ?? null;
}

/**
 * Fetch the most recent saved customer avatar for a project, or null if none
 * exists. Returns null in local-only mode (no Supabase client).
 */
export async function fetchLatestCustomerAvatar(
  projectId: string
): Promise<CustomerAvatarOutput | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("generated_outputs")
    .select("*")
    .eq("project_id", projectId)
    .eq("output_type", "customer_avatar")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as CustomerAvatarOutput) ?? null;
}

/** Fetch all saved mass desires for a project, ordered by sort_order. */
export async function fetchMassDesires(
  projectId: string
): Promise<MassDesire[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("mass_desires")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MassDesire[];
}

/** Fetch all saved marketing angles for a project. */
export async function fetchMarketingAngles(
  projectId: string
): Promise<MarketingAngle[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("marketing_angles")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MarketingAngle[];
}

/** Fetch all saved ad copy sets for a project. */
export async function fetchAdCopySets(
  projectId: string
): Promise<AdCopySet[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("ad_copy_sets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AdCopySet[];
}
