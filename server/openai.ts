import OpenAI from "openai";
import type { ProductProject, ResearchSourceDraft } from "../src/types";

/**
 * Model used for research. Easy to change in one place if the Responses API /
 * SDK types require a different identifier.
 */
export const OPENAI_MODEL = "gpt-5.5";

/** Number of research sources to gather per run. */
export const RESEARCH_SOURCE_COUNT = 10;

/** Error thrown when the model response cannot be parsed as the expected JSON. */
export class ResearchParseError extends Error {
  rawText: string;
  constructor(message: string, rawText: string) {
    super(message);
    this.name = "ResearchParseError";
    this.rawText = rawText;
  }
}

export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env.local (backend only)."
    );
  }
  return new OpenAI({ apiKey });
}

function buildPrompt(project: ProductProject): string {
  return [
    "You are a customer research analyst for direct-response ecommerce.",
    "",
    "Use the web_search tool to find REAL, public online discussions where",
    "people describe the underlying problem that the product below solves.",
    "Look at sources like Reddit, forums, Quora, blog comments, review threads,",
    "and social posts.",
    "",
    `Find exactly ${RESEARCH_SOURCE_COUNT} high-quality sources. Return exactly`,
    `${RESEARCH_SOURCE_COUNT} — never fewer, never filler. Every source must be`,
    "a genuine, distinct, high-relevance source. Do NOT pad the list with weak or",
    "duplicate sources just to reach the count; instead keep searching until you",
    `have ${RESEARCH_SOURCE_COUNT} strong ones.`,
    "",
    "Focus ONLY on the human, emotional layer of the underlying problem:",
    "- emotional pain, frustration, fear, anxiety",
    "- the exact language and phrases real people use",
    "- failed solutions they have already tried",
    "- rock-bottom / breaking-point moments",
    "",
    `Aim for a useful SPREAD across the ${RESEARCH_SOURCE_COUNT} sources, covering`,
    "(combine where a single strong source covers several):",
    "1. Strongest pain point source",
    "2. Strongest customer language / verbatim phrasing source",
    "3. Failed solutions source",
    "4. Emotional insecurity source",
    "5. Competitor or category positioning source",
    "6. Price or affordability source (if relevant to this market)",
    "7. Routine or usage behaviour source",
    "8. Visual / creative inspiration source",
    "9. Objection or skepticism source",
    "10. Additional high-relevance market pain source",
    "",
    "Strict rules:",
    "- Research the UNDERLYING PROBLEM, not this specific product.",
    "- Use the supplier description, competitor descriptions, and competitor",
    "  URLs ONLY to infer the product category, positioning, and market context.",
    "- Do NOT use our product name as a search term (it is a private brand name).",
    "- Do NOT use the current offer or planned sale price anywhere in research.",
    "- Focus on underlying market pain, emotional language, failed solutions,",
    "  and customer psychology in the target country.",
    "- Do NOT include posts that are merely complaints or reviews about a",
    "  competitor product itself; you want the deeper human problem.",
    "- Only use real URLs you actually found via web_search. Never invent URLs.",
    "- relevance_score is an integer from 0 to 100.",
    "- useful_phrases must be short verbatim-style phrases real people use.",
    "",
    "Research context (DO NOT search for the product name):",
    `- supplier_product_description: ${project.supplier_product_description}`,
    `- closest_competitor_product_description: ${project.closest_competitor_product_description}`,
    `- primary_competitor_url: ${project.primary_competitor_url}`,
    `- additional_competitor_urls: ${project.additional_competitor_urls}`,
    `- target_country: ${project.target_country}`,
    `- initial_problem_hypothesis (optional seed): ${project.initial_problem_hypothesis}`,
    `- initial_customer_hypothesis (optional seed): ${project.initial_customer_hypothesis}`,
    "",
    "Respond with VALID JSON ONLY (no markdown, no commentary) in exactly this shape:",
    "{",
    '  "sources": [',
    "    {",
    '      "url": "string",',
    '      "platform": "string",',
    '      "title": "string",',
    '      "summary": "string",',
    '      "emotional_theme": "string",',
    '      "relevance_score": number,',
    '      "useful_phrases": ["string"]',
    "    }",
    "  ]",
    "}",
  ].join("\n");
}

/** Pull a JSON object out of a model response that may be wrapped in prose/fences. */
export function extractJson(text: string): unknown {
  let candidate = text.trim();

  const fenced = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    candidate = fenced[1].trim();
  }

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    candidate = candidate.slice(start, end + 1);
  }

  return JSON.parse(candidate);
}

export function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

export function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(toStringValue).filter((item) => item.trim().length > 0);
}

function toScore(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizeSources(parsed: unknown): ResearchSourceDraft[] {
  const sourcesRaw =
    parsed && typeof parsed === "object" && "sources" in parsed
      ? (parsed as { sources: unknown }).sources
      : null;

  if (!Array.isArray(sourcesRaw)) {
    throw new Error('Parsed JSON did not contain a "sources" array.');
  }

  return sourcesRaw
    .map((item) => {
      const record = (item ?? {}) as Record<string, unknown>;
      return {
        url: toStringValue(record.url),
        platform: toStringValue(record.platform),
        title: toStringValue(record.title),
        summary: toStringValue(record.summary),
        emotional_theme: toStringValue(record.emotional_theme),
        relevance_score: toScore(record.relevance_score),
        useful_phrases: toStringArray(record.useful_phrases),
      };
    })
    // Drop completely empty filler entries so we never insert blank sources.
    .filter(
      (source) =>
        source.title.trim().length > 0 ||
        source.url.trim().length > 0 ||
        source.summary.trim().length > 0
    );
}

/**
 * Run the research stage for a project using the OpenAI Responses API with the
 * web_search tool. Returns normalized source drafts.
 *
 * Throws ResearchParseError (with raw text) if the model output is not JSON.
 */
export async function runResearchForProject(
  project: ProductProject
): Promise<ResearchSourceDraft[]> {
  const client = getOpenAI();

  const response = await client.responses.create({
    model: OPENAI_MODEL,
    tools: [{ type: "web_search" }],
    input: buildPrompt(project),
  });

  const text = response.output_text ?? "";

  let parsed: unknown;
  try {
    parsed = extractJson(text);
  } catch {
    throw new ResearchParseError(
      "OpenAI did not return valid JSON.",
      text
    );
  }

  return normalizeSources(parsed);
}
