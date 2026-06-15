import type { AiUsageSummary } from "../types";
import {
  formatAiFailureStage,
  isAiFailureStage,
  type AiFailureStage,
} from "./aiFailureStage";

export interface TofGenerateErrorResponse {
  error: string;
  stage: AiFailureStage;
  status: number;
  details: string;
  operation?: "tof-concepts";
  ai_usage?: AiUsageSummary;
}

export { formatAiFailureStage };

function isMissingDesireConceptSetsMessage(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("desire_concept_sets") ||
    lower.includes("desire_concept_sets.sql") ||
    lower.includes("could not find the table")
  );
}

function inferStage(record: Record<string, unknown>): AiFailureStage {
  if (isAiFailureStage(record.stage)) return record.stage;
  if (typeof record.status === "number" && record.status >= 500) return "save";
  return "unknown";
}

export function parseTofGenerateError(
  payload: unknown,
  httpStatus: number
): TofGenerateErrorResponse | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  if (record.error === "TOF concept generation failed") {
    const stage = inferStage(record);
    const details =
      typeof record.details === "string" && record.details.trim().length > 0
        ? record.details.trim()
        : `The request failed (HTTP ${httpStatus}).`;

    const body: TofGenerateErrorResponse = {
      error: "TOF concept generation failed",
      stage,
      status:
        typeof record.status === "number" ? record.status : httpStatus,
      details,
      operation: "tof-concepts",
    };

    if (record.ai_usage && typeof record.ai_usage === "object") {
      body.ai_usage = record.ai_usage as AiUsageSummary;
    }
    return body;
  }

  if (typeof record.error === "string") {
    const errorText = record.error.trim();
    const details =
      typeof record.details === "string" && record.details.trim().length > 0
        ? record.details.trim()
        : errorText;

    if (
      isMissingDesireConceptSetsMessage(errorText) ||
      isMissingDesireConceptSetsMessage(details)
    ) {
      return {
        error: "TOF concept generation failed",
        stage: "save",
        status: httpStatus,
        details: errorText.includes("desire_concept")
          ? errorText
          : details,
        operation: "tof-concepts",
      };
    }

    if (record.ai_usage && typeof record.ai_usage === "object") {
      return {
        error: "TOF concept generation failed",
        stage: inferStage(record),
        status: httpStatus,
        details,
        operation: "tof-concepts",
        ai_usage: record.ai_usage as AiUsageSummary,
      };
    }
  }

  return null;
}

export function tofErrorOverlayDetails(
  body: TofGenerateErrorResponse
): string {
  if (
    body.stage === "save" &&
    isMissingDesireConceptSetsMessage(body.details)
  ) {
    return `The database table for TOF concepts is missing.

Run:
supabase/desire_concept_sets.sql

Then run:
notify pgrst, 'reload schema';`;
  }

  if (body.stage === "save") {
    return "The AI response was received, but the app could not save the TOF concepts.";
  }
  if (body.stage === "parse" || body.stage === "validation") {
    return "The AI response was received, but the app could not validate the TOF concepts.";
  }
  if (body.stage === "openai") {
    return body.details;
  }
  return body.details;
}
