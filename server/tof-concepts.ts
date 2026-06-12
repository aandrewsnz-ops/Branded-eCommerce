import type {
  ProductProject,
  ResearchInsight,
  CustomerAvatarContent,
  MassDesire,
  TofConceptDraft,
  TofOverlayRecommendation,
} from "../src/types";
import {
  ResearchParseError,
  OPENAI_MODEL,
  getOpenAI,
  extractJson,
  toStringValue,
} from "./openai";

/** How many top-of-funnel concepts to generate per mass desire. */
export const TOF_CONCEPT_COUNT = 3;

const OVERLAY_VALUES = new Set<TofOverlayRecommendation>([
  "none",
  "headline_only",
  "headline_plus_support_line",
]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeOverlay(value: unknown): TofOverlayRecommendation {
  const raw = toStringValue(value).toLowerCase().replace(/\s+/g, "_");
  if (OVERLAY_VALUES.has(raw as TofOverlayRecommendation)) {
    return raw as TofOverlayRecommendation;
  }
  if (raw.includes("headline") && raw.includes("support")) {
    return "headline_plus_support_line";
  }
  if (raw.includes("headline")) {
    return "headline_only";
  }
  return "none";
}

function normalizeConcept(value: unknown): TofConceptDraft {
  const r = asRecord(value);
  return {
    concept_title: toStringValue(r.concept_title),
    headline: toStringValue(r.headline),
    support_line: toStringValue(r.support_line),
    overlay_recommendation: normalizeOverlay(r.overlay_recommendation),
    visual_strategy: toStringValue(r.visual_strategy),
    rationale: toStringValue(r.rationale),
    image_prompt: toStringValue(r.image_prompt),
  };
}

function validateConceptPack(concepts: TofConceptDraft[]): TofConceptDraft[] {
  if (concepts.length !== TOF_CONCEPT_COUNT) {
    throw new Error(
      `Expected exactly ${TOF_CONCEPT_COUNT} concepts, got ${concepts.length}.`
    );
  }

  concepts.forEach((concept, index) => {
    const required: (keyof TofConceptDraft)[] = [
      "concept_title",
      "headline",
      "visual_strategy",
      "rationale",
      "image_prompt",
    ];
    for (const field of required) {
      if (!concept[field]?.trim()) {
        throw new Error(
          `Concept ${index + 1} is missing required field "${field}".`
        );
      }
    }
    if (
      concept.overlay_recommendation === "headline_plus_support_line" &&
      !concept.support_line.trim()
    ) {
      throw new Error(
        `Concept ${index + 1} uses headline_plus_support_line but support_line is empty.`
      );
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

function buildPrompt(
  project: ProductProject,
  insight: ResearchInsight,
  avatar: CustomerAvatarContent,
  massDesire: MassDesire
): string {
  return [
    "Generate EXACTLY 3 distinct TOP-OF-FUNNEL Meta ad concepts from the mass",
    "desire below.",
    "",
    "These are NOT angle-level direct response ads. They are broad, emotional,",
    "image-first concepts designed to stop the scroll on Facebook and Instagram",
    "feeds for audiences with a very short attention span.",
    "",
    "OBJECTIVE:",
    "- Scroll-stopping clarity in under 2 seconds",
    "- Strong emotional recognition",
    "- Simple but captivating image ideas",
    "- Very light copy — not long-form direct response",
    "- Visual-first creative suitable for ChatGPT image generation later",
    "",
    "HOW THESE DIFFER FROM ANGLE ADS:",
    "- Broader and more emotional",
    "- Less product-heavy; product can be subtle or secondary if the visual is stronger",
    "- More visual, often little or no text overlay",
    "- Understandable extremely quickly",
    "- Do NOT write long copy packs, detailed mechanisms, or cluttered layouts",
    "",
    "GENERATION RULES:",
    `- Return exactly ${TOF_CONCEPT_COUNT} concepts in the "concepts" array`,
    "- Each concept must feel like a strong, fast ad idea — distinct from the others",
    "- Headline: short, punchy, emotionally resonant (often enough as main ad text)",
    "- support_line: optional; blank string if not needed; only include when it",
    "  genuinely strengthens the concept; keep very short",
    "- overlay_recommendation: one of none | headline_only | headline_plus_support_line",
    "- visual_strategy: short explanation of what the image does and why it stops scroll",
    "- rationale: one short sentence on why this works at top of funnel",
    "",
    "IMAGE PROMPT RULES (CRITICAL):",
    "- Each image_prompt must be fully written and ready to paste into ChatGPT",
    "- The image must be understandable in ~2 seconds",
    "- Simple, clean, uncluttered composition",
    "- Prioritise a strong visual idea over complexity",
    "- Create a dopamine hit through recognition, curiosity, relief, or visual satisfaction",
    "- Feel natively suited to high-performing Meta static ad creative",
    "- Square 1:1 format for Meta feed ads",
    "- Specify scene, subject, mood, camera, lighting, composition",
    "- Explicitly state whether text overlay is needed; if none, say NO text overlay",
    "- If text helps, use ONE short line only",
    "- Choose from patterns like: recognition moments, routine gap visuals, outfit or",
    "  mirror moments, polished face vs forgotten neck/chest contrast, symbolic",
    "  skincare completion visuals, simple emotionally resonant product + lifestyle moments",
    "- Avoid dense layouts, long text, busy compositions, before/after imagery,",
    "  exaggerated medical claims, and compliance risk",
    "",
    "Product context:",
    `- our_product_name: ${project.our_product_name}`,
    `- supplier_product_description: ${project.supplier_product_description}`,
    `- target_country: ${project.target_country}`,
    `- planned_sale_price: ${project.planned_sale_price}`,
    `- current_offer: ${project.current_offer}`,
    `- preferred_tone: ${project.preferred_tone}`,
    "",
    "Mass desire (PRIMARY source — do NOT use a specific marketing angle):",
    JSON.stringify(
      {
        desire_statement: massDesire.desire_statement,
        audience_segment: massDesire.audience_segment,
        what_they_are_really_buying: massDesire.what_they_are_really_buying,
        emotional_driver: massDesire.emotional_driver,
        life_context: massDesire.life_context,
        pain_it_moves_away_from: massDesire.pain_it_moves_away_from,
        positive_outcome_it_moves_toward:
          massDesire.positive_outcome_it_moves_toward,
        why_this_desire_is_distinct: massDesire.why_this_desire_is_distinct,
        copy_direction: massDesire.copy_direction,
        messaging_to_avoid: massDesire.messaging_to_avoid,
        compliance_notes: massDesire.compliance_notes,
      },
      null,
      2
    ),
    "",
    "Insight report (customer language and emotion):",
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
    '  "concepts": [',
    "    {",
    '      "concept_title": "string — short internal title",',
    '      "headline": "string — short punchy headline",',
    '      "support_line": "string — optional, empty if not needed",',
    '      "overlay_recommendation": "none | headline_only | headline_plus_support_line",',
    '      "visual_strategy": "string",',
    '      "rationale": "string",',
    '      "image_prompt": "string — full ChatGPT-ready prompt"',
    "    }",
    "  ]",
    "}",
    "",
    `"concepts" MUST contain exactly ${TOF_CONCEPT_COUNT} items.`,
  ].join("\n");
}

/** Generate 3 top-of-funnel concepts for a mass desire. */
export async function generateTofConcepts(
  project: ProductProject,
  insight: ResearchInsight,
  avatar: CustomerAvatarContent,
  massDesire: MassDesire
): Promise<{ concepts: TofConceptDraft[]; sourceSummary: string }> {
  const client = getOpenAI();
  const input = buildPrompt(project, insight, avatar, massDesire);
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
      const root = asRecord(parsed);
      const concepts = asArray(root.concepts).map(normalizeConcept);
      return {
        concepts: validateConceptPack(concepts),
        sourceSummary: buildDesireSummary(massDesire),
      };
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
      : "TOF concept generation failed. Please try again."
  );
}
