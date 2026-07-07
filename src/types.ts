import {
  normalizeOptionalString,
  normalizeOptionalTimestamp,
} from "./lib/projectSetupFields";

export interface ProductProject {
  id: string;

  /* ---- New dropshipping setup fields ---- */
  our_product_name: string;
  supplier_product_url: string;
  supplier_product_description: string;
  primary_competitor_url: string;
  additional_competitor_urls: string;
  closest_competitor_product_description: string;
  target_country: string;
  cost_price_including_shipping: string;
  planned_sale_price: string;
  current_offer: string;
  initial_problem_hypothesis: string;
  initial_customer_hypothesis: string;
  preferred_tone: string;

  /* ---- Your store branding (Preview Ads — not used in research prompts) ---- */
  your_store_name?: string | null;
  your_store_url?: string | null;
  your_store_logo_url?: string | null;
  your_store_logo_path?: string | null;
  your_store_logo_filename?: string | null;
  your_store_logo_uploaded_at?: string | null;

  /* ---- Legacy columns (kept for backwards compatibility; not deleted) ---- */
  product_name?: string;
  product_description?: string;
  competitor_url?: string;
  target_customer?: string;
  main_problem?: string;
  product_price?: string;
  offer?: string;
  claims_allowed?: string;
  claims_banned?: string;
  brand_tone?: string;
  output_goal?: string;

  created_at: string;
}

/** Shape of the form used to create a new project (new setup fields only). */
export interface ProductProjectInput {
  our_product_name: string;
  supplier_product_url: string;
  supplier_product_description: string;
  primary_competitor_url: string;
  additional_competitor_urls: string;
  closest_competitor_product_description: string;
  target_country: string;
  cost_price_including_shipping: string;
  planned_sale_price: string;
  current_offer: string;
  initial_problem_hypothesis: string;
  initial_customer_hypothesis: string;
  preferred_tone: string;
  your_store_name: string;
  your_store_url: string;
}

function firstNonEmpty(...values: (string | undefined | null)[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return "";
}

/**
 * Fill new setup fields from legacy columns when the new field is empty, and
 * back-fill legacy field names from the new values so any code (or prompt) that
 * still reads the old names keeps working. Safe to call on any project row.
 */
export function normalizeProject(raw: ProductProject): ProductProject {
  const our_product_name = firstNonEmpty(raw.our_product_name, raw.product_name);
  const supplier_product_description = firstNonEmpty(
    raw.supplier_product_description,
    raw.product_description
  );
  const primary_competitor_url = firstNonEmpty(
    raw.primary_competitor_url,
    raw.competitor_url
  );
  const planned_sale_price = firstNonEmpty(
    raw.planned_sale_price,
    raw.product_price
  );
  const current_offer = firstNonEmpty(raw.current_offer, raw.offer);
  const initial_problem_hypothesis = firstNonEmpty(
    raw.initial_problem_hypothesis,
    raw.main_problem
  );
  const initial_customer_hypothesis = firstNonEmpty(
    raw.initial_customer_hypothesis,
    raw.target_customer
  );
  const preferred_tone = firstNonEmpty(raw.preferred_tone, raw.brand_tone);

  return {
    ...raw,
    our_product_name,
    supplier_product_url: raw.supplier_product_url ?? "",
    supplier_product_description,
    primary_competitor_url,
    additional_competitor_urls: raw.additional_competitor_urls ?? "",
    closest_competitor_product_description:
      raw.closest_competitor_product_description ?? "",
    target_country: raw.target_country ?? "",
    cost_price_including_shipping: raw.cost_price_including_shipping ?? "",
    planned_sale_price,
    current_offer,
    initial_problem_hypothesis,
    initial_customer_hypothesis,
    preferred_tone,
    your_store_name: raw.your_store_name ?? "",
    your_store_url: raw.your_store_url ?? "",
    your_store_logo_url: normalizeOptionalString(raw.your_store_logo_url),
    your_store_logo_path: normalizeOptionalString(raw.your_store_logo_path),
    your_store_logo_filename: normalizeOptionalString(
      raw.your_store_logo_filename
    ),
    your_store_logo_uploaded_at: normalizeOptionalTimestamp(
      raw.your_store_logo_uploaded_at
    ),

    // Back-fill legacy field names for prompt code that still reads them.
    product_name: our_product_name,
    product_description: supplier_product_description,
    competitor_url: primary_competitor_url,
    product_price: planned_sale_price,
    offer: current_offer,
    target_customer: initial_customer_hypothesis,
    main_problem: initial_problem_hypothesis,
    brand_tone: preferred_tone,
    claims_allowed: raw.claims_allowed ?? "",
    claims_banned: raw.claims_banned ?? "",
    output_goal: raw.output_goal ?? "",
  };
}

export type WorkflowStageId =
  | "research"
  | "insight_report"
  | "customer_avatar"
  | "mass_desires"
  | "marketing_angles"
  | "ad_copy"
  | "creative_prompts"
  | "compliance_check"
  | "export_ad_pack";

export interface WorkflowStage {
  id: WorkflowStageId;
  label: string;
}

export type ResearchRunStatus = "running" | "completed" | "failed";

export interface ResearchRun {
  id: string;
  project_id: string;
  stage: string;
  status: ResearchRunStatus;
  error: string | null;
  created_at: string;
}

export interface ResearchSource {
  id: string;
  run_id: string;
  project_id: string;
  url: string;
  platform: string;
  title: string;
  summary: string;
  emotional_theme: string;
  relevance_score: number;
  useful_phrases: string[];
  created_at: string;
}

/** Shape the OpenAI model returns for each source (before DB metadata is added). */
export interface ResearchSourceDraft {
  url: string;
  platform: string;
  title: string;
  summary: string;
  emotional_theme: string;
  relevance_score: number;
  useful_phrases: string[];
}

/** Token/cost summary returned by AI backend routes. */
export type AiUsageSummary = {
  operation: string;
  model?: string | null;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  cached_input_tokens?: number;
  estimated_cost_usd?: number | null;
  duration_ms?: number;
};

export type AiUsageSectionKey =
  | "setup"
  | "research"
  | "insight_report"
  | "customer_avatar"
  | "strategy"
  | "ads"
  | "product_page"
  | "additional_content";

export type WorkflowAiCostSummary = {
  cost_usd: number;
  total_tokens: number;
  operations: string[];
};

export type ProjectAiUsageSummary = {
  project_id: string;
  total_cost_usd: number;
  total_tokens: number;
  sections: Record<AiUsageSectionKey, WorkflowAiCostSummary>;
};

export type ProjectAiCostTotal = {
  project_id: string;
  total_cost_usd: number;
  total_tokens: number;
};

export type ProjectAiCostTotalsResponse = {
  projects: ProjectAiCostTotal[];
};

export interface RunResearchResponse {
  run: ResearchRun;
  sources: ResearchSource[];
  new_sources?: ResearchSource[];
  total_sources?: number;
  mode?: "initial" | "append";
  warning?: string;
  ai_usage?: AiUsageSummary;
}

export type EmotionalIntensity = "low" | "medium" | "high";

export interface PainCluster {
  name: string;
  description: string;
  evidence_from_sources: string[];
  emotional_intensity: EmotionalIntensity;
}

export interface LanguagePattern {
  pattern: string;
  meaning: string;
  copywriting_use: string;
}

export interface EmotionalState {
  state: string;
  description: string;
  trigger_moments: string[];
}

export interface FailedSolution {
  solution: string;
  why_it_failed: string;
  market_belief: string;
}

export interface ComplianceWarning {
  risk: string;
  why_it_matters: string;
  safer_direction: string;
}

/** The structured analysis the model produces (before DB metadata is added). */
export interface ResearchInsightReport {
  pain_clusters: PainCluster[];
  language_patterns: LanguagePattern[];
  emotional_states: EmotionalState[];
  failed_solutions: FailedSolution[];
  hopes: string[];
  fears: string[];
  copywriting_notes: string;
  compliance_warnings: ComplianceWarning[];
}

/** A saved insight report row from the research_insights table. */
export interface ResearchInsight extends ResearchInsightReport {
  id: string;
  project_id: string;
  run_id: string;
  created_at: string;
}

export interface GenerateInsightResponse {
  insight: ResearchInsight;
  ai_usage?: AiUsageSummary;
}

export interface CustomerAvatarDemographics {
  age_range: string;
  gender_skew: string;
  location_context: string;
  income_or_spending_context: string;
  life_stage: string;
}

export interface CustomerAvatarPsychographics {
  core_beliefs: string[];
  attitudes: string[];
  identity_markers: string[];
  values: string[];
  prejudices_or_biases: string[];
}

export interface CustomerAvatarVictoriesFailures {
  victories: string[];
  failures: string[];
}

export interface CustomerAvatarExistingSolution {
  solution: string;
  experience: string;
  likes: string;
  dislikes: string;
  belief_about_effectiveness: string;
}

export interface CustomerAvatarLanguageBank {
  phrases_they_use: string[];
  words_to_use_in_copy: string[];
  words_to_avoid: string[];
}

export interface CustomerAvatarCopywritingImplications {
  best_emotional_angle: string;
  best_logical_angle: string;
  trust_builders: string[];
  risk_reducers: string[];
}

/** Structured customer avatar content stored in generated_outputs.content_json. */
export interface CustomerAvatarContent {
  avatar_name: string;
  avatar_summary: string;
  demographics: CustomerAvatarDemographics;
  psychographics: CustomerAvatarPsychographics;
  hopes_and_dreams: string[];
  victories_and_failures: CustomerAvatarVictoriesFailures;
  outside_forces_they_blame: string[];
  existing_solutions: CustomerAvatarExistingSolution[];
  horror_stories_or_bad_experiences: string[];
  buying_triggers: string[];
  objections: string[];
  language_bank: CustomerAvatarLanguageBank;
  copywriting_implications: CustomerAvatarCopywritingImplications;
  compliance_notes: string[];
}

/** A saved generated_outputs row for a customer avatar. */
export interface CustomerAvatarOutput {
  id: string;
  project_id: string;
  run_id: string | null;
  output_type: "customer_avatar";
  parent_type: string | null;
  parent_id: string | null;
  content_json: CustomerAvatarContent;
  content_text: string;
  created_at: string;
}

export interface GenerateAvatarResponse {
  avatar: CustomerAvatarOutput;
  ai_usage?: AiUsageSummary;
}

/** Mass desire fields produced by OpenAI (before DB metadata). */
export interface MassDesireDraft {
  desire_statement: string;
  audience_segment: string;
  what_they_are_really_buying: string;
  emotional_driver: string;
  life_context: string;
  pain_it_moves_away_from: string;
  positive_outcome_it_moves_toward: string;
  why_this_desire_is_distinct: string;
  copy_direction: string;
  messaging_to_avoid: string;
  compliance_notes: string[];
}

/** A saved row from the mass_desires table. */
export interface MassDesire extends MassDesireDraft {
  id: string;
  project_id: string;
  run_id: string | null;
  sort_order: number;
  created_at: string;
}

/** OpenAI response shape for mass desires generation. */
export interface MassDesiresContent {
  mass_desires: MassDesireDraft[];
}

export interface GenerateDesiresResponse {
  desires: MassDesire[];
}

/** Marketing angle fields produced by OpenAI (before DB metadata). */
export interface MarketingAngleDraft {
  angle_name: string;
  target_audience: string;
  story_arc: string;
  beginning_situation: string;
  crisis_or_realization_moment: string;
  discovery_moment: string;
  resolution: string;
  unique_problem_mechanism: string;
  unique_solution_mechanism: string;
  key_emotional_moment: string;
  real_language_patterns: string[];
  copy_direction: string;
  creative_direction: string;
  compliance_notes: string[];
}

export type AngleReviewStatus =
  | "untested"
  | "shortlisted"
  | "rejected"
  | "published"
  | "needs_copy"
  | "ready_for_creative"
  | "ready_to_publish";

export const ANGLE_REVIEW_STATUSES: readonly AngleReviewStatus[] = [
  "untested",
  "shortlisted",
  "rejected",
  "published",
  "needs_copy",
  "ready_for_creative",
  "ready_to_publish",
] as const;

export interface AngleReviewPatch {
  review_status?: AngleReviewStatus;
  is_shortlisted?: boolean;
  priority_score?: number;
  reviewer_notes?: string;
}

/** A saved row from the marketing_angles table. */
export interface MarketingAngle extends MarketingAngleDraft {
  id: string;
  project_id: string;
  mass_desire_id: string;
  sort_order: number;
  review_status: AngleReviewStatus;
  is_shortlisted: boolean;
  priority_score: number;
  reviewer_notes: string;
  created_at: string;
}

export interface UpdateAngleReviewResponse {
  angle: MarketingAngle;
}

export interface MarketingAngleGroup {
  mass_desire_id: string;
  desire_statement: string;
  angles: MarketingAngleDraft[];
}

export interface MarketingAnglesContent {
  angle_groups: MarketingAngleGroup[];
}

export interface MassDesireWithAngles {
  desire: MassDesire;
  angles: MarketingAngle[];
}

export interface GenerateAnglesResponse {
  desires: MassDesireWithAngles[];
  ai_usage?: AiUsageSummary;
}

export interface PrimaryTextVariant {
  label: string;
  text: string;
  strategy: string;
}

export interface HeadlineVariant {
  text: string;
  angle: string;
}

export interface DescriptionVariant {
  text: string;
  angle: string;
}

export interface HookVariant {
  text: string;
  why_it_works: string;
}

export interface HookTransition {
  hook: string;
  transition_paragraph: string;
  flows_into: string;
}

export interface Callout {
  text: string;
  use_case: string;
}

export interface CopyComplianceNote {
  risk: string;
  why_it_matters: string;
  safer_direction: string;
}

/** A single ad variation: copy paired with its visual strategy + image prompt. */
export interface AdVariation {
  primary: string;
  headline: string;
  description: string;
  visual_strategy: string;
  image_prompt: string;
  /** Per-ad lock so regeneration can be blocked. Defaults to false. */
  locked?: boolean;
  /** User-marked winning ad. Defaults to false. */
  is_winner?: boolean;
  /** Public URL of an uploaded ad image in Supabase Storage. */
  image_url?: string;
  /** Storage object path within the ad-images bucket. */
  image_path?: string;
  /** Original filename at upload time. */
  image_filename?: string;
  /** ISO timestamp when the image was uploaded. */
  image_uploaded_at?: string;
  /** MIME type of the uploaded image, e.g. image/png. */
  image_file_type?: string;
  /** ISO timestamp of the last per-ad regeneration. */
  last_regenerated_at?: string;
  /** Number of times this ad has been regenerated. Defaults to 0. */
  revision_count?: number;
}

export type RegenerateMode = "full_ad" | "image_prompt_only";

/** Ad copy content produced by OpenAI (before DB metadata). */
export interface AdCopyContent {
  long_form_story: string;
  short_primary_texts: PrimaryTextVariant[];
  medium_primary_texts: PrimaryTextVariant[];
  headlines: HeadlineVariant[];
  descriptions: DescriptionVariant[];
  hooks: HookVariant[];
  hook_transitions: HookTransition[];
  callouts: Callout[];
  compliance_notes: CopyComplianceNote[];
  /** New simplified copy pack: exactly 5 ad variations. */
  ad_variations?: AdVariation[];
  /** New simplified copy pack: exactly 5 ChatGPT image-generation prompts. */
  image_prompts?: string[];
}

/** A saved row from the ad_copy_sets table. */
export interface AdCopySet extends AdCopyContent {
  id: string;
  project_id: string;
  mass_desire_id: string;
  marketing_angle_id: string;
  run_id: string | null;
  created_at: string;
  /** True once the user has edited the generated copy pack in-app. */
  is_edited?: boolean;
}

export interface GenerateCopyResponse {
  copySet: AdCopySet;
  ai_usage?: AiUsageSummary;
}

export interface CopyGenerateErrorResponse {
  error: string;
  stage:
    | "openai"
    | "parse"
    | "validation"
    | "save"
    | "response"
    | "unknown";
  status: number;
  details: string;
  ai_usage?: AiUsageSummary;
  debug_ref?: string;
}

export interface UpdateCopyResponse {
  copySet: AdCopySet;
}

export interface FixImageFilenameResponse {
  copySet: AdCopySet;
}

export interface RegenerateCopyResponse {
  copySet: AdCopySet;
  ai_usage?: AiUsageSummary;
}

export interface CreativeConcept {
  concept_name: string;
  format: string;
  core_idea: string;
  why_it_matches_the_angle: string;
  visual_hook: string;
  recommended_use: string;
}

export interface ImagePrompt {
  concept_name: string;
  aspect_ratio: string;
  prompt: string;
  overlay_text: string;
  style_notes: string;
}

export interface UgcScript {
  script_name: string;
  duration: string;
  hook: string;
  script: string;
  shot_list: string[];
  caption: string;
}

export interface CreativeOverlayText {
  text: string;
  use_case: string;
}

export interface CreativeComplianceNote {
  risk: string;
  safer_direction: string;
}

/** Creative prompt content produced by OpenAI (before DB metadata). */
export interface CreativePromptContent {
  creative_concepts: CreativeConcept[];
  image_prompts: ImagePrompt[];
  ugc_scripts: UgcScript[];
  overlay_texts: CreativeOverlayText[];
  negative_prompts: string[];
  compliance_notes: CreativeComplianceNote[];
}

/** A saved row from the creative_prompt_sets table. */
export interface CreativePromptSet extends CreativePromptContent {
  id: string;
  project_id: string;
  mass_desire_id: string;
  marketing_angle_id: string;
  ad_copy_set_id: string;
  created_at: string;
}

export interface GenerateCreativePromptsResponse {
  promptSet: CreativePromptSet;
}

/* ------------------------------------------------------------------ */
/* Top-of-funnel desire concepts (mass desire level)                  */
/* ------------------------------------------------------------------ */

export type TofOverlayRecommendation =
  | "none"
  | "headline_only"
  | "headline_plus_support_line";

/** A single top-of-funnel concept row from desire_concepts. */
export interface DesireConcept {
  id: string;
  concept_set_id: string;
  project_id: string;
  mass_desire_id: string;
  concept_number: number;
  concept_title: string;
  headline: string;
  support_line: string;
  overlay_recommendation: TofOverlayRecommendation;
  visual_strategy: string;
  rationale: string;
  image_prompt: string;
  image_url?: string | null;
  image_path?: string | null;
  image_filename?: string | null;
  image_uploaded_at?: string | null;
  image_file_type?: string | null;
  created_at: string;
  updated_at: string;
}

/** Parent set + nested concepts for one mass desire. */
export interface DesireConceptSet {
  id: string;
  project_id: string;
  mass_desire_id: string;
  source_desire_title: string;
  source_desire_summary: string;
  status: string;
  created_at: string;
  updated_at: string;
  concepts: DesireConcept[];
}

/** Content shape returned by OpenAI before DB persistence. */
export interface TofConceptDraft {
  primary: string;
  headline: string;
  description: string;
  visual_strategy: string;
  image_prompt: string;
}

export interface GenerateTofConceptsResponse {
  conceptSet: DesireConceptSet;
  ai_usage?: AiUsageSummary;
}

/* ------------------------------------------------------------------ */
/* Ad candidates (selected, publishable ad units)                     */
/* ------------------------------------------------------------------ */

export type AdCandidateStatus = "draft" | "ready" | "needs_revision";

/** A saved row from the ad_candidates table. One active candidate per angle. */
export interface AdCandidate {
  id: string;
  project_id: string;
  mass_desire_id: string | null;
  marketing_angle_id: string;
  ad_copy_set_id: string | null;
  creative_prompt_set_id: string | null;
  ad_number: number | null;
  ad_title: string;
  selected_primary_text: string;
  selected_headline: string;
  selected_description: string;
  selected_hook: string;
  selected_callouts: string[];
  selected_image_prompts: ImagePrompt[];
  status: AdCandidateStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

/** Fields a user can set on an ad candidate from the UI. */
export interface AdCandidatePatch {
  ad_title?: string;
  selected_primary_text?: string;
  selected_headline?: string;
  selected_description?: string;
  selected_hook?: string;
  selected_callouts?: string[];
  selected_image_prompts?: ImagePrompt[];
  status?: AdCandidateStatus;
  notes?: string;
}

export interface UpsertAdCandidateResponse {
  candidate: AdCandidate;
}

export interface GetAdCandidatesResponse {
  candidates: AdCandidate[];
}

/* ------------------------------------------------------------------ */
/* Product Page (Shopify Custom Liquid export)                        */
/* ------------------------------------------------------------------ */

export type ProductPageSectionType =
  | "proof_intro"
  | "ritual"
  | "benefits_grid"
  | "how_to_use"
  | "social_proof"
  | "comparison"
  | "faq"
  | "guarantee"
  | "reviews"
  | "care_disclaimer";

export interface ProductPageFaqItem {
  question: string;
  answer: string;
}

export interface ProductPageDocumentLink {
  label: string;
  url: string;
}

export interface ProductPageCareItem {
  title: string;
  description: string;
}

export type ProductPageComparisonMark = "yes" | "no" | "partial";

export interface ProductPageComparisonRow {
  feature: string;
  left_mark: ProductPageComparisonMark;
  right_mark: ProductPageComparisonMark;
}

export interface ProductPageComparisonColumns {
  left: string;
  right: string;
}

export interface ProductPageBenefitItem {
  title: string;
  description: string;
}

export interface ProductPageStepItem {
  title: string;
  description: string;
}

export interface ProductPageTestimonial {
  quote: string;
  attribution: string;
}

export interface ProductPageSection {
  id: string;
  order: number;
  section_type: ProductPageSectionType;
  section_title: string;
  shopify_section_name: string;
  purpose: string;
  headline: string;
  accent_headline?: string;
  proof_line?: string;
  subheading?: string;
  product_name?: string;
  body_paragraphs: string[];
  bullets: string[];
  button_label?: string;
  small_print?: string;
  image_required: boolean;
  image_role?: string;
  image_prompt: string;
  image_filename: string;
  shopify_image_url: string;
  image_alt?: string;
  image_url?: string | null;
  image_path?: string | null;
  image_uploaded_at?: string | null;
  image_file_type?: string | null;
  custom_liquid: string;
  faq_items?: ProductPageFaqItem[];
  benefit_items?: ProductPageBenefitItem[];
  steps?: ProductPageStepItem[];
  comparison_left_title?: string;
  comparison_right_title?: string;
  comparison_left_bullets?: string[];
  comparison_right_bullets?: string[];
  comparison_rows?: ProductPageComparisonRow[];
  comparison_columns?: ProductPageComparisonColumns;
  care_items?: ProductPageCareItem[];
  document_links?: ProductPageDocumentLink[];
  testimonials?: ProductPageTestimonial[];
  footer_line?: string;
}

export interface ProductPageContent {
  page_title: string;
  page_strategy: string;
  sections: ProductPageSection[];
}

export interface ProductPageSet {
  id: string;
  project_id: string;
  content: ProductPageContent;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GenerateProductPageResponse {
  productPageSet: ProductPageSet;
  ai_usage?: AiUsageSummary;
}

export interface CreateProductPageTemplateResponse {
  productPageSet: ProductPageSet;
}

export interface UpdateProductPageResponse {
  productPageSet: ProductPageSet;
}
