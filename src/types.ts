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
