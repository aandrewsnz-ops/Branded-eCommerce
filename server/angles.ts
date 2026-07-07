import type {
  ProductProject,
  ResearchInsight,
  CustomerAvatarContent,
  MassDesire,
  MarketingAngleDraft,
  MarketingAngleGroup,
  MarketingAnglesContent,
  PainCluster,
} from "../src/types";
import {
  OPENAI_MODEL,
  ResearchParseError,
  OpenAIUpstreamError,
  getOpenAI,
  callOpenAIWithRetry,
  extractJson,
  toStringValue,
  toStringArray,
} from "./openai";
import { type AiUsageSummary } from "./ai-usage";

export const EXPECTED_ANGLES_PER_DESIRE = 5;

const ANGLES_TARGET_MAX_PROMPT_CHARS = 12_000;

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

function rankPainCluster(cluster: PainCluster): number {
  return INTENSITY_RANK[cluster.emotional_intensity] ?? 1;
}

function compactMassDesire(desire: MassDesire): Record<string, string> {
  return {
    id: desire.id,
    desire_statement: desire.desire_statement,
    audience_segment: desire.audience_segment,
    emotional_driver: desire.emotional_driver,
    what_they_are_really_buying: desire.what_they_are_really_buying,
    pain_it_moves_away_from: desire.pain_it_moves_away_from,
    positive_outcome_it_moves_toward: desire.positive_outcome_it_moves_toward,
    copy_direction: desire.copy_direction,
  };
}

/** Compact research + avatar + desire context to keep prompts under token limits. */
function buildCompactAnglesContext(
  insight: ResearchInsight,
  avatar: CustomerAvatarContent,
  massDesires: MassDesire[]
): Record<string, unknown> {
  const pain_clusters = [...(insight.pain_clusters ?? [])]
    .sort((a, b) => rankPainCluster(b) - rankPainCluster(a))
    .slice(0, 3)
    .map((cluster) => ({
      name: cluster.name,
      description: truncate(cluster.description, 200),
      emotional_intensity: cluster.emotional_intensity,
    }));

  const language_patterns = (insight.language_patterns ?? [])
    .slice(0, 5)
    .map((pattern) => ({
      pattern: truncate(pattern.pattern, 120),
      meaning: truncate(pattern.meaning, 120),
      copywriting_use: truncate(pattern.copywriting_use, 120),
    }));

  const emotional_states = (insight.emotional_states ?? [])
    .slice(0, 3)
    .map((state) => ({
      state: state.state,
      description: truncate(state.description, 150),
      trigger_moments: (state.trigger_moments ?? [])
        .slice(0, 2)
        .map((moment) => truncate(moment, 80)),
    }));

  const failed_solutions = (insight.failed_solutions ?? [])
    .slice(0, 3)
    .map((solution) => ({
      solution: truncate(solution.solution, 100),
      why_it_failed: truncate(solution.why_it_failed, 150),
      market_belief: truncate(solution.market_belief, 120),
    }));

  const hopes = (insight.hopes ?? []).slice(0, 3).map((hope) => truncate(hope, 120));
  const fears = (insight.fears ?? []).slice(0, 3).map((fear) => truncate(fear, 120));

  const avatar_language_phrases = (avatar.language_bank?.phrases_they_use ?? [])
    .slice(0, 5)
    .map((phrase) => truncate(phrase, 120));

  const context: Record<string, unknown> = {
    pain_clusters,
    language_patterns,
    emotional_states,
    failed_solutions,
    hopes,
    fears,
    avatar_language_phrases,
  };

  if (massDesires.length === 1) {
    context.mass_desire = compactMassDesire(massDesires[0]);
  } else {
    context.mass_desires = massDesires.map(compactMassDesire);
  }

  return context;
}

export class AngleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AngleValidationError";
  }
}

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
  const compactContext = buildCompactAnglesContext(
    insight,
    avatar,
    massDesires
  );

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
    "- Use real patterns from the compact research context and language phrases.",
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
    `- product_name: ${truncate(project.product_name ?? project.our_product_name ?? "", 120)}`,
    `- product_description: ${truncate(project.product_description ?? project.supplier_product_description ?? "", 400)}`,
    `- target_country: ${project.target_country}`,
    `- target_customer: ${truncate(project.target_customer ?? project.initial_customer_hypothesis ?? "", 200)}`,
    `- main_problem: ${truncate(project.main_problem ?? project.initial_problem_hypothesis ?? "", 200)}`,
    `- offer: ${truncate(project.offer ?? project.current_offer ?? "", 120)}`,
    `- claims_allowed: ${truncate(project.claims_allowed ?? "", 200)}`,
    `- claims_banned: ${truncate(project.claims_banned ?? "", 200)}`,
    `- brand_tone: ${truncate(project.brand_tone ?? project.preferred_tone ?? "", 120)}`,
    `- output_goal: ${truncate(project.output_goal ?? "", 120)}`,
    "",
    "Compact research and mass desire context (JSON):",
    JSON.stringify(compactContext, null, 2),
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
 * Validate a single-desire generation result immediately after OpenAI returns.
 */
export function validateSingleDesireResult(
  content: MarketingAnglesContent,
  desire: MassDesire
): void {
  if (content.angle_groups.length !== 1) {
    throw new AngleValidationError(
      `Expected exactly 1 angle group for desire ${desire.id}, got ${content.angle_groups.length}.`
    );
  }

  const group = content.angle_groups[0];

  if (group.mass_desire_id !== desire.id) {
    throw new AngleValidationError(
      `Angle group mass_desire_id "${group.mass_desire_id}" does not match expected desire id "${desire.id}".`
    );
  }

  if (group.angles.length !== EXPECTED_ANGLES_PER_DESIRE) {
    throw new AngleValidationError(
      `Expected ${EXPECTED_ANGLES_PER_DESIRE} angles for desire "${desire.desire_statement}", got ${group.angles.length}.`
    );
  }
}

/**
 * Validate that OpenAI returned the expected angle groups for each mass desire.
 * Throws a clear AngleValidationError if counts or IDs do not match.
 */
export function validateAngleGroups(
  content: MarketingAnglesContent,
  massDesires: MassDesire[]
): void {
  if (content.angle_groups.length !== massDesires.length) {
    throw new AngleValidationError(
      `Expected ${massDesires.length} angle groups, got ${content.angle_groups.length}.`
    );
  }

  const desireIds = new Set(massDesires.map((d) => d.id));

  for (const desire of massDesires) {
    const group = content.angle_groups.find(
      (g) => g.mass_desire_id === desire.id
    );
    if (!group) {
      throw new AngleValidationError(
        `Missing angle group for mass desire id ${desire.id}.`
      );
    }
    if (group.angles.length !== EXPECTED_ANGLES_PER_DESIRE) {
      throw new AngleValidationError(
        `Expected ${EXPECTED_ANGLES_PER_DESIRE} angles for desire "${desire.desire_statement}", got ${group.angles.length}.`
      );
    }
  }

  for (const group of content.angle_groups) {
    if (!desireIds.has(group.mass_desire_id)) {
      throw new AngleValidationError(
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
): Promise<{ content: MarketingAnglesContent; aiUsage: AiUsageSummary[] }> {
  const client = getOpenAI();
  const input = buildPrompt(project, insight, avatar, massDesires);

  console.log("[ANGLES] prompt_chars before OpenAI call", {
    prompt_chars: input.length,
    mass_desire_count: massDesires.length,
    target_max_prompt_chars: ANGLES_TARGET_MAX_PROMPT_CHARS,
    over_target: input.length > ANGLES_TARGET_MAX_PROMPT_CHARS,
  });

  if (input.length > ANGLES_TARGET_MAX_PROMPT_CHARS) {
    console.warn("[ANGLES] prompt_chars exceeds target", {
      prompt_chars: input.length,
      target_max_prompt_chars: ANGLES_TARGET_MAX_PROMPT_CHARS,
    });
  }

  console.log("[ANGLES] OpenAI request starting", {
    mass_desire_count: massDesires.length,
    prompt_chars: input.length,
  });

  let text: string;
  let summaries: AiUsageSummary[];

  try {
    ({ text, summaries } = await callOpenAIWithRetry(
      "ANGLES",
      (signal) =>
        client.responses.create({ model: OPENAI_MODEL, input }, { signal }),
      {
        timeoutMs: 240_000,
        maxAttempts: 3,
        usageContext: {
          operation: "marketing-angles",
          projectId: project.id,
          sourceRoute: "/api/angles/generate",
          promptChars: input.length,
          metadata: {
            research_run_id: insight.run_id ?? null,
            mass_desire_count: massDesires.length,
          },
        },
      }
    ));
  } catch (error: unknown) {
    if (error instanceof OpenAIUpstreamError) {
      console.error("[ANGLES] OpenAI request failed after retries", {
        status: error.status,
        details: error.details,
        mass_desire_count: massDesires.length,
      });
      throw new OpenAIUpstreamError(
        error.details,
        error.status,
        error.details
      );
    }
    throw error;
  }

  console.log("[ANGLES] OpenAI response received", {
    response_chars: text.length,
    usage_summaries: summaries.length,
  });

  let parsed: unknown;
  try {
    parsed = extractJson(text);
  } catch {
    throw new ResearchParseError("OpenAI did not return valid JSON.", text);
  }

  const content = normalizeAngleGroups(parsed);
  validateAngleGroups(content, massDesires);
  return { content, aiUsage: summaries };
}
