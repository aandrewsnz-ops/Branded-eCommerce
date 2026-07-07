import { getSupabase } from "./supabase";

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

/** Expected operations per workflow section (for response shape). */
export const SECTION_OPERATIONS: Record<AiUsageSectionKey, readonly string[]> = {
  setup: [],
  research: ["research"],
  insight_report: ["insight-report"],
  customer_avatar: ["customer-avatar"],
  strategy: [
    "marketing-angles",
    "generate-copy",
    "regenerate-ad",
    "regenerate-image-prompt",
    "tof-concepts",
    "mass-desires",
  ],
  ads: [],
  product_page: ["product-page"],
  additional_content: ["creative-prompts"],
};

const OPERATION_TO_SECTION: Record<string, AiUsageSectionKey> = {
  research: "research",
  "insight-report": "insight_report",
  "customer-avatar": "customer_avatar",
  "marketing-angles": "strategy",
  "generate-copy": "strategy",
  "regenerate-ad": "strategy",
  "regenerate-image-prompt": "strategy",
  "tof-concepts": "strategy",
  "mass-desires": "strategy",
  "product-page": "product_page",
  "creative-prompts": "additional_content",
};

function emptySection(key: AiUsageSectionKey): WorkflowAiCostSummary {
  return {
    cost_usd: 0,
    total_tokens: 0,
    operations: [...SECTION_OPERATIONS[key]],
  };
}

function emptySections(): Record<AiUsageSectionKey, WorkflowAiCostSummary> {
  return {
    setup: emptySection("setup"),
    research: emptySection("research"),
    insight_report: emptySection("insight_report"),
    customer_avatar: emptySection("customer_avatar"),
    strategy: emptySection("strategy"),
    ads: emptySection("ads"),
    product_page: emptySection("product_page"),
    additional_content: emptySection("additional_content"),
  };
}

function toNumber(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

type UsageRow = {
  project_id: string | null;
  operation: string;
  estimated_cost_usd: number | null;
  total_tokens: number | null;
};

function aggregateRows(rows: UsageRow[]): {
  total_cost_usd: number;
  total_tokens: number;
  sections: Record<AiUsageSectionKey, WorkflowAiCostSummary>;
} {
  const sections = emptySections();
  let total_cost_usd = 0;
  let total_tokens = 0;

  for (const row of rows) {
    const cost = toNumber(row.estimated_cost_usd);
    const tokens = toNumber(row.total_tokens);
    total_cost_usd += cost;
    total_tokens += tokens;

    const sectionKey = OPERATION_TO_SECTION[row.operation];
    if (!sectionKey) continue;

    sections[sectionKey].cost_usd += cost;
    sections[sectionKey].total_tokens += tokens;
  }

  return { total_cost_usd, total_tokens, sections };
}

export async function getProjectAiUsageSummary(
  projectId: string
): Promise<ProjectAiUsageSummary> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("ai_usage_events")
    .select("project_id, operation, estimated_cost_usd, total_tokens")
    .eq("project_id", projectId)
    .eq("status", "success");

  if (error) {
    throw new Error(`Failed to load AI usage summary: ${error.message}`);
  }

  const rows = (data ?? []) as UsageRow[];
  const { total_cost_usd, total_tokens, sections } = aggregateRows(rows);

  return {
    project_id: projectId,
    total_cost_usd,
    total_tokens,
    sections,
  };
}

export async function getAllProjectAiCostTotals(): Promise<ProjectAiCostTotal[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("ai_usage_events")
    .select("project_id, operation, estimated_cost_usd, total_tokens")
    .eq("status", "success")
    .not("project_id", "is", null);

  if (error) {
    throw new Error(`Failed to load AI usage totals: ${error.message}`);
  }

  const byProject = new Map<string, { cost: number; tokens: number }>();

  for (const row of (data ?? []) as UsageRow[]) {
    const projectId = row.project_id;
    if (!projectId) continue;

    const existing = byProject.get(projectId) ?? { cost: 0, tokens: 0 };
    existing.cost += toNumber(row.estimated_cost_usd);
    existing.tokens += toNumber(row.total_tokens);
    byProject.set(projectId, existing);
  }

  return Array.from(byProject.entries()).map(([project_id, totals]) => ({
    project_id,
    total_cost_usd: totals.cost,
    total_tokens: totals.tokens,
  }));
}
