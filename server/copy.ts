import type {
  ProductProject,
  ResearchInsight,
  CustomerAvatarContent,
  MassDesire,
  MarketingAngle,
  AdCopyContent,
  PrimaryTextVariant,
  HeadlineVariant,
  DescriptionVariant,
  HookVariant,
  Callout,
  CopyComplianceNote,
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

function normalizePrimaryTexts(value: unknown): PrimaryTextVariant[] {
  return asArray(value).map((item) => {
    const r = asRecord(item);
    return {
      label: toStringValue(r.label),
      text: toStringValue(r.text),
      strategy: toStringValue(r.strategy),
    };
  });
}

function normalizeHeadlines(value: unknown): HeadlineVariant[] {
  return asArray(value).map((item) => {
    const r = asRecord(item);
    return {
      text: toStringValue(r.text),
      angle: toStringValue(r.angle),
    };
  });
}

function normalizeDescriptions(value: unknown): DescriptionVariant[] {
  return asArray(value).map((item) => {
    const r = asRecord(item);
    return {
      text: toStringValue(r.text),
      angle: toStringValue(r.angle),
    };
  });
}

function normalizeHooks(value: unknown): HookVariant[] {
  return asArray(value).map((item) => {
    const r = asRecord(item);
    return {
      text: toStringValue(r.text),
      why_it_works: toStringValue(r.why_it_works),
    };
  });
}

function normalizeCallouts(value: unknown): Callout[] {
  return asArray(value).map((item) => {
    const r = asRecord(item);
    return {
      text: toStringValue(r.text),
      use_case: toStringValue(r.use_case),
    };
  });
}

function normalizeComplianceNotes(value: unknown): CopyComplianceNote[] {
  return asArray(value).map((item) => {
    const r = asRecord(item);
    return {
      risk: toStringValue(r.risk),
      why_it_matters: toStringValue(r.why_it_matters),
      safer_direction: toStringValue(r.safer_direction),
    };
  });
}

export const QUICK_COPY_LIMITS = {
  short_primary_texts: 3,
  medium_primary_texts: 2,
  headlines: 5,
  descriptions: 3,
  hooks: 5,
  callouts: 3,
  compliance_notes_max: 3,
  concept_summary_max_words: 120,
} as const;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function normalizeAdCopy(parsed: unknown): AdCopyContent {
  const root = asRecord(parsed);
  const compliance_notes = normalizeComplianceNotes(
    root.compliance_notes
  ).slice(0, QUICK_COPY_LIMITS.compliance_notes_max);

  return {
    long_form_story: toStringValue(root.long_form_story),
    short_primary_texts: normalizePrimaryTexts(root.short_primary_texts),
    medium_primary_texts: normalizePrimaryTexts(root.medium_primary_texts),
    headlines: normalizeHeadlines(root.headlines),
    descriptions: normalizeDescriptions(root.descriptions),
    hooks: normalizeHooks(root.hooks),
    hook_transitions: [],
    callouts: normalizeCallouts(root.callouts),
    compliance_notes,
  };
}

/** Validate quick-copy counts. Throws a clear Error if the model output is off. */
export function validateQuickCopy(content: AdCopyContent): void {
  const checks: Array<{ label: string; expected: number; actual: number }> = [
    {
      label: "short primary texts",
      expected: QUICK_COPY_LIMITS.short_primary_texts,
      actual: content.short_primary_texts.length,
    },
    {
      label: "medium primary texts",
      expected: QUICK_COPY_LIMITS.medium_primary_texts,
      actual: content.medium_primary_texts.length,
    },
    {
      label: "headlines",
      expected: QUICK_COPY_LIMITS.headlines,
      actual: content.headlines.length,
    },
    {
      label: "descriptions",
      expected: QUICK_COPY_LIMITS.descriptions,
      actual: content.descriptions.length,
    },
    {
      label: "hooks",
      expected: QUICK_COPY_LIMITS.hooks,
      actual: content.hooks.length,
    },
    {
      label: "callouts",
      expected: QUICK_COPY_LIMITS.callouts,
      actual: content.callouts.length,
    },
  ];

  for (const check of checks) {
    if (check.actual !== check.expected) {
      throw new Error(
        `Expected ${check.expected} ${check.label}, got ${check.actual}.`
      );
    }
  }

  if (
    wordCount(content.long_form_story) >
    QUICK_COPY_LIMITS.concept_summary_max_words
  ) {
    throw new Error(
      `Concept summary exceeds ${QUICK_COPY_LIMITS.concept_summary_max_words} words.`
    );
  }
}

function buildPrompt(
  project: ProductProject,
  insight: ResearchInsight,
  avatar: CustomerAvatarContent,
  massDesire: MassDesire,
  angle: MarketingAngle
): string {
  return [
    "Generate a LEAN QUICK COPY pack for testing ONE marketing angle on Meta/Facebook.",
    "This is NOT the full ad copy pack. The goal is to quickly judge whether",
    "the angle is worth developing further.",
    "",
    "Use:",
    "- product details",
    "- claims_allowed and claims_banned",
    "- insight report",
    "- customer avatar",
    "- mass desire",
    "- selected marketing angle",
    "",
    "Generate EXACTLY:",
    "1. A short core ad concept summary in long_form_story (MAXIMUM 120 words).",
    "   This is a concept summary only — NOT a long story ad.",
    "2. Three short primary texts (60 to 120 words each).",
    "3. Two medium primary texts (150 to 250 words each).",
    "4. Five headlines.",
    "5. Three descriptions.",
    "6. Five hooks.",
    "7. Three callouts.",
    "8. Up to three concise compliance notes.",
    "9. hook_transitions must be an empty array [].",
    "",
    "Do NOT generate:",
    "- A long-form story ad",
    "- Twenty hooks or ten headlines",
    "- Hook transition paragraphs",
    "- Excessive compliance notes",
    "",
    "Style:",
    "- Direct-response, emotionally specific, but Meta-safe.",
    "- Natural language. Short paragraphs.",
    "- No fake testimonials. No guaranteed results.",
    "- No medical claims. No before/after transformation claims.",
    '- No personal attribute callouts like "Do you have..."',
    "- Respect claims_banned.",
    "- Use soft cosmetic language where needed: helps support, designed for,",
    "  made for moments when, a simple way to.",
    "- Use customer language patterns from research, but do not overquote sources.",
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
    "Insight report (JSON):",
    JSON.stringify(
      {
        pain_clusters: insight.pain_clusters,
        language_patterns: insight.language_patterns,
        emotional_states: insight.emotional_states,
        hopes: insight.hopes,
        fears: insight.fears,
        copywriting_notes: insight.copywriting_notes,
        compliance_warnings: insight.compliance_warnings,
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
    "Mass desire:",
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
    "Respond with VALID JSON ONLY (no markdown, no commentary) in exactly this shape:",
    "{",
    '  "long_form_story": "string",',
    '  "short_primary_texts": [{ "label": "string", "text": "string", "strategy": "string" }],',
    '  "medium_primary_texts": [{ "label": "string", "text": "string", "strategy": "string" }],',
    '  "headlines": [{ "text": "string", "angle": "string" }],',
    '  "descriptions": [{ "text": "string", "angle": "string" }],',
    '  "hooks": [{ "text": "string", "why_it_works": "string" }],',
    '  "hook_transitions": [],',
    '  "callouts": [{ "text": "string", "use_case": "overlay | headline | landing_page | creative_brief" }],',
    '  "compliance_notes": [{ "risk": "string", "why_it_matters": "string", "safer_direction": "string" }]',
    "}",
  ].join("\n");
}

/**
 * Generate a lean quick copy pack for one marketing angle.
 * Throws ResearchParseError (with raw text) if the model output is not JSON.
 */
export async function generateAdCopy(
  project: ProductProject,
  insight: ResearchInsight,
  avatar: CustomerAvatarContent,
  massDesire: MassDesire,
  angle: MarketingAngle
): Promise<AdCopyContent> {
  const client = getOpenAI();

  const response = await client.responses.create({
    model: OPENAI_MODEL,
    input: buildPrompt(project, insight, avatar, massDesire, angle),
  });

  const text = response.output_text ?? "";

  let parsed: unknown;
  try {
    parsed = extractJson(text);
  } catch {
    throw new ResearchParseError("OpenAI did not return valid JSON.", text);
  }

  const content = normalizeAdCopy(parsed);
  validateQuickCopy(content);
  return content;
}
