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
