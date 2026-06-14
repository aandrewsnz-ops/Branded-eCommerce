import type {
  ProductProject,
  ResearchInsight,
  CustomerAvatarContent,
  MassDesire,
  MarketingAngle,
  AdCopyContent,
  AdVariation,
} from "../src/types";
import {
  OPENAI_MODEL,
  ResearchParseError,
  getOpenAI,
  extractJson,
  toStringValue,
} from "./openai";
import {
  aggregateAiUsage,
  trackedResponsesCreate,
  type AiUsageLogContext,
  type AiUsageSummary,
} from "./ai-usage";
import { CopyGenerateError } from "./copy-errors";
import { saveGenerateCopyDebugResponse } from "./copy-debug";

const GENERATE_COPY_OPENAI_TIMEOUT_MS = 240_000;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** How many ad variations and image prompts a copy pack must contain. */
export const COPY_PACK_SIZE = 5;

function normalizeAdVariations(value: unknown): AdVariation[] {
  return asArray(value)
    .map((item) => {
      const r = asRecord(item);
      return {
        primary: toStringValue(r.primary),
        headline: toStringValue(r.headline),
        description: toStringValue(r.description),
        visual_strategy: toStringValue(r.visual_strategy),
        image_prompt: toStringValue(r.image_prompt),
      };
    })
    .filter(
      (ad) =>
        ad.primary.trim().length > 0 ||
        ad.headline.trim().length > 0 ||
        ad.description.trim().length > 0
    );
}

/**
 * Build an AdCopyContent from the copy pack, populating the legacy
 * ad_copy_sets fields for backwards compatibility so old readers keep working.
 * image_prompts is derived from each ad's paired image_prompt.
 */
function buildContent(adVariations: AdVariation[]): AdCopyContent {
  return {
    long_form_story: "",
    short_primary_texts: adVariations.map((ad, i) => ({
      label: `Ad ${i + 1}`,
      text: ad.primary,
      strategy: "",
    })),
    medium_primary_texts: [],
    headlines: adVariations.map((ad) => ({ text: ad.headline, angle: "" })),
    descriptions: adVariations.map((ad) => ({ text: ad.description, angle: "" })),
    hooks: [],
    hook_transitions: [],
    callouts: [],
    compliance_notes: [],
    ad_variations: adVariations,
    image_prompts: adVariations.map((ad) => ad.image_prompt),
  };
}

function buildPrompt(
  project: ProductProject,
  insight: ResearchInsight,
  avatar: CustomerAvatarContent,
  massDesire: MassDesire,
  angle: MarketingAngle
): string {
  return [
    "Generate a CONVERSION-FIRST copy pack for testing ONE marketing angle on",
    "Meta/Facebook and Instagram. This is a raw draft for review, not a",
    "publish-ready, fully compliant ad. Write the sharp version now.",
    "",
    `Generate EXACTLY ${COPY_PACK_SIZE} PAIRED ad concepts. Each ad concept must`,
    "include all five fields, and NONE may be empty:",
    "- primary: the main ad body / primary text",
    "- headline: a short punchy headline",
    "- description: a short supporting description / link description line",
    "- visual_strategy: why the paired image stops the scroll, what emotion it",
    "  triggers, and how it supports the primary and headline",
    "- image_prompt: a single detailed prompt to paste into ChatGPT image",
    "  generation (see image prompt rules below)",
    "",
    "THE 5 ADS MUST BE MEANINGFULLY DIFFERENT — not near-duplicates. Each uses a",
    "different creative angle while staying connected to the selected marketing",
    "angle. Use this spread:",
    "  Ad 1 — Direct problem recognition",
    "  Ad 2 — Routine gap or missing step",
    "  Ad 3 — Product mechanism or tactile ritual",
    "  Ad 4 — Emotional relief or confidence",
    "  Ad 5 — Offer or product value angle (if an offer exists; otherwise a",
    "         strong product-value / reason-to-buy-now angle)",
    ...(hasReviewerNotes(angle)
      ? [
          "",
          "When reviewer notes are present, reserve 2 of the 5 ad variations for",
          "reviewer-inspired visual concepts, while keeping the other 3 varied across",
          "the required ad spread above.",
        ]
      : []),
    "",
    "Use the mass desire statement as a CORE hook source. If it is strong,",
    "preserve it almost verbatim in at least one ad. In other ads keep the same",
    "emotional meaning but use different wording.",
    "",
    "COPY STYLE:",
    "- Conversion first, direct response, emotionally specific, sharp but not fake.",
    "- Simple enough for Meta. Avoid corporate skincare language and vague beauty",
    "  filler. Do NOT over-sanitise the first draft.",
    "",
    "PRIMARY TEXT RULES:",
    "- Punchy and usable as Meta primary text. Do NOT write essays.",
    "- Aim for 2 to 5 short paragraphs with intentional line breaks (use \\n).",
    "- The first line must make the customer feel seen within two seconds.",
    "- Do NOT overuse emojis. Do NOT use hashtags.",
    "",
    "HEADLINE RULES:",
    "- Short, punchy, Meta-friendly. No more than ~45 characters where possible.",
    "- Should pair with the primary text.",
    "",
    "DESCRIPTION RULES:",
    "- Short supporting line. Useful, not repetitive. Clarify benefit, offer, or",
    "  product role.",
    "",
    "IMAGE PROMPT RULES (extremely important):",
    ...IMAGE_PROMPT_RULE_LINES.map((line) => `- ${line}`),
    "- The image must support the copy, not fight it.",
    "",
    "Truthfulness safeguards (always apply):",
    "- Do NOT invent testimonials, proof, statistics, clinical studies, or",
    "  guaranteed results.",
    "- Do NOT promise permanent lifting, curing, reversing, repairing, or medical",
    "  treatment. Keep claims cosmetic and plausible.",
    "",
    "Use our_product_name as the product name. Use current_offer and",
    "planned_sale_price where they strengthen the pitch.",
    "",
    "Product context:",
    `- our_product_name: ${project.our_product_name}`,
    `- supplier_product_description: ${project.supplier_product_description}`,
    `- target_country: ${project.target_country}`,
    `- planned_sale_price: ${project.planned_sale_price}`,
    `- current_offer: ${project.current_offer}`,
    `- preferred_tone (optional): ${project.preferred_tone}`,
    "",
    "Mass desire (a major hook source):",
    JSON.stringify(
      {
        desire_statement: massDesire.desire_statement,
        audience_segment: massDesire.audience_segment,
        emotional_driver: massDesire.emotional_driver,
        what_they_are_really_buying: massDesire.what_they_are_really_buying,
        pain_it_moves_away_from: massDesire.pain_it_moves_away_from,
        positive_outcome_it_moves_toward:
          massDesire.positive_outcome_it_moves_toward,
        copy_direction: massDesire.copy_direction,
        messaging_to_avoid: massDesire.messaging_to_avoid,
      },
      null,
      2
    ),
    "",
    ...angleContextLines(angle, "pack"),
    "",
    "Insight report (for customer language and emotion):",
    JSON.stringify(
      {
        pain_clusters: insight.pain_clusters,
        language_patterns: insight.language_patterns,
        emotional_states: insight.emotional_states,
        hopes: insight.hopes,
        fears: insight.fears,
        copywriting_notes: insight.copywriting_notes,
      },
      null,
      2
    ),
    "",
    "Customer avatar summary:",
    avatar.avatar_summary,
    "",
    "Avatar language bank:",
    JSON.stringify(avatar.language_bank, null, 2),
    "",
    "Respond with VALID JSON ONLY (no markdown, no commentary) in exactly this shape:",
    "{",
    '  "ad_variations": [',
    "    {",
    '      "primary": "string",',
    '      "headline": "string",',
    '      "description": "string",',
    '      "visual_strategy": "string",',
    '      "image_prompt": "string"',
    "    }",
    "  ]",
    "}",
    "",
    `ad_variations MUST contain exactly ${COPY_PACK_SIZE} items, each with all`,
    "five fields populated.",
  ].join("\n");
}

/** Strip per-ad metadata so prompts only see the copy fields. */
function copyFieldsOnly(ad: AdVariation): Omit<
  AdVariation,
  "locked" | "last_regenerated_at" | "revision_count"
> {
  return {
    primary: ad.primary,
    headline: ad.headline,
    description: ad.description,
    visual_strategy: ad.visual_strategy,
    image_prompt: ad.image_prompt,
  };
}

/** Rules injected into prompts — must not appear verbatim in model output image_prompt fields. */
const IMAGE_PROMPT_RULE_LINES = [
  "Each image_prompt must be ready to paste directly into ChatGPT image generation, designed for Facebook/Instagram audiences with a ~2-second attention span.",
  "It must create an immediate dopamine hit through recognition, curiosity, relief, status, visual satisfaction, emotional validation, or a clean surprising product moment.",
  "Specify: Scene, Subject, Product placement, Mood, Camera style, Lighting, Composition, whether text overlay is needed (and the one short overlay line if useful), Square 1:1 Meta ad format, and keep the image simple and scroll-stopping.",
  "Not every image should have text. If the visual hook is strong, specify NO text overlay. If text helps, use ONE short line only.",
  "Before/after style concepts are allowed when subtle, realistic, and not presented as guaranteed proof.",
  "Medical or clinical-style settings are allowed when contextually relevant, but must not imply fake clinical evidence, diagnosis, treatment, medical claims, or guaranteed results.",
  "Avoid shame-based framing, exaggerated transformation, overcrowded compositions, long overlays, and generic product photos when a stronger concept exists.",
  "Do not include safety, compliance, avoidance, policy, or restriction wording inside the final image_prompt — write clean, paste-ready creative direction only.",
  "Good visual formats: mirror pause moment; face routine vs forgotten neck/chest; clean bathroom skincare ritual; POV routine shot; product applicator close-up; premium flat lay; UGC-style phone photo; simple text-led ad with one punchy line; a polished outfit / neckline moment; a product hero that makes the built-in massage applicator obvious.",
];

/** Flattened rules for regenerate prompts. */
const IMAGE_PROMPT_RULES = IMAGE_PROMPT_RULE_LINES;

function hasReviewerNotes(angle: MarketingAngle): boolean {
  return Boolean(angle.reviewer_notes?.trim());
}

function reviewerNotesPromptLines(
  angle: MarketingAngle,
  scope: "pack" | "single" | "visual"
): string[] {
  const notes = angle.reviewer_notes?.trim() ?? "";
  if (!notes) return [];

  const packRequirement =
    "At least 2 of the 5 ad variations must visibly reflect one of these reviewer note ideas in the visual_strategy and image_prompt.";
  const singleRequirement =
    "This ad must visibly reflect one of these reviewer note ideas in the visual_strategy and image_prompt where it fits the ad being replaced.";
  const visualRequirement =
    "The new visual_strategy and image_prompt must visibly reflect one of these reviewer note ideas where they fit the existing ad copy.";

  const requirementLine =
    scope === "pack"
      ? packRequirement
      : scope === "visual"
        ? visualRequirement
        : singleRequirement;

  const diversityLine =
    scope === "pack"
      ? "Keep the full pack diverse. Do not force the notes into all 5 ads if that makes the pack repetitive."
      : "Keep the concept distinct from the other ads in the pack while still honouring the notes.";

  return [
    "",
    "Human reviewer notes for this specific angle:",
    notes,
    "",
    "Reviewer note handling:",
    "These notes are mandatory creative direction from the operator when provided.",
    requirementLine,
    "Use the notes mainly as visual and emotional direction, not as factual claims.",
    diversityLine,
    "You may soften or adapt the scenario so it feels realistic, subtle, premium, and suitable for a Meta ad.",
    "Do not ignore these notes unless they directly conflict with truthfulness safeguards.",
    "Do not turn these notes into medical claims, diagnosis, treatment claims, fake proof, or guaranteed results.",
    "Write image_prompt as clean, paste-ready creative direction only — never label it with phrases like \"reviewer notes\", \"based on reviewer notes\", or other internal instructions.",
  ];
}

function angleContextLines(
  angle: MarketingAngle,
  reviewerNotesScope: "pack" | "single" | "visual"
): string[] {
  return [
    "Selected marketing angle:",
    JSON.stringify(angle, null, 2),
    ...reviewerNotesPromptLines(angle, reviewerNotesScope),
  ];
}

function sharedContextLines(
  project: ProductProject,
  insight: ResearchInsight,
  avatar: CustomerAvatarContent,
  massDesire: MassDesire,
  angle: MarketingAngle,
  reviewerNotesScope: "single" | "visual" = "single"
): string[] {
  return [
    "Product context:",
    `- our_product_name: ${project.our_product_name}`,
    `- supplier_product_description: ${project.supplier_product_description}`,
    `- target_country: ${project.target_country}`,
    `- planned_sale_price: ${project.planned_sale_price}`,
    `- current_offer: ${project.current_offer}`,
    `- preferred_tone (optional): ${project.preferred_tone}`,
    "",
    "Mass desire (a major hook source):",
    JSON.stringify(
      {
        desire_statement: massDesire.desire_statement,
        audience_segment: massDesire.audience_segment,
        emotional_driver: massDesire.emotional_driver,
        what_they_are_really_buying: massDesire.what_they_are_really_buying,
        pain_it_moves_away_from: massDesire.pain_it_moves_away_from,
        positive_outcome_it_moves_toward:
          massDesire.positive_outcome_it_moves_toward,
        copy_direction: massDesire.copy_direction,
        messaging_to_avoid: massDesire.messaging_to_avoid,
      },
      null,
      2
    ),
    "",
    ...angleContextLines(angle, reviewerNotesScope),
    "",
    "Insight report (for customer language and emotion):",
    JSON.stringify(
      {
        pain_clusters: insight.pain_clusters,
        language_patterns: insight.language_patterns,
        emotional_states: insight.emotional_states,
        hopes: insight.hopes,
        fears: insight.fears,
        copywriting_notes: insight.copywriting_notes,
      },
      null,
      2
    ),
    "",
    "Customer avatar summary:",
    avatar.avatar_summary,
    "",
    "Avatar language bank:",
    JSON.stringify(avatar.language_bank, null, 2),
  ];
}

/** Call OpenAI and parse/validate JSON, retrying once on failure. */
async function generateValidatedJson<T>(
  input: string,
  parse: (value: unknown) => T,
  ctx: AiUsageLogContext
): Promise<{ result: T; aiUsage: AiUsageSummary[] }> {
  const client = getOpenAI();
  let lastParseFailed = false;
  let lastValidationError: Error | null = null;
  let lastRawText = "";
  const aiUsage: AiUsageSummary[] = [];

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const { text, summary } = await trackedResponsesCreate(
      client,
      {
        ...ctx,
        promptChars: input.length,
        metadata: {
          ...(ctx.metadata ?? {}),
          attempt,
        },
      },
      {
        model: OPENAI_MODEL,
        input,
      }
    );
    aiUsage.push(summary);
    lastRawText = text;

    let parsed: unknown;
    try {
      parsed = extractJson(text);
      lastParseFailed = false;
    } catch {
      lastParseFailed = true;
      continue;
    }

    try {
      return { result: parse(parsed), aiUsage };
    } catch (error: unknown) {
      lastValidationError =
        error instanceof Error ? error : new Error(String(error));
    }
  }

  if (lastParseFailed) {
    throw new ResearchParseError(
      "OpenAI did not return valid JSON.",
      lastRawText
    );
  }
  throw new Error(
    lastValidationError
      ? lastValidationError.message
      : "Regeneration failed. Please try again."
  );
}

function normalizeSingleAd(value: unknown): AdVariation {
  const r = asRecord(value);
  return {
    primary: toStringValue(r.primary),
    headline: toStringValue(r.headline),
    description: toStringValue(r.description),
    visual_strategy: toStringValue(r.visual_strategy),
    image_prompt: toStringValue(r.image_prompt),
  };
}

/** Regenerate ONE full ad, keeping it distinct from the existing pack. */
export async function regenerateAd(
  project: ProductProject,
  insight: ResearchInsight,
  avatar: CustomerAvatarContent,
  massDesire: MassDesire,
  angle: MarketingAngle,
  existingAds: AdVariation[],
  adIndex: number,
  copySetId?: string
): Promise<{ ad: AdVariation; aiUsage: AiUsageSummary[] }> {
  const replacing = existingAds[adIndex];
  const others = existingAds.filter((_, i) => i !== adIndex);

  const input = [
    "Generate ONE replacement Meta/Instagram ad concept for the selected",
    "marketing angle. Return a SINGLE JSON object with all five fields, none empty:",
    "primary, headline, description, visual_strategy, image_prompt.",
    "",
    "The new ad MUST be meaningfully different from the ad it replaces (below) and",
    "must not duplicate any of the other ads in the pack. It must still fit the",
    "same mass desire and marketing angle.",
    "",
    "Style: conversion first, direct response, emotionally sharp customer language.",
    "Use the mass desire statement as a strong hook source when useful. Avoid bland",
    "skincare filler and vague beauty language.",
    "",
    "PRIMARY: punchy Meta primary text, 2 to 5 short paragraphs with intentional",
    "line breaks (use \\n) and a scroll-stopping first line. No hashtags, minimal",
    "emojis. HEADLINE: short, ~45 characters max, pairs with the primary.",
    "DESCRIPTION: short supporting line. VISUAL_STRATEGY: why the image stops the",
    "scroll, what emotion it triggers, and how it supports the copy.",
    `IMAGE_PROMPT: ${IMAGE_PROMPT_RULES.join(" ")}`,
    "",
    "Truthfulness safeguards: do NOT invent proof, fake testimonials, clinical",
    "studies, or guaranteed results. Do NOT claim permanent lifting, curing,",
    "reversing, repairing, or medical treatment. Keep claims cosmetic and plausible.",
    "",
    "Ad being replaced (make the new one clearly different):",
    JSON.stringify(copyFieldsOnly(replacing), null, 2),
    "",
    "Other ads in the pack (stay distinct from these):",
    JSON.stringify(others.map(copyFieldsOnly), null, 2),
    "",
    ...sharedContextLines(project, insight, avatar, massDesire, angle, "single"),
    "",
    "Respond with VALID JSON ONLY (no markdown) in exactly this shape:",
    '{ "primary": "string", "headline": "string", "description": "string", "visual_strategy": "string", "image_prompt": "string" }',
  ].join("\n");

  const { result, aiUsage } = await generateValidatedJson(
    input,
    (parsed) => {
      const ad = normalizeSingleAd(parsed);
      const missing = (
        ["primary", "headline", "description", "visual_strategy", "image_prompt"] as const
      ).filter((field) => ad[field].trim().length === 0);
      if (missing.length > 0) {
        throw new Error(`Regenerated ad is missing: ${missing.join(", ")}.`);
      }
      return ad;
    },
    {
      operation: "regenerate-ad",
      projectId: project.id,
      sourceRoute: "/api/copy/:copySetId/regenerate",
      metadata: {
        marketing_angle_id: angle.id,
        mass_desire_id: massDesire.id,
        copy_set_id: copySetId ?? null,
        ad_index: adIndex,
      },
    }
  );

  return { ad: result, aiUsage };
}

/** Regenerate ONLY the visual strategy + image prompt for existing ad copy. */
export async function regenerateImagePrompt(
  project: ProductProject,
  insight: ResearchInsight,
  avatar: CustomerAvatarContent,
  massDesire: MassDesire,
  angle: MarketingAngle,
  ad: AdVariation,
  copySetId?: string,
  adIndex?: number
): Promise<{
  visual: { visual_strategy: string; image_prompt: string };
  aiUsage: AiUsageSummary[];
}> {
  const input = [
    "Generate a NEW visual strategy and image prompt for the existing ad copy",
    "below. Do NOT change the primary, headline, or description — only produce a",
    "fresh visual_strategy and image_prompt that match this copy.",
    "",
    `IMAGE_PROMPT rules: ${IMAGE_PROMPT_RULES.join(" ")}`,
    "",
    "VISUAL_STRATEGY: explain why this image stops the scroll, what emotion it",
    "triggers, and how it supports the primary text and headline.",
    "",
    "Existing ad copy to match:",
    JSON.stringify(
      {
        primary: ad.primary,
        headline: ad.headline,
        description: ad.description,
      },
      null,
      2
    ),
    "",
    ...sharedContextLines(project, insight, avatar, massDesire, angle, "visual"),
    "",
    "Respond with VALID JSON ONLY (no markdown) in exactly this shape:",
    '{ "visual_strategy": "string", "image_prompt": "string" }',
  ].join("\n");

  const { result, aiUsage } = await generateValidatedJson(
    input,
    (parsed) => {
      const r = asRecord(parsed);
      const visual_strategy = toStringValue(r.visual_strategy);
      const image_prompt = toStringValue(r.image_prompt);
      if (visual_strategy.trim().length === 0 || image_prompt.trim().length === 0) {
        throw new Error("Regenerated image prompt is incomplete.");
      }
      return { visual_strategy, image_prompt };
    },
    {
      operation: "regenerate-image-prompt",
      projectId: project.id,
      sourceRoute: "/api/copy/:copySetId/regenerate",
      metadata: {
        marketing_angle_id: angle.id,
        mass_desire_id: massDesire.id,
        copy_set_id: copySetId ?? null,
        ad_index: adIndex ?? null,
      },
    }
  );

  return { visual: result, aiUsage };
}

/**
 * Validate the parsed copy pack: exactly COPY_PACK_SIZE ads, every field
 * populated. Returns the validated, trimmed ad variations or throws.
 */
function validateCopyPack(parsed: unknown): AdVariation[] {
  const root = asRecord(parsed);
  const adVariations = normalizeAdVariations(root.ad_variations).slice(
    0,
    COPY_PACK_SIZE
  );

  if (adVariations.length !== COPY_PACK_SIZE) {
    throw new Error(
      `Expected ${COPY_PACK_SIZE} ad variations, got ${adVariations.length}.`
    );
  }

  adVariations.forEach((ad, i) => {
    const missing = (
      ["primary", "headline", "description", "visual_strategy", "image_prompt"] as const
    ).filter((field) => ad[field].trim().length === 0);
    if (missing.length > 0) {
      throw new Error(`Ad ${i + 1} is missing: ${missing.join(", ")}.`);
    }
  });

  return adVariations;
}

/**
 * Generate a copy pack (5 paired ad variations) for one marketing angle.
 * Retries once if the model returns malformed or incomplete output.
 * Throws ResearchParseError (with raw text) if the final attempt is not JSON.
 */
export async function generateAdCopy(
  project: ProductProject,
  insight: ResearchInsight,
  avatar: CustomerAvatarContent,
  massDesire: MassDesire,
  angle: MarketingAngle
): Promise<{ content: AdCopyContent; aiUsage: AiUsageSummary[] }> {
  const flowStartedAt = Date.now();
  const logIds = {
    project_id: project.id,
    mass_desire_id: massDesire.id,
    marketing_angle_id: angle.id,
    operation: "generate-copy" as const,
  };

  console.log("[COPY] request received", logIds);
  console.log(
    "[COPY] reviewer notes included:",
    Boolean(angle.reviewer_notes?.trim())
  );

  const client = getOpenAI();
  const input = buildPrompt(project, insight, avatar, massDesire, angle);
  console.log("[COPY] prompt built", {
    ...logIds,
    prompt_chars: input.length,
    duration_ms: Date.now() - flowStartedAt,
  });

  const maxAttempts = 2;
  const aiUsage: AiUsageSummary[] = [];
  let lastValidationError: Error | null = null;
  let lastParseFailed = false;
  let lastRawText = "";
  let lastDebugRef: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const attemptStartedAt = Date.now();
    console.log("[COPY] OpenAI request starting", {
      ...logIds,
      attempt,
      duration_ms: Date.now() - flowStartedAt,
    });

    let tracked;
    try {
      tracked = await trackedResponsesCreate(
        client,
        {
          operation: "generate-copy",
          projectId: project.id,
          sourceRoute: "/api/copy/generate",
          promptChars: input.length,
          metadata: {
            marketing_angle_id: angle.id,
            mass_desire_id: massDesire.id,
            attempt,
          },
        },
        {
          model: OPENAI_MODEL,
          input,
        },
        { timeout: GENERATE_COPY_OPENAI_TIMEOUT_MS }
      );
    } catch (error: unknown) {
      const details =
        error instanceof Error ? error.message : "OpenAI request failed.";
      console.error("[COPY] OpenAI request failed", {
        ...logIds,
        attempt,
        duration_ms: Date.now() - flowStartedAt,
        details,
      });
      throw new CopyGenerateError({
        stage: "openai",
        details,
        aiUsageSummaries: aiUsage,
        message: details,
      });
    }

    aiUsage.push(tracked.summary);
    lastRawText = tracked.text;

    console.log("[COPY] OpenAI response received", {
      ...logIds,
      attempt,
      openai_response_id: tracked.response.id ?? null,
      model: tracked.summary.model,
      response_chars: tracked.text.length,
      duration_ms: Date.now() - attemptStartedAt,
    });
    console.log("[COPY] raw response chars", {
      ...logIds,
      response_chars: tracked.text.length,
    });
    console.log("[COPY] usage captured", {
      ...logIds,
      input_tokens: tracked.summary.input_tokens,
      output_tokens: tracked.summary.output_tokens,
      total_tokens: tracked.summary.total_tokens,
      estimated_cost_usd: tracked.summary.estimated_cost_usd,
    });

    lastDebugRef = await saveGenerateCopyDebugResponse({
      project_id: project.id,
      mass_desire_id: massDesire.id,
      marketing_angle_id: angle.id,
      model: tracked.summary.model,
      openai_response_id: tracked.response.id ?? null,
      usage: aggregateAiUsage([tracked.summary]) ?? null,
      raw_text: tracked.text,
      attempt,
    });

    console.log("[COPY] JSON parse starting", {
      ...logIds,
      attempt,
      debug_ref: lastDebugRef,
    });

    let parsed: unknown;
    try {
      parsed = extractJson(tracked.text);
      lastParseFailed = false;
      console.log("[COPY] JSON parse success", {
        ...logIds,
        attempt,
        duration_ms: Date.now() - flowStartedAt,
      });
    } catch {
      lastParseFailed = true;
      console.warn("[COPY] JSON parse failed", {
        ...logIds,
        attempt,
        response_chars: tracked.text.length,
      });
      continue;
    }

    console.log("[COPY] validation starting", { ...logIds, attempt });

    try {
      const adVariations = validateCopyPack(parsed);
      console.log("[COPY] validation success", {
        ...logIds,
        attempt,
        duration_ms: Date.now() - flowStartedAt,
      });
      return { content: buildContent(adVariations), aiUsage };
    } catch (error: unknown) {
      lastValidationError =
        error instanceof Error ? error : new Error(String(error));
      console.warn("[COPY] validation failed", {
        ...logIds,
        attempt,
        details: lastValidationError.message,
      });
    }
  }

  if (lastParseFailed) {
    throw new CopyGenerateError({
      stage: "parse",
      details: "OpenAI did not return valid JSON.",
      aiUsageSummaries: aiUsage,
      debugRef: lastDebugRef,
      rawText: lastRawText,
    });
  }

  throw new CopyGenerateError({
    stage: "validation",
    details: lastValidationError
      ? `Copy generation produced invalid output: ${lastValidationError.message}`
      : "Copy generation failed. Please try again.",
    aiUsageSummaries: aiUsage,
    debugRef: lastDebugRef,
    rawText: lastRawText,
  });
}
