import type {
  ProductProject,
  ResearchInsight,
  ResearchSource,
  CustomerAvatarContent,
  CustomerAvatarDemographics,
  CustomerAvatarPsychographics,
  CustomerAvatarVictoriesFailures,
  CustomerAvatarExistingSolution,
  CustomerAvatarLanguageBank,
  CustomerAvatarCopywritingImplications,
} from "../src/types";
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

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeDemographics(value: unknown): CustomerAvatarDemographics {
  const r = asRecord(value);
  return {
    age_range: toStringValue(r.age_range),
    gender_skew: toStringValue(r.gender_skew),
    location_context: toStringValue(r.location_context),
    income_or_spending_context: toStringValue(r.income_or_spending_context),
    life_stage: toStringValue(r.life_stage),
  };
}

function normalizePsychographics(value: unknown): CustomerAvatarPsychographics {
  const r = asRecord(value);
  return {
    core_beliefs: toStringArray(r.core_beliefs),
    attitudes: toStringArray(r.attitudes),
    identity_markers: toStringArray(r.identity_markers),
    values: toStringArray(r.values),
    prejudices_or_biases: toStringArray(r.prejudices_or_biases),
  };
}

function normalizeVictoriesFailures(
  value: unknown
): CustomerAvatarVictoriesFailures {
  const r = asRecord(value);
  return {
    victories: toStringArray(r.victories),
    failures: toStringArray(r.failures),
  };
}

function normalizeExistingSolutions(
  value: unknown
): CustomerAvatarExistingSolution[] {
  return asArray(value).map((item) => {
    const r = asRecord(item);
    return {
      solution: toStringValue(r.solution),
      experience: toStringValue(r.experience),
      likes: toStringValue(r.likes),
      dislikes: toStringValue(r.dislikes),
      belief_about_effectiveness: toStringValue(r.belief_about_effectiveness),
    };
  });
}

function normalizeLanguageBank(value: unknown): CustomerAvatarLanguageBank {
  const r = asRecord(value);
  return {
    phrases_they_use: toStringArray(r.phrases_they_use),
    words_to_use_in_copy: toStringArray(r.words_to_use_in_copy),
    words_to_avoid: toStringArray(r.words_to_avoid),
  };
}

function normalizeCopywritingImplications(
  value: unknown
): CustomerAvatarCopywritingImplications {
  const r = asRecord(value);
  return {
    best_emotional_angle: toStringValue(r.best_emotional_angle),
    best_logical_angle: toStringValue(r.best_logical_angle),
    trust_builders: toStringArray(r.trust_builders),
    risk_reducers: toStringArray(r.risk_reducers),
  };
}

function normalizeAvatar(parsed: unknown): CustomerAvatarContent {
  const root = asRecord(parsed);
  return {
    avatar_name: toStringValue(root.avatar_name),
    avatar_summary: toStringValue(root.avatar_summary),
    demographics: normalizeDemographics(root.demographics),
    psychographics: normalizePsychographics(root.psychographics),
    hopes_and_dreams: toStringArray(root.hopes_and_dreams),
    victories_and_failures: normalizeVictoriesFailures(
      root.victories_and_failures
    ),
    outside_forces_they_blame: toStringArray(root.outside_forces_they_blame),
    existing_solutions: normalizeExistingSolutions(root.existing_solutions),
    horror_stories_or_bad_experiences: toStringArray(
      root.horror_stories_or_bad_experiences
    ),
    buying_triggers: toStringArray(root.buying_triggers),
    objections: toStringArray(root.objections),
    language_bank: normalizeLanguageBank(root.language_bank),
    copywriting_implications: normalizeCopywritingImplications(
      root.copywriting_implications
    ),
    compliance_notes: toStringArray(root.compliance_notes),
  };
}

function buildPrompt(
  project: ProductProject,
  insight: ResearchInsight,
  sources: ResearchSource[]
): string {
  const sourceBlocks =
    sources.length > 0
      ? sources
          .map((source, index) => {
            return [
              `Source ${index + 1}:`,
              `- platform: ${source.platform}`,
              `- title: ${source.title}`,
              `- emotional_theme: ${source.emotional_theme}`,
              `- summary: ${source.summary}`,
              `- useful_phrases: ${source.useful_phrases.join(" | ")}`,
            ].join("\n");
          })
          .join("\n\n")
      : "(No raw research sources available — rely on the insight report.)";

  return [
    "You are a direct-response strategist creating a research-grounded ideal",
    "customer avatar for ecommerce and Meta ad creative strategy.",
    "",
    "Create ONE clear ideal customer avatar based on:",
    "- the product details",
    "- the research sources (if provided)",
    "- the latest insight report",
    "",
    "Strict rules:",
    "- Create a believable but research-grounded avatar.",
    "- Do NOT invent unsupported demographics with false certainty.",
    '- Use wording like "likely", "appears to", or "skews toward" where inferred.',
    "- Do NOT write ad copy.",
    "- Do NOT create mass desires or marketing angles.",
    "- Do NOT invent testimonials.",
    "- Do NOT imply sensitive personal attributes directly in ad targeting language.",
    "- The avatar must be useful for later direct-response copywriting and Meta ads.",
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
    "Research sources:",
    sourceBlocks,
    "",
    "Respond with VALID JSON ONLY (no markdown, no commentary) in exactly this shape:",
    "{",
    '  "avatar_name": "string",',
    '  "avatar_summary": "string",',
    '  "demographics": {',
    '    "age_range": "string",',
    '    "gender_skew": "string",',
    '    "location_context": "string",',
    '    "income_or_spending_context": "string",',
    '    "life_stage": "string"',
    "  },",
    '  "psychographics": {',
    '    "core_beliefs": ["string"],',
    '    "attitudes": ["string"],',
    '    "identity_markers": ["string"],',
    '    "values": ["string"],',
    '    "prejudices_or_biases": ["string"]',
    "  },",
    '  "hopes_and_dreams": ["string"],',
    '  "victories_and_failures": { "victories": ["string"], "failures": ["string"] },',
    '  "outside_forces_they_blame": ["string"],',
    '  "existing_solutions": [',
    '    { "solution": "string", "experience": "string", "likes": "string", "dislikes": "string", "belief_about_effectiveness": "string" }',
    "  ],",
    '  "horror_stories_or_bad_experiences": ["string"],',
    '  "buying_triggers": ["string"],',
    '  "objections": ["string"],',
    '  "language_bank": {',
    '    "phrases_they_use": ["string"],',
    '    "words_to_use_in_copy": ["string"],',
    '    "words_to_avoid": ["string"]',
    "  },",
    '  "copywriting_implications": {',
    '    "best_emotional_angle": "string",',
    '    "best_logical_angle": "string",',
    '    "trust_builders": ["string"],',
    '    "risk_reducers": ["string"]',
    "  },",
    '  "compliance_notes": ["string"]',
    "}",
  ].join("\n");
}

/** Build a readable plain-text summary for content_text storage. */
export function avatarToContentText(avatar: CustomerAvatarContent): string {
  const lines = [
    avatar.avatar_name,
    "",
    avatar.avatar_summary,
    "",
    `Demographics: ${avatar.demographics.age_range}, ${avatar.demographics.life_stage}, ${avatar.demographics.location_context}`,
    `Best emotional angle: ${avatar.copywriting_implications.best_emotional_angle}`,
  ];
  return lines.filter(Boolean).join("\n");
}

/**
 * Generate a customer avatar from project details, insight report, and sources.
 * Throws ResearchParseError (with raw text) if the model output is not JSON.
 */
export async function generateCustomerAvatar(
  project: ProductProject,
  insight: ResearchInsight,
  sources: ResearchSource[]
): Promise<CustomerAvatarContent> {
  const client = getOpenAI();

  const response = await client.responses.create({
    model: OPENAI_MODEL,
    input: buildPrompt(project, insight, sources),
  });

  const text = response.output_text ?? "";

  let parsed: unknown;
  try {
    parsed = extractJson(text);
  } catch {
    throw new ResearchParseError("OpenAI did not return valid JSON.", text);
  }

  return normalizeAvatar(parsed);
}
