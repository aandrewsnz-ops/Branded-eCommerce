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
  ProductPageContent,
  ProductPageSet,
  ResearchInsight,
  ResearchSource,
} from "../types";
import type { ProductProjectUpdate } from "./projectSetupFields";
import { sanitizeYourStoreLogoFields } from "./projectSetupFields";
import { hydrateProductPageContent } from "./productPageLiquid";

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

function buildProjectPayload(
  input: ProductProjectInput | ProductProjectUpdate
): Record<string, unknown> {
  return {
    our_product_name: input.our_product_name,
    supplier_product_url: input.supplier_product_url,
    supplier_product_description: input.supplier_product_description,
    primary_competitor_url: input.primary_competitor_url,
    additional_competitor_urls: input.additional_competitor_urls,
    closest_competitor_product_description:
      input.closest_competitor_product_description,
    target_country: input.target_country,
    cost_price_including_shipping: input.cost_price_including_shipping,
    planned_sale_price: input.planned_sale_price,
    current_offer: input.current_offer,
    initial_problem_hypothesis: input.initial_problem_hypothesis,
    initial_customer_hypothesis: input.initial_customer_hypothesis,
    preferred_tone: input.preferred_tone,
    your_store_name: input.your_store_name,
    your_store_url: input.your_store_url,
    product_name: input.our_product_name,
    product_description: input.supplier_product_description,
    competitor_url: input.primary_competitor_url,
    product_price: input.planned_sale_price,
    offer: input.current_offer,
    target_customer: input.initial_customer_hypothesis,
    main_problem: input.initial_problem_hypothesis,
    brand_tone: input.preferred_tone,
  };
}

/**
 * Update an existing project's setup fields (and optional logo metadata).
 */
export async function updateProject(
  projectId: string,
  input: ProductProjectUpdate
): Promise<ProductProject> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const payload: Record<string, unknown> = {
    ...buildProjectPayload(input),
  };

  if ("your_store_logo_url" in input) {
    Object.assign(payload, sanitizeYourStoreLogoFields(input));
  }

  const { data, error } = await supabase
    .from(PROJECTS_TABLE)
    .update(payload)
    .eq("id", projectId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeProject(data as ProductProject);
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

  const payload = {
    ...buildProjectPayload(input),
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
 * Fetch all saved research sources for a project (across all research runs).
 * Returns an empty array if there are no sources, and in local-only mode.
 */
export async function fetchProjectResearchSources(
  projectId: string
): Promise<ResearchSource[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("research_sources")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ResearchSource[];
}

/** @deprecated Use fetchProjectResearchSources */
export async function fetchLatestResearchSources(
  projectId: string
): Promise<ResearchSource[]> {
  return fetchProjectResearchSources(projectId);
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
    image_url: row.image_url ?? undefined,
    image_path: row.image_path ?? undefined,
    image_filename: row.image_filename ?? undefined,
    image_uploaded_at: row.image_uploaded_at ?? undefined,
    image_file_type: row.image_file_type ?? undefined,
  };
}

/** Persist uploaded image metadata for one TOF concept row. */
export async function updateDesireConceptImage(
  conceptId: string,
  image: {
    image_url: string;
    image_path: string;
    image_filename: string;
    image_uploaded_at: string;
    image_file_type: string;
  } | null
): Promise<DesireConcept> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const now = new Date().toISOString();
  const payload = image
    ? {
        ...image,
        updated_at: now,
      }
    : {
        image_url: null,
        image_path: null,
        image_filename: null,
        image_uploaded_at: null,
        image_file_type: null,
        updated_at: now,
      };

  const { data, error } = await supabase
    .from("desire_concepts")
    .update(payload)
    .eq("id", conceptId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeDesireConcept(data as DesireConcept);
}

/** Persist primary/headline/description for one TOF concept row. */
export async function updateDesireConceptCopy(
  conceptId: string,
  copy: {
    primary: string;
    headline: string;
    description: string;
  }
): Promise<DesireConcept> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("desire_concepts")
    .update({
      rationale: copy.primary,
      headline: copy.headline,
      support_line: copy.description,
      updated_at: now,
    })
    .eq("id", conceptId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeDesireConcept(data as DesireConcept);
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

/** Latest saved product page set for a project, or null. */
export async function fetchProductPageSet(
  projectId: string
): Promise<ProductPageSet | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("product_page_sets")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    if (import.meta.env.DEV) {
      console.warn("[supabase] fetchProductPageSet:", error.message);
    }
    return null;
  }

  if (!data) return null;

  const row = data as ProductPageSet;
  const content = hydrateProductPageContent(
    row.content as ProductPageContent
  );

  return {
    ...row,
    content,
  };
}
