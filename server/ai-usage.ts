import type OpenAI from "openai";
import { getModelPricing } from "./ai-pricing";
import { OPENAI_MODEL } from "./openai";
import { getSupabase } from "./supabase";

export type AiOperation =
  | "research"
  | "insight-report"
  | "customer-avatar"
  | "marketing-angles"
  | "generate-copy"
  | "regenerate-ad"
  | "regenerate-image-prompt"
  | "tof-concepts"
  | "product-page";

export interface NormalizedOpenAiUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cached_input_tokens: number;
}

export interface AiUsageSummary {
  operation: AiOperation;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cached_input_tokens: number;
  estimated_cost_usd: number | null;
  duration_ms: number;
}

export interface AiUsageApiPayload {
  operation: AiOperation;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cached_input_tokens: number;
  estimated_cost_usd: number | null;
  duration_ms: number;
}

export interface AiUsageLogContext {
  operation: AiOperation;
  projectId?: string | null;
  sourceRoute?: string;
  metadata?: Record<string, unknown>;
  promptChars?: number;
}

export interface AiUsageEventInput {
  operation: AiOperation;
  projectId?: string | null;
  sourceRoute?: string;
  model?: string | null;
  status: "success" | "error";
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  cached_input_tokens?: number;
  estimated_cost_usd?: number | null;
  duration_ms?: number;
  prompt_chars?: number;
  response_chars?: number;
  error_status?: number | null;
  error_code?: string | null;
  error_message?: string | null;
  openai_request_id?: string | null;
  metadata?: Record<string, unknown>;
}

function toInt(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? Math.max(0, Math.trunc(num)) : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function readCachedTokens(details: unknown): number {
  const record = asRecord(details);
  return toInt(record.cached_tokens);
}

/** Support Chat Completions and Responses API usage shapes. */
export function normalizeOpenAiUsage(response: unknown): NormalizedOpenAiUsage {
  const root = asRecord(response);
  const usage = asRecord(root.usage);

  const inputFromResponses = usage.input_tokens;
  const outputFromResponses = usage.output_tokens;
  const inputFromChat = usage.prompt_tokens;
  const outputFromChat = usage.completion_tokens;

  const input_tokens = toInt(
    inputFromResponses !== undefined ? inputFromResponses : inputFromChat
  );
  const output_tokens = toInt(
    outputFromResponses !== undefined ? outputFromResponses : outputFromChat
  );

  const totalRaw = usage.total_tokens;
  const total_tokens =
    totalRaw !== undefined ? toInt(totalRaw) : input_tokens + output_tokens;

  const cachedFromResponses = readCachedTokens(usage.input_tokens_details);
  const cachedFromChat = readCachedTokens(usage.prompt_tokens_details);
  const cached_input_tokens =
    cachedFromResponses > 0 ? cachedFromResponses : cachedFromChat;

  return {
    input_tokens,
    output_tokens,
    total_tokens,
    cached_input_tokens,
  };
}

export function estimateOpenAiCostUsd(
  model: string,
  usage: NormalizedOpenAiUsage
): { cost: number | null; pricingMissing: boolean } {
  const pricing = getModelPricing(model);
  if (!pricing) {
    return { cost: null, pricingMissing: true };
  }

  const billableUncachedInput = Math.max(
    usage.input_tokens - usage.cached_input_tokens,
    0
  );
  const cachedRate =
    pricing.cachedInputPer1M ?? pricing.inputPer1M;

  const cost =
    (billableUncachedInput / 1_000_000) * pricing.inputPer1M +
    (usage.cached_input_tokens / 1_000_000) * cachedRate +
    (usage.output_tokens / 1_000_000) * pricing.outputPer1M;

  return {
    cost: Math.round(cost * 1_000_000) / 1_000_000,
    pricingMissing: false,
  };
}

function truncateErrorMessage(message: string, max = 500): string {
  const trimmed = message.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function readErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const record = error as Record<string, unknown>;
  if (typeof record.status === "number") return record.status;
  if (typeof record.statusCode === "number") return record.statusCode;
  return undefined;
}

function readErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const record = error as Record<string, unknown>;
  if (typeof record.code === "string") return record.code;
  if (typeof record.type === "string") return record.type;
  return undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatCost(cost: number | null | undefined): string {
  if (cost == null) return "n/a";
  return `$${cost.toFixed(6)}`;
}

export async function logAiUsageEvent(input: AiUsageEventInput): Promise<void> {
  const row = {
    project_id: input.projectId ?? null,
    operation: input.operation,
    source_route: input.sourceRoute ?? null,
    model: input.model ?? null,
    status: input.status,
    input_tokens: input.input_tokens ?? 0,
    output_tokens: input.output_tokens ?? 0,
    total_tokens: input.total_tokens ?? 0,
    cached_input_tokens: input.cached_input_tokens ?? 0,
    estimated_cost_usd: input.estimated_cost_usd ?? null,
    duration_ms: input.duration_ms ?? null,
    prompt_chars: input.prompt_chars ?? null,
    response_chars: input.response_chars ?? null,
    error_status: input.error_status ?? null,
    error_code: input.error_code ?? null,
    error_message: input.error_message ?? null,
    openai_request_id: input.openai_request_id ?? null,
    metadata: input.metadata ?? {},
  };

  if (input.status === "success") {
    console.log(
      `[AI_USAGE] operation=${input.operation} model=${input.model ?? "unknown"} ` +
        `input=${row.input_tokens} output=${row.output_tokens} total=${row.total_tokens} ` +
        `cost=${formatCost(input.estimated_cost_usd)} durationMs=${row.duration_ms ?? 0}`
    );
  } else {
    console.log(
      `[AI_USAGE] operation=${input.operation} status=error ` +
        `errorStatus=${row.error_status ?? "unknown"} durationMs=${row.duration_ms ?? 0}`
    );
  }

  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("ai_usage_events").insert(row);
    if (error) {
      console.warn("[AI_USAGE] Failed to persist usage event:", error.message);
    }
  } catch (persistError: unknown) {
    console.warn(
      "[AI_USAGE] Failed to persist usage event:",
      errorMessage(persistError)
    );
  }
}

export function buildAiUsageSummary(
  ctx: AiUsageLogContext,
  model: string,
  usage: NormalizedOpenAiUsage,
  durationMs: number
): AiUsageSummary {
  const { cost } = estimateOpenAiCostUsd(model, usage);
  return {
    operation: ctx.operation,
    model,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    total_tokens: usage.total_tokens,
    cached_input_tokens: usage.cached_input_tokens,
    estimated_cost_usd: cost,
    duration_ms: durationMs,
  };
}

export function aggregateAiUsage(
  summaries: AiUsageSummary[]
): AiUsageApiPayload | undefined {
  if (summaries.length === 0) return undefined;

  const first = summaries[0];
  let input_tokens = 0;
  let output_tokens = 0;
  let total_tokens = 0;
  let cached_input_tokens = 0;
  let duration_ms = 0;
  let estimated_cost_usd = 0;
  let hasCost = true;

  for (const item of summaries) {
    input_tokens += item.input_tokens;
    output_tokens += item.output_tokens;
    total_tokens += item.total_tokens;
    cached_input_tokens += item.cached_input_tokens;
    duration_ms += item.duration_ms;
    if (item.estimated_cost_usd == null) {
      hasCost = false;
    } else {
      estimated_cost_usd += item.estimated_cost_usd;
    }
  }

  return {
    operation: first.operation,
    model: first.model,
    input_tokens,
    output_tokens,
    total_tokens,
    cached_input_tokens,
    estimated_cost_usd: hasCost
      ? Math.round(estimated_cost_usd * 1_000_000) / 1_000_000
      : null,
    duration_ms,
  };
}

export function withAiUsage<T extends Record<string, unknown>>(
  payload: T,
  summaries: AiUsageSummary[] | undefined
): T & { ai_usage?: AiUsageApiPayload } {
  return withAiUsageSafe(payload, summaries);
}

/** Attach ai_usage without throwing if aggregation fails. */
export function withAiUsageSafe<T extends Record<string, unknown>>(
  payload: T,
  summaries: AiUsageSummary[] | undefined
): T & { ai_usage?: AiUsageApiPayload } {
  if (!summaries?.length) return payload;
  try {
    const ai_usage = aggregateAiUsage(summaries);
    return ai_usage ? { ...payload, ai_usage } : payload;
  } catch (error: unknown) {
    console.warn(
      "[AI_USAGE] Failed to attach ai_usage to response:",
      error instanceof Error ? error.message : String(error)
    );
    return payload;
  }
}

export interface TrackedResponseResult {
  response: OpenAI.Responses.Response;
  text: string;
  summary: AiUsageSummary;
}

/** Call OpenAI Responses API, log usage, and return normalized summary. */
export async function trackedResponsesCreate(
  client: OpenAI,
  ctx: AiUsageLogContext,
  params: OpenAI.Responses.ResponseCreateParamsNonStreaming,
  requestOptions?: OpenAI.RequestOptions
): Promise<TrackedResponseResult> {
  const model = params.model ?? OPENAI_MODEL;
  const promptChars =
    ctx.promptChars ??
    (typeof params.input === "string" ? params.input.length : undefined);
  const startedAt = Date.now();

  try {
    const response = await client.responses.create(params, requestOptions);
    const duration_ms = Date.now() - startedAt;
    const text = response.output_text ?? "";
    const usage = normalizeOpenAiUsage(response);
    const { cost, pricingMissing } = estimateOpenAiCostUsd(model, usage);
    const metadata = {
      ...(ctx.metadata ?? {}),
      ...(pricingMissing ? { pricing_missing: true } : {}),
    };

    void logAiUsageEvent({
      operation: ctx.operation,
      projectId: ctx.projectId,
      sourceRoute: ctx.sourceRoute,
      model,
      status: "success",
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      total_tokens: usage.total_tokens,
      cached_input_tokens: usage.cached_input_tokens,
      estimated_cost_usd: cost,
      duration_ms,
      prompt_chars: promptChars,
      response_chars: text.length,
      openai_request_id: response.id ?? null,
      metadata,
    }).catch((logError: unknown) => {
      console.warn(
        "[AI_USAGE] Unexpected usage log failure:",
        logError instanceof Error ? logError.message : String(logError)
      );
    });

    const summary = buildAiUsageSummary(
      ctx,
      model,
      usage,
      duration_ms
    );

    return { response, text, summary };
  } catch (error: unknown) {
    const duration_ms = Date.now() - startedAt;

    void logAiUsageEvent({
      operation: ctx.operation,
      projectId: ctx.projectId,
      sourceRoute: ctx.sourceRoute,
      model,
      status: "error",
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      cached_input_tokens: 0,
      estimated_cost_usd: null,
      duration_ms,
      prompt_chars: promptChars,
      error_status: readErrorStatus(error) ?? null,
      error_code: readErrorCode(error) ?? null,
      error_message: truncateErrorMessage(errorMessage(error)),
      metadata: ctx.metadata ?? {},
    }).catch((logError: unknown) => {
      console.warn(
        "[AI_USAGE] Unexpected error usage log failure:",
        logError instanceof Error ? logError.message : String(logError)
      );
    });

    throw error;
  }
}
