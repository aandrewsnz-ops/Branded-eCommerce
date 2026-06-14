/**
 * Central OpenAI model pricing (USD per 1M tokens).
 *
 * Update values here when OpenAI changes pricing. Optional env override:
 * OPENAI_MODEL_PRICING_JSON='{"gpt-5.5":{"inputPer1M":2.5,"outputPer1M":10}}'
 */

export type ModelPricing = {
  inputPer1M: number;
  outputPer1M: number;
  cachedInputPer1M?: number;
};

/** Default pricing map — edit in one place when models or rates change. */
export const MODEL_PRICING_USD_PER_1M: Record<string, ModelPricing> = {
  // Primary model used by this app (see server/openai.ts OPENAI_MODEL).
  "gpt-5.5": {
    inputPer1M: 5,
    outputPer1M: 30,
    cachedInputPer1M: .5,
  },
};

let envPricingCache: Record<string, ModelPricing> | null | undefined;

function loadEnvPricing(): Record<string, ModelPricing> | null {
  if (envPricingCache !== undefined) return envPricingCache;

  const raw = process.env.OPENAI_MODEL_PRICING_JSON;
  if (!raw?.trim()) {
    envPricingCache = null;
    return envPricingCache;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, ModelPricing>;
    envPricingCache = parsed;
    return envPricingCache;
  } catch {
    console.warn(
      "[AI_PRICING] Invalid OPENAI_MODEL_PRICING_JSON — using defaults."
    );
    envPricingCache = null;
    return envPricingCache;
  }
}

export function getModelPricing(model: string): ModelPricing | null {
  const envMap = loadEnvPricing();
  if (envMap?.[model]) return envMap[model];
  return MODEL_PRICING_USD_PER_1M[model] ?? null;
}
