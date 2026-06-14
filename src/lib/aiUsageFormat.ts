import type { AiUsageSummary, ProjectAiUsageSummary } from "../types";
import type { WorkflowMode } from "../components/workflow";

function roundCostLabel(costUsd: number): string {
  const cents = Math.round(costUsd * 100);
  if (costUsd > 0 && cents === 0) return "<$0.01";
  return `$${(cents / 100).toFixed(2)}`;
}

/** Display AI spend in sidebar/nav — hides zero by default. */
export function formatAiCost(
  costUsd: number | null | undefined,
  options?: { showZero?: boolean }
): string {
  if (costUsd == null || !Number.isFinite(costUsd)) return "";
  if (costUsd === 0) return options?.showZero ? "$0.00" : "";
  return roundCostLabel(costUsd);
}

export function formatTokenCount(value: number | undefined | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US");
}

export function formatUsd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Not available";
  if (value === 0) return "$0.00";
  return roundCostLabel(value);
}

export function formatDurationMs(ms: number | undefined | null): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export function parseAiUsage(payload: unknown): AiUsageSummary | null {
  if (!payload || typeof payload !== "object" || !("ai_usage" in payload)) {
    return null;
  }
  const usage = (payload as { ai_usage: unknown }).ai_usage;
  if (!usage || typeof usage !== "object") return null;
  return usage as AiUsageSummary;
}

const WORKFLOW_MODE_TO_USAGE_SECTION: Record<
  WorkflowMode,
  keyof ProjectAiUsageSummary["sections"]
> = {
  setup: "setup",
  research: "research",
  insight_report: "insight_report",
  avatar: "customer_avatar",
  strategy: "strategy",
  ads: "ads",
  additional: "additional_content",
};

export function workflowSectionCostUsd(
  summary: ProjectAiUsageSummary | null | undefined,
  mode: WorkflowMode
): number {
  if (!summary) return 0;
  return summary.sections[WORKFLOW_MODE_TO_USAGE_SECTION[mode]].cost_usd;
}
