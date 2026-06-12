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
    "- Each image_prompt must be ready to paste directly into ChatGPT image",
    "  generation, designed for Facebook/Instagram audiences with a ~2-second",
    "  attention span.",
    "- It must create an immediate dopamine hit through one or more of:",
    "  recognition, curiosity, relief, status, visual satisfaction, emotional",
    "  validation, or a clean surprising product moment. Get the message across fast.",
    "- Each prompt must specify: Scene, Subject, Product placement, Mood, Camera",
    "  style, Lighting, Composition, whether text overlay is needed (and the one",
    "  short overlay line if useful), Square 1:1 Meta ad format, and a clear",
    "  instruction to keep the image simple and scroll-stopping.",
    "- Not every image should have text. If the visual hook is strong, specify NO",
    "  text overlay. If text helps, use ONE short line only. Avoid clutter and",
    "  long overlays.",
    "- Avoid: fake before-and-after, medical/clinical proof visuals, exaggerated",
    "  transformation, and anything that makes the viewer look defective or shamed.",
    "  The image must support the copy, not fight it.",
    "- Good visual formats: mirror pause moment; face routine vs forgotten",
    "  neck/chest; clean bathroom skincare ritual; POV routine shot; product",
    "  applicator close-up; premium flat lay; UGC-style phone photo; simple",
    "  text-led ad with one punchy line; a polished outfit / neckline moment; a",
    "  product hero that makes the built-in massage applicator obvious.",
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
    "Selected marketing angle:",
    JSON.stringify(angle, null, 2),
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

const IMAGE_PROMPT_RULES = [
  "The image_prompt must be ready to paste directly into ChatGPT image",
  "generation, designed for Facebook/Instagram audiences with a ~2-second",
  "attention span. It must create a fast dopamine hit through recognition,",
  "curiosity, relief, status, visual satisfaction, emotional validation, or a",
  "clean surprising product moment. It must specify: Scene, Subject, Product",
  "placement, Mood, Camera style, Lighting, Composition, whether text overlay is",
  "needed (and the one short overlay line if useful), Square 1:1 Meta ad format,",
  "and a clear instruction to keep the image simple and scroll-stopping. Not",
  "every image needs text — if the visual hook is strong, specify NO text",
  "overlay; if text helps, use ONE short line only. Avoid fake before-and-after,",
  "medical/clinical proof visuals, overcrowded compositions, long overlays, and",
  "generic product photos when a stronger concept exists.",
];

function sharedContextLines(
  project: ProductProject,
  insight: ResearchInsight,
  avatar: CustomerAvatarContent,
  massDesire: MassDesire,
  angle: MarketingAngle
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
    "Selected marketing angle:",
    JSON.stringify(angle, null, 2),
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
  parse: (value: unknown) => T
): Promise<T> {
  const client = getOpenAI();
  let lastParseFailed = false;
  let lastValidationError: Error | null = null;
  let lastRawText = "";

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const response = await client.responses.create({
      model: OPENAI_MODEL,
      input,
    });
    const text = response.output_text ?? "";
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
      return parse(parsed);
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
  adIndex: number
): Promise<AdVariation> {
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
    ...sharedContextLines(project, insight, avatar, massDesire, angle),
    "",
    "Respond with VALID JSON ONLY (no markdown) in exactly this shape:",
    '{ "primary": "string", "headline": "string", "description": "string", "visual_strategy": "string", "image_prompt": "string" }',
  ].join("\n");

  return generateValidatedJson(input, (parsed) => {
    const ad = normalizeSingleAd(parsed);
    const missing = (
      ["primary", "headline", "description", "visual_strategy", "image_prompt"] as const
    ).filter((field) => ad[field].trim().length === 0);
    if (missing.length > 0) {
      throw new Error(`Regenerated ad is missing: ${missing.join(", ")}.`);
    }
    return ad;
  });
}

/** Regenerate ONLY the visual strategy + image prompt for existing ad copy. */
export async function regenerateImagePrompt(
  project: ProductProject,
  insight: ResearchInsight,
  avatar: CustomerAvatarContent,
  massDesire: MassDesire,
  angle: MarketingAngle,
  ad: AdVariation
): Promise<{ visual_strategy: string; image_prompt: string }> {
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
    ...sharedContextLines(project, insight, avatar, massDesire, angle),
    "",
    "Respond with VALID JSON ONLY (no markdown) in exactly this shape:",
    '{ "visual_strategy": "string", "image_prompt": "string" }',
  ].join("\n");

  return generateValidatedJson(input, (parsed) => {
    const r = asRecord(parsed);
    const visual_strategy = toStringValue(r.visual_strategy);
    const image_prompt = toStringValue(r.image_prompt);
    if (visual_strategy.trim().length === 0 || image_prompt.trim().length === 0) {
      throw new Error("Regenerated image prompt is incomplete.");
    }
    return { visual_strategy, image_prompt };
  });
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
): Promise<AdCopyContent> {
  const client = getOpenAI();
  const input = buildPrompt(project, insight, avatar, massDesire, angle);
  const maxAttempts = 2;

  let lastValidationError: Error | null = null;
  let lastParseFailed = false;
  let lastRawText = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await client.responses.create({
      model: OPENAI_MODEL,
      input,
    });

    const text = response.output_text ?? "";
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
      const adVariations = validateCopyPack(parsed);
      return buildContent(adVariations);
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
      ? `Copy generation produced invalid output: ${lastValidationError.message} Please try again.`
      : "Copy generation failed. Please try again."
  );
}
