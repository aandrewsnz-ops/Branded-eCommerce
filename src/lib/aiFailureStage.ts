export type AiFailureStage =
  | "openai"
  | "parse"
  | "validation"
  | "save"
  | "response"
  | "unknown";

const STAGE_LABELS: Record<AiFailureStage, string> = {
  openai: "OpenAI",
  parse: "Parse",
  validation: "Validation",
  save: "Save",
  response: "Response",
  unknown: "Unknown",
};

export function formatAiFailureStage(stage: AiFailureStage): string {
  return STAGE_LABELS[stage] ?? "Unknown";
}

export function isAiFailureStage(value: unknown): value is AiFailureStage {
  return (
    value === "openai" ||
    value === "parse" ||
    value === "validation" ||
    value === "save" ||
    value === "response" ||
    value === "unknown"
  );
}
