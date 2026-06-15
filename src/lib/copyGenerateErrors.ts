import type { AiUsageSummary } from "../types";
import {
  formatAiFailureStage,
  isAiFailureStage,
  type AiFailureStage,
} from "./aiFailureStage";

/** @deprecated Use AiFailureStage */
export type CopyFailureStage = AiFailureStage;

export interface CopyGenerateErrorResponse {
  error: string;
  stage: AiFailureStage;
  status: number;
  details: string;
  ai_usage?: AiUsageSummary;
  debug_ref?: string;
}

export function formatCopyFailureStage(stage: AiFailureStage): string {
  return formatAiFailureStage(stage);
}

export function parseCopyGenerateError(
  payload: unknown,
  httpStatus: number
): CopyGenerateErrorResponse | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (record.error !== "Generate Copy failed") return null;

  const stage = isAiFailureStage(record.stage) ? record.stage : "unknown";
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
