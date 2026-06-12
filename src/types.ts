export interface ProductProject {
  id: string;
  product_name: string;
  product_description: string;
  competitor_url: string;
  target_country: string;
  target_customer: string;
  main_problem: string;
  product_price: string;
  offer: string;
  claims_allowed: string;
  claims_banned: string;
  brand_tone: string;
  output_goal: string;
  created_at: string;
}

/** Shape of the form used to create a new project (everything except generated metadata). */
export type ProductProjectInput = Omit<ProductProject, "id" | "created_at">;

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

export interface RunResearchResponse {
  run: ResearchRun;
  sources: ResearchSource[];
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

/** A saved row from the marketing_angles table. */
export interface MarketingAngle extends MarketingAngleDraft {
  id: string;
  project_id: string;
  mass_desire_id: string;
  sort_order: number;
  created_at: string;
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
}

/** A saved row from the ad_copy_sets table. */
export interface AdCopySet extends AdCopyContent {
  id: string;
  project_id: string;
  mass_desire_id: string;
  marketing_angle_id: string;
  run_id: string | null;
  created_at: string;
}

export interface GenerateCopyResponse {
  copySet: AdCopySet;
}
