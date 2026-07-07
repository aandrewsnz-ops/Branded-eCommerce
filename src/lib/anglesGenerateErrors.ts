import {
  formatAiFailureStage,
  type AiFailureStage,
} from "./aiFailureStage";

export type AnglesGenerateStage = "openai_or_parse" | "validation";

export interface AnglesGenerateErrorResponse {
  stage: AnglesGenerateStage;
  failed_desire_id?: string;
  failed_desire_index?: number;
  error: string;
  raw?: string;
  status: number;
}

function isAnglesGenerateStage(value: unknown): value is AnglesGenerateStage {
  return value === "openai_or_parse" || value === "validation";
}

export function parseAnglesGenerateError(
  payload: unknown,
  httpStatus: number
): AnglesGenerateErrorResponse | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  const error =
    typeof record.error === "string" && record.error.trim().length > 0
      ? record.error.trim()
      : null;

  if (isAnglesGenerateStage(record.stage) && error) {
    const body: AnglesGenerateErrorResponse = {
      stage: record.stage,
      error,
      status: httpStatus,
    };

    if (typeof record.failed_desire_id === "string" && record.failed_desire_id) {
      body.failed_desire_id = record.failed_desire_id;
    }
    if (typeof record.failed_desire_index === "number") {
      body.failed_desire_index = record.failed_desire_index;
    }
    if (typeof record.raw === "string" && record.raw.trim()) {
      body.raw = record.raw;
    }

    return body;
  }

  if (error) {
    return {
      stage: "validation",
      error,
      status: httpStatus,
    };
  }

  return null;
}

function formatAnglesFailureStage(stage: AnglesGenerateStage): string {
  if (stage === "validation") return formatAiFailureStage("validation");
  return "OpenAI / Parse";
}

export function anglesErrorBannerMessage(
  body: AnglesGenerateErrorResponse
): string {
  let message = `Marketing angles failed (${formatAnglesFailureStage(body.stage)}): ${body.error}`;

  if (body.failed_desire_index != null) {
    message += ` (desire ${body.failed_desire_index + 1}`;
    if (body.failed_desire_id) {
      message += `, id ${body.failed_desire_id}`;
    }
    message += ")";
  }

  return message;
}

export function anglesErrorOverlayStage(
  body: AnglesGenerateErrorResponse
): AiFailureStage {
  if (body.stage === "validation") return "validation";
  return body.raw ? "parse" : "openai";
}

export function anglesErrorOverlayDetails(
  body: AnglesGenerateErrorResponse
): string {
  if (body.stage === "validation") {
    return body.error;
  }
  if (body.failed_desire_index != null) {
    return `Desire ${body.failed_desire_index + 1}: ${body.error}`;
  }
  return body.error;
}
