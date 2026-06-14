import type {
  ProductProject,
  ResearchSource,
  ResearchInsightReport,
  EmotionalIntensity,
  PainCluster,
  LanguagePattern,
  EmotionalState,
  FailedSolution,
  ComplianceWarning,
} from "../src/types";
import {
  OPENAI_MODEL,
  ResearchParseError,
  getOpenAI,
  extractJson,
  toStringValue,
  toStringArray,
} from "./openai";
import {
  trackedResponsesCreate,
  type AiUsageSummary,
} from "./ai-usage";

function buildPrompt(
  project: ProductProject,
  sources: ResearchSource[]
): string {
  const sourceBlocks = sources
    .map((source, index) => {
      return [
        `Source ${index + 1}:`,
        `- platform: ${source.platform}`,
        `- title: ${source.title}`,
        `- emotional_theme: ${source.emotional_theme}`,
        `- relevance_score: ${source.relevance_score}`,
        `- summary: ${source.summary}`,
        `- useful_phrases: ${source.useful_phrases.join(" | ")}`,
        `- url: ${source.url}`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    "You are a direct-response strategist and customer psychology researcher.",
    "Deeply analyse the research sources below for one product and produce a",
    "customer INSIGHT REPORT only. This stage is analysis, not creation.",
    "",
    "Pay close attention to:",
    "- specific keywords and repeated phrases",
    "- emotional states and psychological states",
    "- semantic patterns and pain intensity",
    "- failed attempts / solutions people already tried",
    "- hopes and fears",
    "- the exact words the customer actually uses",
    "- copy angles that may be persuasive",
    "- claims or language that may be risky for Meta (Facebook) ads",
    "",
    "Strict rules:",
    "- Base everything ONLY on the provided sources. Do NOT invent sources.",
    "- Do NOT quote large amounts of source text; use short snippets only.",
    "- Do NOT write ad copy.",
    "- Do NOT create a customer avatar.",
    "- emotional_intensity must be exactly one of: low, medium, high.",
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
    "Research sources:",
    sourceBlocks,
    "",
    "Respond with VALID JSON ONLY (no markdown, no commentary) in exactly this shape:",
    "{",
    '  "pain_clusters": [',
    '    { "name": "string", "description": "string", "evidence_from_sources": ["string"], "emotional_intensity": "low | medium | high" }',
    "  ],",
    '  "language_patterns": [',
    '    { "pattern": "string", "meaning": "string", "copywriting_use": "string" }',
    "  ],",
    '  "emotional_states": [',
    '    { "state": "string", "description": "string", "trigger_moments": ["string"] }',
    "  ],",
    '  "failed_solutions": [',
    '    { "solution": "string", "why_it_failed": "string", "market_belief": "string" }',
    "  ],",
    '  "hopes": ["string"],',
    '  "fears": ["string"],',
    '  "copywriting_notes": "string",',
    '  "compliance_warnings": [',
    '    { "risk": "string", "why_it_matters": "string", "safer_direction": "string" }',
    "  ]",
    "}",
  ].join("\n");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toIntensity(value: unknown): EmotionalIntensity {
  const v = toStringValue(value).toLowerCase().trim();
  return v === "low" || v === "high" ? v : "medium";
}

function normalizeReport(parsed: unknown): ResearchInsightReport {
  const root = asRecord(parsed);

  const pain_clusters: PainCluster[] = asArray(root.pain_clusters).map(
    (item) => {
      const r = asRecord(item);
      return {
        name: toStringValue(r.name),
        description: toStringValue(r.description),
        evidence_from_sources: toStringArray(r.evidence_from_sources),
        emotional_intensity: toIntensity(r.emotional_intensity),
      };
    }
  );

  const language_patterns: LanguagePattern[] = asArray(
    root.language_patterns
  ).map((item) => {
    const r = asRecord(item);
    return {
      pattern: toStringValue(r.pattern),
      meaning: toStringValue(r.meaning),
      copywriting_use: toStringValue(r.copywriting_use),
    };
  });

  const emotional_states: EmotionalState[] = asArray(root.emotional_states).map(
    (item) => {
      const r = asRecord(item);
      return {
        state: toStringValue(r.state),
        description: toStringValue(r.description),
        trigger_moments: toStringArray(r.trigger_moments),
      };
    }
  );

  const failed_solutions: FailedSolution[] = asArray(root.failed_solutions).map(
    (item) => {
      const r = asRecord(item);
      return {
        solution: toStringValue(r.solution),
        why_it_failed: toStringValue(r.why_it_failed),
        market_belief: toStringValue(r.market_belief),
      };
    }
  );

  const compliance_warnings: ComplianceWarning[] = asArray(
    root.compliance_warnings
  ).map((item) => {
    const r = asRecord(item);
    return {
      risk: toStringValue(r.risk),
      why_it_matters: toStringValue(r.why_it_matters),
      safer_direction: toStringValue(r.safer_direction),
    };
  });

  return {
    pain_clusters,
    language_patterns,
    emotional_states,
    failed_solutions,
    hopes: toStringArray(root.hopes),
    fears: toStringArray(root.fears),
    copywriting_notes: toStringValue(root.copywriting_notes),
    compliance_warnings,
  };
}

/**
 * Analyse saved research sources and return a structured insight report.
 * Throws ResearchParseError (with raw text) if the model output is not JSON.
 */
export async function generateInsightReport(
  project: ProductProject,
  sources: ResearchSource[],
  runId?: string | null
): Promise<{ report: ResearchInsightReport; aiUsage: AiUsageSummary[] }> {
  const client = getOpenAI();
  const input = buildPrompt(project, sources);

  const { text, summary } = await trackedResponsesCreate(
    client,
    {
      operation: "insight-report",
      projectId: project.id,
      sourceRoute: "/api/insights/generate",
      promptChars: input.length,
      metadata: runId ? { research_run_id: runId } : undefined,
    },
    {
      model: OPENAI_MODEL,
      input,
    }
  );

  let parsed: unknown;
  try {
    parsed = extractJson(text);
  } catch {
    throw new ResearchParseError("OpenAI did not return valid JSON.", text);
  }

  return {
    report: normalizeReport(parsed),
    aiUsage: [summary],
  };
}
