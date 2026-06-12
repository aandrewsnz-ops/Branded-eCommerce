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
