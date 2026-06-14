import type { AiUsageSummary } from "../types";

export type CopyFailureStage =
  | "openai"
  | "parse"
  | "validation"
  | "save"
  | "response"
  | "unknown";

export interface CopyGenerateErrorResponse {
  error: string;
  stage: CopyFailureStage;
  status: number;
  details: string;
  ai_usage?: AiUsageSummary;
  debug_ref?: string;
}

const STAGE_LABELS: Record<CopyFailureStage, string> = {
  openai: "OpenAI",
  parse: "Parse",
  validation: "Validation",
  save: "Save",
  response: "Response",
  unknown: "Unknown",
};

export function formatCopyFailureStage(stage: CopyFailureStage): string {
  return STAGE_LABELS[stage] ?? "Unknown";
}

function isCopyFailureStage(value: unknown): value is CopyFailureStage {
  return (
    value === "openai" ||
    value === "parse" ||
    value === "validation" ||
    value === "save" ||
    value === "response" ||
    value === "unknown"
  );
}

export function parseCopyGenerateError(
  payload: unknown,
  httpStatus: number
): CopyGenerateErrorResponse | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (record.error !== "Generate Copy failed") return null;

  const stage = isCopyFailureStage(record.stage) ? record.stage : "unknown";
  const details =
    typeof record.details === "string" && record.details.trim().length > 0
      ? record.details.trim()
      : `The request failed (HTTP ${httpStatus}).`;

  const body: CopyGenerateErrorResponse = {
    error: "Generate Copy failed",
    stage,
    status:
      typeof record.status === "number" ? record.status : httpStatus,
    details,
  };

  if (record.ai_usage && typeof record.ai_usage === "object") {
    body.ai_usage = record.ai_usage as AiUsageSummary;
  }
  if (typeof record.debug_ref === "string" && record.debug_ref.trim()) {
    body.debug_ref = record.debug_ref.trim();
  }

  return body;
}

export function copyErrorBannerMessage(body: CopyGenerateErrorResponse): string {
  return `${body.error} (${formatCopyFailureStage(body.stage)}): ${body.details}`;
}

export function copyErrorOverlayDetails(body: CopyGenerateErrorResponse): string {
  if (body.stage === "save") {
    return "The AI response was received, but the app could not save the copy pack.";
  }
  if (body.stage === "parse" || body.stage === "validation") {
    return "The AI response was received, but the app could not validate the copy pack.";
  }
  if (body.stage === "openai") {
    return body.details;
  }
  return body.details;
}
