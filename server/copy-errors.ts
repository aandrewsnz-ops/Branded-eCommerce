import type { Response } from "express";
import {
  aggregateAiUsage,
  type AiUsageApiPayload,
  type AiUsageSummary,
} from "./ai-usage";

export type CopyFailureStage =
  | "openai"
  | "parse"
  | "validation"
  | "save"
  | "response"
  | "unknown";

export interface CopyGenerateErrorBody {
  error: string;
  stage: CopyFailureStage;
  status: number;
  details: string;
  ai_usage?: AiUsageApiPayload;
  debug_ref?: string;
  raw?: string;
}

export class CopyGenerateError extends Error {
  readonly stage: CopyFailureStage;
  readonly httpStatus: number;
  readonly details: string;
  readonly aiUsageSummaries?: AiUsageSummary[];
  readonly debugRef?: string;
  readonly rawText?: string;

  constructor(options: {
    stage: CopyFailureStage;
    details: string;
    httpStatus?: number;
    aiUsageSummaries?: AiUsageSummary[];
    debugRef?: string;
    rawText?: string;
    message?: string;
  }) {
    super(options.message ?? options.details);
    this.name = "CopyGenerateError";
    this.stage = options.stage;
    this.details = options.details;
    this.httpStatus = options.httpStatus ?? stageDefaultStatus(options.stage);
    this.aiUsageSummaries = options.aiUsageSummaries;
    this.debugRef = options.debugRef;
    this.rawText = options.rawText;
  }
}

function stageDefaultStatus(stage: CopyFailureStage): number {
  switch (stage) {
    case "openai":
    case "parse":
    case "validation":
      return 502;
    case "save":
      return 500;
    case "response":
      return 500;
    default:
      return 502;
  }
}

export function buildCopyGenerateErrorBody(
  error: CopyGenerateError
): CopyGenerateErrorBody {
  const ai_usage = error.aiUsageSummaries?.length
    ? aggregateAiUsage(error.aiUsageSummaries)
    : undefined;

  const body: CopyGenerateErrorBody = {
    error: "Generate Copy failed",
    stage: error.stage,
    status: error.httpStatus,
    details: error.details,
  };

  if (ai_usage) body.ai_usage = ai_usage;
  if (error.debugRef) body.debug_ref = error.debugRef;
  if (error.rawText && error.stage === "parse") {
    body.raw = error.rawText.slice(0, 4000);
  }

  return body;
}

export function sendCopyGenerateError(res: Response, error: unknown): Response {
  if (error instanceof CopyGenerateError) {
    return res
      .status(error.httpStatus)
      .json(buildCopyGenerateErrorBody(error));
  }

  const message = error instanceof Error ? error.message : String(error);
  return res.status(502).json({
    error: "Generate Copy failed",
    stage: "unknown" satisfies CopyFailureStage,
    status: 502,
    details: message,
  } satisfies CopyGenerateErrorBody);
}
