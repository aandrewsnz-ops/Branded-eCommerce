import type {
  ProductProject,
  ResearchInsight,
  CustomerAvatarContent,
  MassDesireDraft,
  MassDesiresContent,
} from "../src/types";

export const EXPECTED_DESIRE_COUNT = 5;
import {
  OPENAI_MODEL,
  ResearchParseError,
  getOpenAI,
  extractJson,
  toStringValue,
  toStringArray,
} from "./openai";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeDesire(item: unknown): MassDesireDraft {
  const r = asRecord(item);
  return {
    desire_statement: toStringValue(r.desire_statement),
    audience_segment: toStringValue(r.audience_segment),
    what_they_are_really_buying: toStringValue(r.what_they_are_really_buying),
    emotional_driver: toStringValue(r.emotional_driver),
    life_context: toStringValue(r.life_context),
    pain_it_moves_away_from: toStringValue(r.pain_it_moves_away_from),
    positive_outcome_it_moves_toward: toStringValue(
      r.positive_outcome_it_moves_toward
    ),
    why_this_desire_is_distinct: toStringValue(r.why_this_desire_is_distinct),
    copy_direction: toStringValue(r.copy_direction),
    messaging_to_avoid: toStringValue(r.messaging_to_avoid),
    compliance_notes: toStringArray(r.compliance_notes),
  };
}

function normalizeMassDesires(parsed: unknown): MassDesiresContent {
  const root = asRecord(parsed);
  const desiresRaw = root.mass_desires;

  if (!Array.isArray(desiresRaw)) {
    throw new Error('Parsed JSON did not contain a "mass_desires" array.');
  }

  return {
    mass_desires: desiresRaw.map(normalizeDesire),
  };
}

function buildPrompt(
  project: ProductProject,
  insight: ResearchInsight,
  avatar: CustomerAvatarContent
): string {
  return [
    "You are a direct-response strategist specialising in mass desires —",
    "the fundamental things a customer wants from a product, expressed from",
    "their perspective.",
    "",
    "Generate EXACTLY 5 fundamentally different mass desires based on:",
    "- the product details",
    "- the latest insight report",
    "- the customer avatar",
    "",
    "Rules:",
    "- Each desire must be written as a simple \"I want...\" statement.",
    "- Each desire must represent a DIFFERENT thing the customer wants.",
    "- The 5 desires must appeal to different customer motivations.",
    "- Do NOT create small variations of the same desire.",
    "- Do NOT create marketing angles, ad copy, or hooks.",
    "- Do NOT invent testimonials.",
    "- Use research insights and avatar, but do not pretend inferred data is certain.",
    "- Respect claims_allowed and claims_banned.",
    "- Keep Meta (Facebook) ad compliance in mind.",
    "",
    "Distinction test (apply to every pair):",
    "Could these two desires be combined into one broader desire?",
    "If yes, they are too similar — rewrite until they are distinct.",
    "",
    "Example of distinct desires:",
    "- I want to feel confident leaving the house with less makeup",
    "- I want my skincare routine to feel easier and less overwhelming",
    "- I want to stop feeling like I keep wasting money on products that do nothing",
    "- I want to feel more polished before photos or social events",
    "- I want one small daily ritual that makes me feel looked after",
    "",
    "Product context:",
    `- product_name: ${project.product_name}`,
    `- product_description: ${project.product_description}`,
    `- target_country: ${project.target_country}`,
    `- target_customer: ${project.target_customer}`,
    `- main_problem: ${project.main_problem}`,
    `- offer: ${project.offer}`,
    `- claims_allowed: ${project.claims_allowed}`,
    `- claims_banned: ${project.claims_banned}`,
    `- brand_tone: ${project.brand_tone}`,
    `- output_goal: ${project.output_goal}`,
    "",
    "Latest insight report (JSON):",
    JSON.stringify(
      {
        pain_clusters: insight.pain_clusters,
        language_patterns: insight.language_patterns,
        emotional_states: insight.emotional_states,
        failed_solutions: insight.failed_solutions,
        hopes: insight.hopes,
        fears: insight.fears,
        copywriting_notes: insight.copywriting_notes,
        compliance_warnings: insight.compliance_warnings,
      },
      null,
      2
    ),
    "",
    "Customer avatar (JSON):",
    JSON.stringify(avatar, null, 2),
    "",
    "Respond with VALID JSON ONLY (no markdown, no commentary) in exactly this shape:",
    "{",
    '  "mass_desires": [',
    "    {",
    '      "desire_statement": "I want ...",',
    '      "audience_segment": "string",',
    '      "what_they_are_really_buying": "string",',
    '      "emotional_driver": "string",',
    '      "life_context": "string",',
    '      "pain_it_moves_away_from": "string",',
    '      "positive_outcome_it_moves_toward": "string",',
    '      "why_this_desire_is_distinct": "string",',
    '      "copy_direction": "string",',
    '      "messaging_to_avoid": "string",',
    '      "compliance_notes": ["string"]',
    "    }",
    "  ]",
    "}",
  ].join("\n");
}

/**
 * Generate mass desires from project, insight report, and customer avatar.
 * Throws ResearchParseError (with raw text) if the model output is not JSON.
 */
export async function generateMassDesires(
  project: ProductProject,
  insight: ResearchInsight,
  avatar: CustomerAvatarContent
): Promise<MassDesiresContent> {
  const client = getOpenAI();

  const response = await client.responses.create({
    model: OPENAI_MODEL,
    input: buildPrompt(project, insight, avatar),
  });

  const text = response.output_text ?? "";

  let parsed: unknown;
  try {
    parsed = extractJson(text);
  } catch {
    throw new ResearchParseError("OpenAI did not return valid JSON.", text);
  }

  return normalizeMassDesires(parsed);
}
