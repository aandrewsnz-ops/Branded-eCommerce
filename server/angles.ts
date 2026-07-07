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

const ANGLES_TARGET_PROMPT_CHARS = 12_000;

const INTENSITY_RANK: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/** Safely take the first N items from an array. */
function takeTop<T>(items: T[] | null | undefined, count: number): T[] {
  if (!Array.isArray(items) || count <= 0) return [];
  return items.slice(0, count);
}

/** Truncate long strings to keep prompts within token limits. */
function truncateText(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function projectField(
  primary: string | undefined,
  fallback: string | undefined,
  max?: number
): string {
  const value = (primary?.trim() || fallback?.trim() || "").trim();
  return max ? truncateText(value, max) : value;
}

function rankPainCluster(cluster: PainCluster): number {
  return INTENSITY_RANK[cluster.emotional_intensity] ?? 1;
}

function compactInsightContext(insight: ResearchInsight): Record<string, unknown> {
  const pain_clusters = takeTop(
    [...(insight.pain_clusters ?? [])].sort(
      (a, b) => rankPainCluster(b) - rankPainCluster(a)
    ),
    3
  ).map((cluster) => ({
    name: truncateText(cluster.name, 80),
    description: truncateText(cluster.description, 160),
    emotional_intensity: cluster.emotional_intensity,
  }));

  const language_patterns = takeTop(insight.language_patterns, 5).map(
    (pattern) => ({
      pattern: truncateText(pattern.pattern, 100),
      meaning: truncateText(pattern.meaning, 100),
    })
  );

  const emotional_states = takeTop(insight.emotional_states, 3).map((state) => ({
    state: truncateText(state.state, 80),
    description: truncateText(state.description, 120),
  }));

  const failed_solutions = takeTop(insight.failed_solutions, 3).map(
    (solution) => ({
      solution: truncateText(solution.solution, 80),
      why_it_failed: truncateText(solution.why_it_failed, 120),
    })
  );

  return {
    pain_clusters,
    language_patterns,
    emotional_states,
    failed_solutions,
    hopes: takeTop(insight.hopes, 3).map((hope) => truncateText(hope, 100)),
    fears: takeTop(insight.fears, 3).map((fear) => truncateText(fear, 100)),
  };
}

function compactAvatarContext(
  avatar: CustomerAvatarContent
): Record<string, unknown> {
  return {
    language_phrases: takeTop(avatar.language_bank?.phrases_they_use, 5).map(
      (phrase) => truncateText(phrase, 100)
    ),
  };
}

function compactMassDesireContext(desire: MassDesire): Record<string, string> {
  return {
    id: desire.id,
    desire_statement: truncateText(desire.desire_statement, 200),
    audience_segment: truncateText(desire.audience_segment, 100),
    emotional_driver: truncateText(desire.emotional_driver, 100),
    what_they_are_really_buying: truncateText(
      desire.what_they_are_really_buying,
      120
    ),
    pain_it_moves_away_from: truncateText(desire.pain_it_moves_away_from, 120),
    positive_outcome_it_moves_toward: truncateText(
      desire.positive_outcome_it_moves_toward,
      120
    ),
    copy_direction: truncateText(desire.copy_direction, 120),
  };
}

function compactProductContext(project: ProductProject): Record<string, string> {
  return {
    product_name: projectField(
      project.product_name,
      project.our_product_name,
      100
    ),
    product_description: projectField(
      project.product_description,
      project.supplier_product_description,
      300
    ),
    target_country: project.target_country,
    target_customer: projectField(
      project.target_customer,
      project.initial_customer_hypothesis,
      160
    ),
    main_problem: projectField(
      project.main_problem,
      project.initial_problem_hypothesis,
      160
    ),
    offer: projectField(project.offer, project.current_offer, 100),
    claims_allowed: truncateText(project.claims_allowed ?? "", 160),
    claims_banned: truncateText(project.claims_banned ?? "", 160),
    brand_tone: projectField(project.brand_tone, project.preferred_tone, 100),
  };
}

function buildCompactPromptContext(
  project: ProductProject,
  insight: ResearchInsight,
  avatar: CustomerAvatarContent,
  massDesires: MassDesire[]
): Record<string, unknown> {
  const context: Record<string, unknown> = {
    product: compactProductContext(project),
    insight: compactInsightContext(insight),
    avatar: compactAvatarContext(avatar),
  };

  if (massDesires.length === 1) {
    context.mass_desire = compactMassDesireContext(massDesires[0]);
  } else {
    context.mass_desires = massDesires.map(compactMassDesireContext);
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
  const promptContext = buildCompactPromptContext(
    project,
    insight,
    avatar,
    massDesires
  );

  return [
    "You are a direct-response strategist creating marketing ANGLES — distinct story frameworks for Meta ad creative strategy.",
    "",
    "This is a CONVERSION-FIRST DRAFT. A later Compliance Check stage will score and flag risk — do NOT pre-remove sharp angles.",
    "",
    `For the mass desire(s) below, create EXACTLY ${EXPECTED_ANGLES_PER_DESIRE} fundamentally different marketing angles per desire.`,
    "",
    "Rules:",
    "- Each angle must tell a different story with a different crisis or realization moment.",
    "- Each angle must appeal to a different life circumstance or emotional context.",
    "- Allow emotionally intense, plausible crisis points grounded in the compact research context.",
    "- Use real language patterns and avatar phrases from the JSON context.",
    "- Do NOT write ad copy, hooks, or creative prompts.",
    "- Do NOT invent testimonials, studies, statistics, certifications, or clinical proof.",
    "- Do NOT claim the product cures, treats, reverses, or permanently fixes medical conditions.",
    "- compliance_notes should be brief; do not dull the angle.",
    "",
    "Angle distinction test: could these 5 angles be 5 different people at a support group, each sharing a completely different discovery story?",
    "",
    "Return one angle_groups entry per mass desire using the exact mass_desire_id. Each group must contain exactly",
    `${EXPECTED_ANGLES_PER_DESIRE} angles.`,
    "",
    "Compact context (JSON):",
    JSON.stringify(promptContext),
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
    target_prompt_chars: ANGLES_TARGET_PROMPT_CHARS,
  });

  if (input.length > ANGLES_TARGET_PROMPT_CHARS) {
    console.warn("[ANGLES] Prompt still large", {
      prompt_chars: input.length,
      target_prompt_chars: ANGLES_TARGET_PROMPT_CHARS,
    });
  }

  console.log("[ANGLES] OpenAI request starting", {
    mass_desire_count: massDesires.length,
    prompt_chars: input.length,
  });
  console.log("[ANGLES] retries disabled for cost control");

  let text: string;
  let summaries: AiUsageSummary[];

  try {
    ({ text, summaries } = await callOpenAIWithRetry(
      "ANGLES",
      (signal) =>
        client.responses.create({ model: OPENAI_MODEL, input }, { signal }),
      {
        timeoutMs: 240_000,
        maxAttempts: 1,
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
