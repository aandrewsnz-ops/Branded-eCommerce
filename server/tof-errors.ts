import type { Response } from "express";
import {
  aggregateAiUsage,
  type AiUsageApiPayload,
  type AiUsageSummary,
} from "./ai-usage";

export type TofFailureStage =
  | "openai"
  | "parse"
  | "validation"
  | "save"
  | "response"
  | "unknown";

export interface TofGenerateErrorBody {
  error: string;
  stage: TofFailureStage;
  status: number;
  details: string;
  operation: "tof-concepts";
  ai_usage?: AiUsageApiPayload;
}

export const TOF_MISSING_TABLE_DETAILS =
  "The database table for TOF concepts is missing. Run supabase/desire_concept_sets.sql in Supabase SQL editor, then notify pgrst, 'reload schema'.";

function stageDefaultStatus(stage: TofFailureStage): number {
  switch (stage) {
    case "openai":
    case "parse":
    case "validation":
      return 502;
    case "save":
    case "response":
      return 500;
    default:
      return 502;
  }
}

export function buildTofGenerateErrorBody(options: {
  stage: TofFailureStage;
  details: string;
  httpStatus?: number;
  aiUsageSummaries?: AiUsageSummary[];
}): TofGenerateErrorBody {
  const ai_usage = options.aiUsageSummaries?.length
    ? aggregateAiUsage(options.aiUsageSummaries)
    : undefined;

  const body: TofGenerateErrorBody = {
    error: "TOF concept generation failed",
    stage: options.stage,
    status: options.httpStatus ?? stageDefaultStatus(options.stage),
    details: options.details,
    operation: "tof-concepts",
  };

  if (ai_usage) body.ai_usage = ai_usage;
  return body;
}

export function sendTofGenerateError(
  res: Response,
  options: {
    stage: TofFailureStage;
    details: string;
    httpStatus?: number;
    aiUsageSummaries?: AiUsageSummary[];
  }
): Response {
  const body = buildTofGenerateErrorBody(options);
  return res.status(body.status).json(body);
}
