import type {
  ProductProject,
  ResearchInsight,
  CustomerAvatarContent,
  MassDesire,
  MarketingAngleDraft,
  MarketingAngleGroup,
  MarketingAnglesContent,
} from "../src/types";
import {
  OPENAI_MODEL,
  ResearchParseError,
  getOpenAI,
  extractJson,
  toStringValue,
  toStringArray,
} from "./openai";

export const EXPECTED_ANGLES_PER_DESIRE = 5;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeAngle(item: unknown): MarketingAngleDraft {
  const r = asRecord(item);
  return {
    angle_name: toStringValue(r.angle_name),
    target_audience: toStringValue(r.target_audience),
    story_arc: toStringValue(r.story_arc),
    beginning_situation: toStringValue(r.beginning_situation),
    crisis_or_realization_moment: toStringValue(
      r.crisis_or_realization_moment
    ),
    discovery_moment: toStringValue(r.discovery_moment),
    resolution: toStringValue(r.resolution),
    unique_problem_mechanism: toStringValue(r.unique_problem_mechanism),
    unique_solution_mechanism: toStringValue(r.unique_solution_mechanism),
    key_emotional_moment: toStringValue(r.key_emotional_moment),
    real_language_patterns: toStringArray(r.real_language_patterns),
    copy_direction: toStringValue(r.copy_direction),
    creative_direction: toStringValue(r.creative_direction),
    compliance_notes: toStringArray(r.compliance_notes),
  };
}

function normalizeAngleGroups(parsed: unknown): MarketingAnglesContent {
  const root = asRecord(parsed);
  const groupsRaw = root.angle_groups;

  if (!Array.isArray(groupsRaw)) {
    throw new Error('Parsed JSON did not contain an "angle_groups" array.');
  }

  const angle_groups: MarketingAngleGroup[] = groupsRaw.map((item) => {
    const r = asRecord(item);
    return {
      mass_desire_id: toStringValue(r.mass_desire_id),
      desire_statement: toStringValue(r.desire_statement),
      angles: asArray(r.angles).map(normalizeAngle),
    };
  });

  return { angle_groups };
}

function buildPrompt(
  project: ProductProject,
  insight: ResearchInsight,
  avatar: CustomerAvatarContent,
  massDesires: MassDesire[]
): string {
  const desireBlocks = massDesires
    .map((desire) => {
      return [
        `Mass desire (id: ${desire.id}):`,
        `- desire_statement: ${desire.desire_statement}`,
        `- audience_segment: ${desire.audience_segment}`,
        `- emotional_driver: ${desire.emotional_driver}`,
        `- what_they_are_really_buying: ${desire.what_they_are_really_buying}`,
        `- pain_it_moves_away_from: ${desire.pain_it_moves_away_from}`,
        `- positive_outcome_it_moves_toward: ${desire.positive_outcome_it_moves_toward}`,
        `- copy_direction: ${desire.copy_direction}`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    "You are a direct-response strategist creating marketing ANGLES —",
    "distinct story frameworks for Meta ad creative strategy.",
    "",
    "This is a CONVERSION-FIRST DRAFT. Aim for angles that could strongly convert,",
    "not angles that are already publish-ready. A separate Compliance Check stage",
    "will later score, flag, and recommend safer rewrites — so do NOT pre-remove",
    "an angle simply because it may carry Meta risk.",
    "",
    `For EACH of the ${massDesires.length} mass desires below, create EXACTLY`,
    `${EXPECTED_ANGLES_PER_DESIRE} fundamentally different marketing angles.`,
    "",
    "Emotional intensity (encouraged):",
    "- Allow sharper crisis points and more emotionally intense realisation moments.",
    "- Allow angles built on embarrassment, comparison, avoidance, regret, social",
    "  discomfort, photo anxiety, partner perception, ageing anxiety, money wasted,",
    "  and frustration with failed solutions.",
    "- Do NOT make every angle safe or bland.",
    "- Keep angles plausible and grounded in the research.",
    "",
    "Rules:",
    "- Each angle must tell a different type of story.",
    "- Each angle must have a different crisis point or realization moment.",
    "- Each angle must appeal to a different life circumstance or emotional context.",
    "- Use real patterns from the research insights and language bank.",
    "- Do NOT write ad copy, hooks, or creative prompts.",
    "",
    "Truthfulness safeguards (always apply):",
    "- Do NOT invent testimonials or present fictional stories as real customers.",
    "- Do NOT fabricate studies, statistics, certifications, or guarantees.",
    "- Do NOT invent clinical proof or create false product claims.",
    "- Do NOT claim the product cures, treats, reverses, or permanently fixes",
    "  medical conditions.",
    "- compliance_notes is for the later Compliance Check stage — keep it brief;",
    "  do not let it dull the angle.",
    "",
    "Angle distinction test (for each desire's 5 angles):",
    "Could these 5 angles be 5 different people at a support group, each sharing",
    "a completely different story about how they discovered the same problem?",
    "If two angles feel similar, rewrite them.",
    "",
    "You MUST return one angle_groups entry per mass desire, using the exact",
    "mass_desire_id provided. Each group must contain exactly",
    `${EXPECTED_ANGLES_PER_DESIRE} angles.`,
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
    "Customer avatar language bank:",
    JSON.stringify(avatar.language_bank, null, 2),
    "",
    "Mass desires to create angles for:",
    desireBlocks,
    "",
    "Respond with VALID JSON ONLY (no markdown, no commentary) in exactly this shape:",
    "{",
    '  "angle_groups": [',
    "    {",
    '      "mass_desire_id": "string",',
    '      "desire_statement": "string",',
    '      "angles": [',
    "        {",
    '          "angle_name": "string",',
    '          "target_audience": "string",',
    '          "story_arc": "string",',
    '          "beginning_situation": "string",',
    '          "crisis_or_realization_moment": "string",',
    '          "discovery_moment": "string",',
    '          "resolution": "string",',
    '          "unique_problem_mechanism": "string",',
    '          "unique_solution_mechanism": "string",',
    '          "key_emotional_moment": "string",',
    '          "real_language_patterns": ["string"],',
    '          "copy_direction": "string",',
    '          "creative_direction": "string",',
    '          "compliance_notes": ["string"]',
    "        }",
    "      ]",
    "    }",
    "  ]",
    "}",
  ].join("\n");
}

/**
 * Validate that OpenAI returned the expected angle groups for each mass desire.
 * Throws a clear Error if counts or IDs do not match.
 */
export function validateAngleGroups(
  content: MarketingAnglesContent,
  massDesires: MassDesire[]
): void {
  if (content.angle_groups.length !== massDesires.length) {
    throw new Error(
      `Expected ${massDesires.length} angle groups, got ${content.angle_groups.length}.`
    );
  }

  const desireIds = new Set(massDesires.map((d) => d.id));

  for (const desire of massDesires) {
    const group = content.angle_groups.find(
      (g) => g.mass_desire_id === desire.id
    );
    if (!group) {
      throw new Error(
        `Missing angle group for mass desire id ${desire.id}.`
      );
    }
    if (group.angles.length !== EXPECTED_ANGLES_PER_DESIRE) {
      throw new Error(
        `Expected ${EXPECTED_ANGLES_PER_DESIRE} angles for desire "${desire.desire_statement}", got ${group.angles.length}.`
      );
    }
  }

  for (const group of content.angle_groups) {
    if (!desireIds.has(group.mass_desire_id)) {
      throw new Error(
        `Unknown mass_desire_id in angle group: ${group.mass_desire_id}.`
      );
    }
  }
}

/**
 * Generate marketing angles for saved mass desires.
 * Throws ResearchParseError (with raw text) if the model output is not JSON.
 */
export async function generateMarketingAngles(
  project: ProductProject,
  insight: ResearchInsight,
  avatar: CustomerAvatarContent,
  massDesires: MassDesire[]
): Promise<MarketingAnglesContent> {
  const client = getOpenAI();

  const response = await client.responses.create({
    model: OPENAI_MODEL,
    input: buildPrompt(project, insight, avatar, massDesires),
  });

  const text = response.output_text ?? "";

  let parsed: unknown;
  try {
    parsed = extractJson(text);
  } catch {
    throw new ResearchParseError("OpenAI did not return valid JSON.", text);
  }

  const content = normalizeAngleGroups(parsed);
  validateAngleGroups(content, massDesires);
  return content;
}
