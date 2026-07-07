import OpenAI from "openai";
import type {
  ProductProject,
  ResearchSource,
  ResearchSourceDraft,
} from "../src/types";
import {
  RESEARCH_BATCH_SIZE,
  buildThemeCoverageSummary,
  formatExistingSourcesForPrompt,
} from "./research-helpers";
import {
  type AiUsageLogContext,
  type AiUsageSummary,
  logAiUsageEvent,
  normalizeOpenAiUsage,
  estimateOpenAiCostUsd,
  buildAiUsageSummary,
} from "./ai-usage";

/**
 * Model used for research. Easy to change in one place if the Responses API /
 * SDK types require a different identifier.
 */
export const OPENAI_MODEL = "gpt-5.5";

/** Number of research sources to gather per batch. */
export { RESEARCH_BATCH_SIZE };
/** @deprecated Use RESEARCH_BATCH_SIZE — kept for backwards compatibility. */
export const RESEARCH_SOURCE_COUNT = RESEARCH_BATCH_SIZE;

export type ResearchRunMode = "initial" | "append";

export interface RunResearchOptions {
  mode?: ResearchRunMode;
  batchSize?: number;
  existingSources?: ResearchSource[];
  researchRunId?: string | null;
}

/** Error thrown when the model response cannot be parsed as the expected JSON. */
export class ResearchParseError extends Error {
  rawText: string;
  constructor(message: string, rawText: string) {
    super(message);
    this.name = "ResearchParseError";
    this.rawText = rawText;
  }
}

export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env.local (backend only)."
    );
  }
  return new OpenAI({ apiKey });
}

/** Thrown when OpenAI fails after retries (upstream 5xx / network / timeout). */
export class OpenAIUpstreamError extends Error {
  readonly status?: number;
  readonly details: string;

  constructor(message: string, status?: number, details?: string) {
    super(message);
    this.name = "OpenAIUpstreamError";
    this.status = status;
    this.details = details ?? message;
  }
}

const OPENAI_RETRYABLE_STATUSES = new Set([
  500, 502, 503, 504, 520, 522, 524,
]);

const OPENAI_RETRY_BACKOFF_MS = [0, 800, 2000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const record = error as Record<string, unknown>;
  if (typeof record.status === "number") return record.status;
  if (typeof record.statusCode === "number") return record.statusCode;
  return undefined;
}

function isRetryableOpenAIError(error: unknown): boolean {
  const status = readErrorStatus(error);
  if (status !== undefined) {
    if (status === 429) return false;
    if (status >= 400 && status < 500) return false;
    if (OPENAI_RETRYABLE_STATUSES.has(status)) return true;
  }

  const message = errorMessage(error).toLowerCase();
  if (error instanceof Error && error.name === "AbortError") return true;
  if (message.includes("timeout") || message.includes("timed out")) return true;
  if (message.includes("econnreset") || message.includes("network")) return true;
  if (message.includes("fetch failed") || message.includes("socket")) return true;

  return status === undefined;
}

export interface CallOpenAIOptions {
  timeoutMs?: number;
  maxAttempts?: number;
  usageContext?: AiUsageLogContext;
}

type OpenAICallResult = {
  output_text?: string | null;
  usage?: unknown;
  id?: string;
};

/**
 * Call OpenAI with timeout + retry on transient upstream/network failures.
 * Returns output_text from the Responses API result and usage summaries when tracked.
 */
export async function callOpenAIWithRetry(
  label: string,
  call: (signal: AbortSignal) => Promise<OpenAICallResult>,
  options: CallOpenAIOptions = {}
): Promise<{ text: string; summaries: AiUsageSummary[] }> {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const maxAttempts = options.maxAttempts ?? 3;
  const usageContext = options.usageContext;
  let lastError: unknown;
  let lastStatus: number | undefined;
  const summaries: AiUsageSummary[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const backoff = OPENAI_RETRY_BACKOFF_MS[attempt - 1] ?? 2000;
    if (backoff > 0) {
      await sleep(backoff);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const attemptStartedAt = Date.now();

    try {
      const response = await call(controller.signal);
      clearTimeout(timer);
      const text = response.output_text ?? "";
      console.log(
        `[${label}] OpenAI success attempt ${attempt}/${maxAttempts}, output chars: ${text.length}`
      );

      if (usageContext) {
        const duration_ms = Date.now() - attemptStartedAt;
        const model = OPENAI_MODEL;
        const usage = normalizeOpenAiUsage(response);
        const { cost, pricingMissing } = estimateOpenAiCostUsd(model, usage);
        const metadata = {
          ...(usageContext.metadata ?? {}),
          attempt,
          maxAttempts,
          ...(pricingMissing ? { pricing_missing: true } : {}),
        };

        await logAiUsageEvent({
          operation: usageContext.operation,
          projectId: usageContext.projectId,
          sourceRoute: usageContext.sourceRoute,
          model,
          status: "success",
          input_tokens: usage.input_tokens,
          output_tokens: usage.output_tokens,
          total_tokens: usage.total_tokens,
          cached_input_tokens: usage.cached_input_tokens,
          estimated_cost_usd: cost,
          duration_ms,
          prompt_chars: usageContext.promptChars,
          response_chars: text.length,
          openai_request_id:
            typeof response.id === "string" ? response.id : null,
          metadata,
        });

        summaries.push(
          buildAiUsageSummary(
            usageContext,
            model,
            usage,
            duration_ms
          )
        );
      }

      return { text, summaries };
    } catch (error: unknown) {
      clearTimeout(timer);
      lastError = error;
      lastStatus = readErrorStatus(error);

      const isTimeout =
        error instanceof Error &&
        (error.name === "AbortError" ||
          errorMessage(error).toLowerCase().includes("abort"));

      console.warn(`[${label}] OpenAI attempt ${attempt}/${maxAttempts} failed:`, {
        status: lastStatus,
        message: isTimeout
          ? "Request timed out"
          : errorMessage(error),
        retryable: isRetryableOpenAIError(error),
        hasResponseBody: Boolean(errorMessage(error)),
      });

      if (!isRetryableOpenAIError(error) || attempt === maxAttempts) {
        if (usageContext) {
          await logAiUsageEvent({
            operation: usageContext.operation,
            projectId: usageContext.projectId,
            sourceRoute: usageContext.sourceRoute,
            model: OPENAI_MODEL,
            status: "error",
            duration_ms: Date.now() - attemptStartedAt,
            prompt_chars: usageContext.promptChars,
            error_status: lastStatus ?? null,
            error_code:
              error instanceof Error && "code" in error
                ? String((error as { code: unknown }).code)
                : null,
            error_message: errorMessage(error).slice(0, 500),
            metadata: {
              ...(usageContext.metadata ?? {}),
              attempt,
              maxAttempts,
            },
          });
        }
        break;
      }
    }
  }

  const isTimeout =
    lastError instanceof Error &&
    (lastError.name === "AbortError" ||
      errorMessage(lastError).toLowerCase().includes("abort"));

  if (isTimeout) {
    throw new OpenAIUpstreamError(
      `OpenAI request timed out (${label}).`,
      504,
      `Timed out after ${timeoutMs}ms.`
    );
  }

  const details =
    lastStatus === 520
      ? "The upstream API returned an empty 520 response. Try again, or reduce prompt context."
      : errorMessage(lastError);

  throw new OpenAIUpstreamError(
    "OpenAI request failed after retries",
    lastStatus ?? 502,
    details
  );
}

function buildPrompt(
  project: ProductProject,
  options: {
    mode: ResearchRunMode;
    batchSize: number;
    existingSources: ResearchSource[];
  }
): string {
  const { mode, batchSize, existingSources } = options;
  const isAppend = mode === "append" && existingSources.length > 0;

  const lines = [
    "You are a customer research analyst for direct-response ecommerce.",
    "",
    "Use the web_search tool to find REAL, public online discussions where",
    "people describe the underlying problem that the product below solves.",
    "Look at sources like Reddit, forums, Quora, blog comments, review threads,",
    "and social posts.",
    "",
    isAppend
      ? `Find exactly ${batchSize} additional high-quality sources not already collected. Return exactly ${batchSize} — never fewer, never filler. Every source must be a genuine, distinct, high-relevance source that adds NEW signal beyond what is already collected.`
      : `Find exactly ${batchSize} high-quality sources. Return exactly ${batchSize} — never fewer, never filler. Every source must be a genuine, distinct, high-relevance source. Do NOT pad the list with weak or duplicate sources just to reach the count; instead keep searching until you have ${batchSize} strong ones.`,
    "",
    "Focus ONLY on the human, emotional layer of the underlying problem:",
    "- emotional pain, frustration, fear, anxiety",
    "- the exact language and phrases real people use",
    "- failed solutions they have already tried",
    "- rock-bottom / breaking-point moments",
    "",
    `Aim for a useful SPREAD across the ${batchSize} sources, covering:`,
    "1. Strongest pain point source",
    "2. Strongest customer language / verbatim phrasing source",
    "3. Failed solutions source",
    "4. Emotional insecurity or objection source",
    "5. Price, routine, visual inspiration, or additional high-relevance pain",
    "",
    "Strict rules:",
    "- Research the UNDERLYING PROBLEM, not this specific product.",
    "- Use the supplier description, competitor descriptions, and competitor",
    "  URLs ONLY to infer the product category, positioning, and market context.",
    "- Do NOT use our product name as a search term (it is a private brand name).",
    "- Do NOT use the current offer or planned sale price anywhere in research.",
    "- Focus on underlying market pain, emotional language, failed solutions,",
    "  and customer psychology in the target country.",
    "- Do NOT include posts that are merely complaints or reviews about a",
    "  competitor product itself; you want the deeper human problem.",
    "- Only use real URLs you actually found via web_search. Never invent URLs.",
    "- relevance_score is an integer from 0 to 100.",
    "- useful_phrases must be short verbatim-style phrases real people use.",
  ];

  if (isAppend) {
    lines.push(
      "",
      "Existing sources already collected:",
      formatExistingSourcesForPrompt(existingSources),
      "",
      "Do NOT return these URLs again.",
      "Do NOT return near-duplicate versions of the same thread/article.",
      "Prefer new URLs, new discussions, new language, new objections, new failed",
      "solutions, or stronger examples.",
      "If a theme already appears, only include another source if it adds",
      "meaningfully better customer language or a different angle.",
      "",
      "Themes already found:",
      buildThemeCoverageSummary(existingSources),
      "",
      "Find gaps or deepen weak areas.",
      "Prioritise sources that add new useful customer language, new objections,",
      "new failed solutions, price anxiety, routine behaviour, visual inspiration,",
      "or emotional breaking points."
    );
  }

  lines.push(
    "",
    "Research context (DO NOT search for the product name):",
    `- supplier_product_description: ${project.supplier_product_description}`,
    `- closest_competitor_product_description: ${project.closest_competitor_product_description}`,
    `- primary_competitor_url: ${project.primary_competitor_url}`,
    `- additional_competitor_urls: ${project.additional_competitor_urls}`,
    `- target_country: ${project.target_country}`,
    `- initial_problem_hypothesis (optional seed): ${project.initial_problem_hypothesis}`,
    `- initial_customer_hypothesis (optional seed): ${project.initial_customer_hypothesis}`,
    "",
    "Respond with VALID JSON ONLY (no markdown, no commentary) in exactly this shape:",
    "{",
    '  "sources": [',
    "    {",
    '      "url": "string",',
    '      "platform": "string",',
    '      "title": "string",',
    '      "summary": "string",',
    '      "emotional_theme": "string",',
    '      "relevance_score": number,',
    '      "useful_phrases": ["string"]',
    "    }",
    "  ]",
    "}",
  );

  return lines.join("\n");
}

/** Pull a JSON object out of a model response that may be wrapped in prose/fences. */
export function extractJson(text: string): unknown {
  let candidate = text.trim();

  const fenced = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    candidate = fenced[1].trim();
  }

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    candidate = candidate.slice(start, end + 1);
  }

  return JSON.parse(candidate);
}

export function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

export function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(toStringValue).filter((item) => item.trim().length > 0);
}

function toScore(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizeSources(parsed: unknown): ResearchSourceDraft[] {
  const sourcesRaw =
    parsed && typeof parsed === "object" && "sources" in parsed
      ? (parsed as { sources: unknown }).sources
      : null;

  if (!Array.isArray(sourcesRaw)) {
    throw new Error('Parsed JSON did not contain a "sources" array.');
  }

  return sourcesRaw
    .map((item) => {
      const record = (item ?? {}) as Record<string, unknown>;
      return {
        url: toStringValue(record.url),
        platform: toStringValue(record.platform),
        title: toStringValue(record.title),
        summary: toStringValue(record.summary),
        emotional_theme: toStringValue(record.emotional_theme),
        relevance_score: toScore(record.relevance_score),
        useful_phrases: toStringArray(record.useful_phrases),
      };
    })
    // Drop completely empty filler entries so we never insert blank sources.
    .filter(
      (source) =>
        source.title.trim().length > 0 ||
        source.url.trim().length > 0 ||
        source.summary.trim().length > 0
    );
}

/**
 * Run the research stage for a project using the OpenAI Responses API with the
 * web_search tool. Returns normalized source drafts.
 *
 * Throws ResearchParseError (with raw text) if the model output is not JSON.
 */
export async function runResearchForProject(
  project: ProductProject,
  options: RunResearchOptions | string | null = {}
): Promise<{
  drafts: ResearchSourceDraft[];
  aiUsage: AiUsageSummary[];
}> {
  const resolved: RunResearchOptions =
    typeof options === "string" || options === null
      ? { mode: "initial", researchRunId: options ?? undefined }
      : options;

  const mode = resolved.mode ?? "initial";
  const batchSize = resolved.batchSize ?? RESEARCH_BATCH_SIZE;
  const existingSources = resolved.existingSources ?? [];

  const client = getOpenAI();
  const input = buildPrompt(project, { mode, batchSize, existingSources });

  const { text, summaries } = await callOpenAIWithRetry(
    "research",
    (signal) =>
      client.responses.create(
        {
          model: OPENAI_MODEL,
          tools: [{ type: "web_search" }],
          input,
        },
        { signal }
      ),
    {
      timeoutMs: 240_000,
      maxAttempts: 3,
      usageContext: {
        operation: "research",
        projectId: project.id,
        sourceRoute: "/api/research/run",
        promptChars: input.length,
        metadata: {
          ...(resolved.researchRunId
            ? { research_run_id: resolved.researchRunId }
            : {}),
          mode,
          batch_size: batchSize,
          existing_source_count: existingSources.length,
        },
      },
    }
  );

  let parsed: unknown;
  try {
    parsed = extractJson(text);
  } catch {
    throw new ResearchParseError(
      "OpenAI did not return valid JSON.",
      text
    );
  }

  return {
    drafts: normalizeSources(parsed),
    aiUsage: summaries,
  };
}
