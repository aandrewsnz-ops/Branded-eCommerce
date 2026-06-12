import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeProject } from "../types";
import type {
  AdCandidate,
  AdCopySet,
  CreativePromptSet,
  CustomerAvatarOutput,
  DesireConcept,
  DesireConceptSet,
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

  return ((data ?? []) as ProductProject[]).map(normalizeProject);
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

  // Write new fields, and mirror into legacy columns for backwards
  // compatibility (existing readers + any NOT NULL legacy columns).
  const payload = {
    ...input,
    product_name: input.our_product_name,
    product_description: input.supplier_product_description,
    competitor_url: input.primary_competitor_url,
    product_price: input.planned_sale_price,
    offer: input.current_offer,
    target_customer: input.initial_customer_hypothesis,
    main_problem: input.initial_problem_hypothesis,
    brand_tone: input.preferred_tone,
    claims_allowed: "",
    claims_banned: "",
    output_goal: "",
  };

  const { data, error } = await supabase
    .from(PROJECTS_TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeProject(data as ProductProject);
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

  return (data ?? []).map(normalizeMarketingAngle);
}

function normalizeMarketingAngle(row: MarketingAngle): MarketingAngle {
  return {
    ...row,
    review_status: row.review_status ?? "untested",
    is_shortlisted: row.is_shortlisted ?? false,
    priority_score: row.priority_score ?? 0,
    reviewer_notes: row.reviewer_notes ?? "",
  };
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

  return (data ?? []).map(normalizeAdCopySet);
}

/**
 * Ensure the new simplified copy-pack fields are always arrays, even for older
 * rows saved before the ad_variations / image_prompts columns existed.
 */
export function normalizeAdCopySet(row: unknown): AdCopySet {
  const set = (row ?? {}) as AdCopySet;
  return {
    ...set,
    ad_variations: Array.isArray(set.ad_variations) ? set.ad_variations : [],
    image_prompts: Array.isArray(set.image_prompts) ? set.image_prompts : [],
    is_edited: Boolean(set.is_edited),
  };
}

/** Fetch all saved creative prompt sets for a project. */
export async function fetchCreativePromptSets(
  projectId: string
): Promise<CreativePromptSet[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("creative_prompt_sets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CreativePromptSet[];
}

function normalizeDesireConcept(row: DesireConcept): DesireConcept {
  const overlay = row.overlay_recommendation ?? "none";
  const validOverlays = new Set([
    "none",
    "headline_only",
    "headline_plus_support_line",
  ]);
  return {
    ...row,
    support_line: row.support_line ?? "",
    overlay_recommendation: validOverlays.has(overlay)
      ? overlay
      : "none",
  };
}

/** Fetch all saved TOF concept sets for a project, with nested concepts. */
export async function fetchDesireConceptSets(
  projectId: string
): Promise<DesireConceptSet[]> {
  if (!supabase) {
    return [];
  }

  const { data: sets, error: setsError } = await supabase
    .from("desire_concept_sets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (setsError) {
    if (import.meta.env.DEV) {
      console.warn("[supabase] fetchDesireConceptSets:", setsError.message);
    }
    return [];
  }

  if (!sets?.length) {
    return [];
  }

  const { data: concepts, error: conceptsError } = await supabase
    .from("desire_concepts")
    .select("*")
    .eq("project_id", projectId)
    .order("concept_number", { ascending: true });

  if (conceptsError) {
    if (import.meta.env.DEV) {
      console.warn("[supabase] fetchDesireConceptSets concepts:", conceptsError.message);
    }
    return [];
  }

  const conceptsBySet = new Map<string, DesireConcept[]>();
  for (const row of concepts ?? []) {
    const concept = normalizeDesireConcept(row as DesireConcept);
    const list = conceptsBySet.get(concept.concept_set_id) ?? [];
    list.push(concept);
    conceptsBySet.set(concept.concept_set_id, list);
  }

  return (sets as Omit<DesireConceptSet, "concepts">[]).map((set) => ({
    ...set,
    concepts: conceptsBySet.get(set.id) ?? [],
  }));
}

function normalizeAdCandidate(row: AdCandidate): AdCandidate {
  return {
    ...row,
    ad_title: row.ad_title ?? "",
    selected_primary_text: row.selected_primary_text ?? "",
    selected_headline: row.selected_headline ?? "",
    selected_description: row.selected_description ?? "",
    selected_hook: row.selected_hook ?? "",
    selected_callouts: row.selected_callouts ?? [],
    selected_image_prompts: row.selected_image_prompts ?? [],
    status: row.status ?? "draft",
    notes: row.notes ?? "",
  };
}

/** Fetch all saved ad candidates for a project. Empty array if unavailable. */
export async function fetchAdCandidates(
  projectId: string
): Promise<AdCandidate[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("ad_candidates")
    .select("*")
    .eq("project_id", projectId)
    .order("ad_number", { ascending: true });

  if (error) {
    // The ad_candidates table may not exist yet (migration not run). Treat as
    // empty rather than breaking the whole workflow.
    if (import.meta.env.DEV) {
      console.warn("[supabase] fetchAdCandidates:", error.message);
    }
    return [];
  }

  return ((data ?? []) as AdCandidate[]).map(normalizeAdCandidate);
}
