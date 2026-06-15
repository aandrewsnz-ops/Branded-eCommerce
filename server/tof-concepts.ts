import type {
  ProductProject,
  ResearchInsight,
  CustomerAvatarContent,
  MassDesire,
  TofConceptDraft,
  PainCluster,
} from "../src/types";
import {
  ResearchParseError,
  OpenAIUpstreamError,
  OPENAI_MODEL,
  getOpenAI,
  extractJson,
  toStringValue,
  callOpenAIWithRetry,
} from "./openai";
import type { AiUsageLogContext, AiUsageSummary } from "./ai-usage";

/** How many top-of-funnel ads to generate per mass desire. */
export const TOF_CONCEPT_COUNT = 3;

const INTENSITY_RANK: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeConcept(value: unknown): TofConceptDraft {
  const r = asRecord(value);
  return {
    primary: toStringValue(r.primary),
    headline: toStringValue(r.headline),
    description: toStringValue(r.description),
    visual_strategy: toStringValue(r.visual_strategy),
    image_prompt: toStringValue(r.image_prompt),
  };
}

function validateConceptPack(concepts: TofConceptDraft[]): TofConceptDraft[] {
  if (concepts.length !== TOF_CONCEPT_COUNT) {
    throw new Error(
      `Expected exactly ${TOF_CONCEPT_COUNT} concepts, got ${concepts.length}.`
    );
  }

  const required: (keyof TofConceptDraft)[] = [
    "primary",
    "headline",
    "description",
    "visual_strategy",
    "image_prompt",
  ];

  concepts.forEach((concept, index) => {
    for (const field of required) {
      if (!concept[field]?.trim()) {
        throw new Error(
          `Concept ${index + 1} is missing required field "${field}".`
        );
      }
    }
  });

  return concepts;
}

function buildDesireSummary(massDesire: MassDesire): string {
  return [
    massDesire.desire_statement,
    massDesire.emotional_driver,
    massDesire.what_they_are_really_buying,
    massDesire.pain_it_moves_away_from,
    massDesire.positive_outcome_it_moves_toward,
  ]
    .filter(Boolean)
    .join(" · ");
}

function rankPainCluster(cluster: PainCluster): number {
  return INTENSITY_RANK[cluster.emotional_intensity] ?? 1;
}

/** Compact context for TOF generation — avoids sending full insight/avatar payloads. */
export function buildCompactTofContext(
  project: ProductProject,
  massDesire: MassDesire,
  insight: ResearchInsight,
  avatar: CustomerAvatarContent
): Record<string, unknown> {
  const topPainClusters = [...(insight.pain_clusters ?? [])]
    .sort((a, b) => rankPainCluster(b) - rankPainCluster(a))
    .slice(0, 3)
    .map((cluster) => ({
      name: cluster.name,
      description: truncate(cluster.description, 250),
      emotional_intensity: cluster.emotional_intensity,
    }));

  const languageFromInsight = (insight.language_patterns ?? [])
    .map((pattern) => pattern.pattern)
    .filter(Boolean);

  const customerPhrases = [
    ...(avatar.language_bank?.phrases_they_use ?? []),
    ...languageFromInsight,
  ]
    .filter((phrase, index, arr) => {
      const key = phrase.trim().toLowerCase();
      return key.length > 0 && arr.findIndex((p) => p.trim().toLowerCase() === key) === index;
    })
    .slice(0, 5)
    .map((phrase) => truncate(phrase, 120));

  const wordsToUse = (avatar.language_bank?.words_to_use_in_copy ?? [])
    .slice(0, 5)
    .map((word) => truncate(word, 40));

  const wordsToAvoid = (avatar.language_bank?.words_to_avoid ?? [])
    .slice(0, 5)
    .map((word) => truncate(word, 40));

  return {
    product: {
      our_product_name: project.our_product_name,
      supplier_product_description: truncate(
        project.supplier_product_description,
        400
      ),
      target_country: project.target_country,
      planned_sale_price: project.planned_sale_price,
      current_offer: project.current_offer?.trim() ? project.current_offer : undefined,
    },
    mass_desire: {
      desire_statement: massDesire.desire_statement,
      audience_segment: massDesire.audience_segment,
      what_they_are_really_buying: massDesire.what_they_are_really_buying,
      emotional_driver: massDesire.emotional_driver,
      life_context: massDesire.life_context,
      pain_it_moves_away_from: massDesire.pain_it_moves_away_from,
      positive_outcome_it_moves_toward: massDesire.positive_outcome_it_moves_toward,
      why_this_desire_is_distinct: massDesire.why_this_desire_is_distinct,
      copy_direction: massDesire.copy_direction,
      messaging_to_avoid: massDesire.messaging_to_avoid,
      compliance_notes: massDesire.compliance_notes,
    },
    insight_compact: {
      top_pain_clusters: topPainClusters,
      customer_language_phrases: customerPhrases,
      words_to_use: wordsToUse,
      words_to_avoid: wordsToAvoid,
    },
    avatar_summary: truncate(avatar.avatar_summary ?? "", 500),
  };
}

function buildPrompt(
  project: ProductProject,
  insight: ResearchInsight,
  avatar: CustomerAvatarContent,
  massDesire: MassDesire
): string {
  const context = buildCompactTofContext(project, massDesire, insight, avatar);

  return [
    "Generate 3 complete top-of-funnel Meta ad concepts for this mass desire.",
    "",
    "Each concept must be a complete ad unit with:",
    "- primary",
    "- headline",
    "- description",
    "- visual_strategy",
    "- image_prompt",
    "",
    "The mass desire is the core click trigger.",
    "The headline must be the mass desire itself, or a tight customer-language compression of it if the exact mass desire is too long for a clean Meta headline.",
    "The primary text should expand the emotional truth behind the headline and make the customer feel immediately seen.",
    "The description should be short and practical, clarifying the product role or reason to click.",
    "The visual_strategy should explain why the image stops the scroll, what emotion it triggers, and how it reinforces the desire.",
    "The image_prompt should be a clean, paste-ready ChatGPT image generation prompt.",
    "All five fields must align around the same desire.",
    "Do not create generic concept names.",
    "Do not make the image prompt a separate idea from the copy.",
    "Do not include safety, compliance, avoidance, or policy language inside the final image_prompt.",
    "",
    "Creative positioning:",
    "- Image-first and scroll-stopping",
    "- Instant recognition — the user should feel \"that is exactly my problem\"",
    "- Emotionally direct and simple enough for Meta",
    "- Broader than angle-level direct response, but still usable as real ads",
    "- Avoid generic product hero concepts unless the product hero directly expresses the desire",
    "- Avoid concept-board language",
    "",
    "Truthfulness:",
    "- Do not invent proof, testimonials, stats, clinical evidence, or guaranteed results",
    "- Keep claims cosmetic and plausible",
    "- For skincare: do not claim permanent pore removal, medical treatment, or guaranteed transformation",
    "",
    "Context (JSON):",
    JSON.stringify(context),
    "",
    "Return VALID JSON ONLY (no markdown):",
    '{ "concepts": [ { "primary": "...", "headline": "...", "description": "...", "visual_strategy": "...", "image_prompt": "..." } ] }',
    "",
    `"concepts" MUST contain exactly ${TOF_CONCEPT_COUNT} items.`,
  ].join("\n");
}

function buildRepairPrompt(rawText: string): string {
  return [
    "Fix the JSON below so it matches this schema exactly.",
    "Return VALID JSON ONLY with exactly 3 complete ad concepts.",
    "",
    '{ "concepts": [ { "primary": "string", "headline": "string", "description": "string", "visual_strategy": "string", "image_prompt": "string" } ] }',
    "",
    "Broken response:",
    truncate(rawText, 4000),
  ].join("\n");
}

function parseConceptResponse(text: string): TofConceptDraft[] {
  let parsed: unknown;
  try {
    parsed = extractJson(text);
  } catch {
    throw new ResearchParseError(
      "OpenAI did not return valid JSON.",
      text
    );
  }
  const root = asRecord(parsed);
  const concepts = asArray(root.concepts).map(normalizeConcept);
  return validateConceptPack(concepts);
}

async function requestTofConcepts(
  input: string,
  usageContext: AiUsageLogContext
): Promise<{ text: string; summaries: AiUsageSummary[] }> {
  const client = getOpenAI();
  return callOpenAIWithRetry(
    "TOF",
    (signal) =>
      client.responses.create(
        { model: OPENAI_MODEL, input },
        { signal, timeout: 60_000 }
      ),
    {
      timeoutMs: 60_000,
      maxAttempts: 3,
      usageContext: {
        ...usageContext,
        promptChars: input.length,
      },
    }
  );
}

/** Generate 3 top-of-funnel ad concepts for a mass desire. */
export async function generateTofConcepts(
  project: ProductProject,
  insight: ResearchInsight,
  avatar: CustomerAvatarContent,
  massDesire: MassDesire
): Promise<{
  concepts: TofConceptDraft[];
  sourceSummary: string;
  aiUsage: AiUsageSummary[];
}> {
  const input = buildPrompt(project, insight, avatar, massDesire);
  console.log("[TOF] prompt length chars:", input.length);

  const baseContext: AiUsageLogContext = {
    operation: "tof-concepts",
    projectId: project.id,
    sourceRoute: "/api/tof-concepts/generate",
    metadata: {
      mass_desire_id: massDesire.id,
      research_run_id: insight.run_id ?? null,
    },
  };

  const { text: firstText, summaries: aiUsage } = await requestTofConcepts(
    input,
    baseContext
  );

  try {
    return {
      concepts: parseConceptResponse(firstText),
      sourceSummary: buildDesireSummary(massDesire),
      aiUsage,
    };
  } catch (firstError: unknown) {
    if (firstError instanceof OpenAIUpstreamError) {
      throw firstError;
    }

    console.warn(
      "[TOF] First response failed parse/validation, attempting repair:",
      firstError instanceof Error ? firstError.message : String(firstError)
    );

    const repairInput = buildRepairPrompt(firstText);
    console.log("[TOF] repair prompt length chars:", repairInput.length);
    const { text: repairedText, summaries: repairSummaries } =
      await requestTofConcepts(repairInput, {
        ...baseContext,
        metadata: {
          ...baseContext.metadata,
          repair: true,
        },
      });

    return {
      concepts: parseConceptResponse(repairedText),
      sourceSummary: buildDesireSummary(massDesire),
      aiUsage: [...aiUsage, ...repairSummaries],
    };
  }
}
