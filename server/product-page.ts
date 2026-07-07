import { randomUUID } from "node:crypto";
import type {
  AdCopySet,
  CustomerAvatarContent,
  MarketingAngle,
  MassDesire,
  ProductPageContent,
  ProductPageSection,
  ProductPageSet,
  ProductPageSectionType,
  ProductProject,
  ResearchInsight,
  ResearchSource,
} from "../src/types";
import { buildProductPageImageFilename } from "../src/lib/productPageFilenames";
import { hydrateProductPageContent } from "../src/lib/productPageLiquid";
import {
  buildStarterProductPageContent,
  type StarterProductPageContext,
} from "../src/lib/productPageStarter";
import {
  ResearchParseError,
  OpenAIUpstreamError,
  OPENAI_MODEL,
  getOpenAI,
  extractJson,
  toStringValue,
  callOpenAIWithRetry,
} from "./openai";
import type { AiUsageLogContext, AiUsageSummary } from "./ai-usage";

const SECTION_ORDER: ProductPageSectionType[] = [
  "proof_intro",
  "ritual",
  "benefits_grid",
  "how_to_use",
  "social_proof",
  "comparison",
  "faq",
  "guarantee",
  "reviews",
  "care_disclaimer",
];

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asStringArray(value: unknown): string[] {
  return asArray(value)
    .map((item) => toStringValue(item))
    .filter(Boolean);
}

function normalizeFaqItems(value: unknown) {
  return asArray(value).map((item) => {
    const r = asRecord(item);
    return {
      question: toStringValue(r.question),
      answer: toStringValue(r.answer),
    };
  });
}

function normalizeBenefitItems(value: unknown) {
  return asArray(value).map((item) => {
    const r = asRecord(item);
    return {
      title: toStringValue(r.title),
      description: toStringValue(r.description),
    };
  });
}

function normalizeStepItems(value: unknown) {
  return asArray(value).map((item) => {
    const r = asRecord(item);
    return {
      title: toStringValue(r.title),
      description: toStringValue(r.description),
    };
  });
}

function normalizeTestimonials(value: unknown) {
  return asArray(value).map((item) => {
    const r = asRecord(item);
    return {
      quote: toStringValue(r.quote),
      attribution: toStringValue(r.attribution),
    };
  });
}

function normalizeSection(
  raw: unknown,
  fallbackOrder: number,
  fallbackType: ProductPageSectionType
): ProductPageSection {
  const r = asRecord(raw);
  const sectionType = (toStringValue(r.section_type) ||
    fallbackType) as ProductPageSectionType;
  const order = Number(r.order) || fallbackOrder;

  const section: ProductPageSection = {
    id: toStringValue(r.id) || `${sectionType}-${order}`,
    order,
    section_type: SECTION_ORDER.includes(sectionType)
      ? sectionType
      : fallbackType,
    section_title: toStringValue(r.section_title) || `Section ${order}`,
    shopify_section_name:
      toStringValue(r.shopify_section_name) ||
      toStringValue(r.section_title) ||
      `Section ${order}`,
    purpose: toStringValue(r.purpose),
    headline: toStringValue(r.headline),
    accent_headline: toStringValue(r.accent_headline) || undefined,
    proof_line: toStringValue(r.proof_line) || undefined,
    body_paragraphs: asStringArray(r.body_paragraphs),
    bullets: asStringArray(r.bullets),
    button_label: toStringValue(r.button_label) || undefined,
    small_print: toStringValue(r.small_print) || undefined,
    image_required: r.image_required !== false,
    image_role: toStringValue(r.image_role) || undefined,
    image_prompt: toStringValue(r.image_prompt),
    image_filename: "",
    shopify_image_url: "",
    custom_liquid: "",
    faq_items: normalizeFaqItems(r.faq_items),
    benefit_items: normalizeBenefitItems(r.benefit_items),
    steps: normalizeStepItems(r.steps),
    comparison_left_title:
      toStringValue(r.comparison_left_title) || undefined,
    comparison_right_title:
      toStringValue(r.comparison_right_title) || undefined,
    comparison_left_bullets: asStringArray(r.comparison_left_bullets),
    comparison_right_bullets: asStringArray(r.comparison_right_bullets),
    testimonials: normalizeTestimonials(r.testimonials),
  };

  section.image_filename = buildProductPageImageFilename(section);
  return section;
}

function validateSections(sections: ProductPageSection[]): ProductPageSection[] {
  if (sections.length < 6) {
    throw new Error(`Expected at least 6 sections, got ${sections.length}.`);
  }

  for (const section of sections) {
    if (!section.headline.trim()) {
      throw new Error(`Section ${section.order} is missing headline.`);
    }
    if (section.image_required && !section.image_prompt.trim()) {
      throw new Error(
        `Section ${section.order} is missing image_prompt.`
      );
    }
  }

  return sections
    .sort((a, b) => a.order - b.order)
    .map((section, index) => ({
      ...section,
      order: index + 1,
      id: section.id || `${section.section_type}-${index + 1}`,
      image_filename: buildProductPageImageFilename({
        ...section,
        order: index + 1,
      }),
    }));
}

export function buildCompactProductPageContext(
  project: ProductProject,
  insight: ResearchInsight,
  avatar: CustomerAvatarContent,
  desires: MassDesire[],
  angles: MarketingAngle[],
  copySets: AdCopySet[],
  sources: ResearchSource[]
): Record<string, unknown> {
  const topPhrases = sources
    .flatMap((source) => source.useful_phrases ?? [])
    .filter(Boolean)
    .slice(0, 12)
    .map((phrase) => truncate(phrase, 120));

  const topThemes = sources
    .map((source) => source.emotional_theme)
    .filter(Boolean)
    .slice(0, 6);

  const desireSummaries = desires.slice(0, 5).map((desire) => ({
    statement: desire.desire_statement,
    audience: desire.audience_segment,
    emotional_driver: desire.emotional_driver,
    pain: desire.pain_it_moves_away_from,
    outcome: desire.positive_outcome_it_moves_toward,
    copy_direction: desire.copy_direction,
  }));

  const angleSummaries = angles.slice(0, 8).map((angle) => ({
    name: angle.angle_name,
    audience: angle.target_audience,
    emotional_moment: angle.key_emotional_moment,
    copy_direction: angle.copy_direction,
  }));

  const adSnippets = copySets
    .flatMap((set) => set.ad_variations ?? [])
    .slice(0, 8)
    .map((ad) => ({
      primary: truncate(ad.primary ?? "", 180),
      headline: truncate(ad.headline ?? "", 80),
      description: truncate(ad.description ?? "", 120),
    }));

  return {
    store: {
      your_store_name: project.your_store_name,
      your_store_url: project.your_store_url,
    },
    product: {
      our_product_name: project.our_product_name,
      supplier_product_description: truncate(
        project.supplier_product_description,
        500
      ),
      target_country: project.target_country,
      planned_sale_price: project.planned_sale_price,
      current_offer: project.current_offer,
    },
    insight_compact: {
      pain_clusters: (insight.pain_clusters ?? []).slice(0, 4).map((c) => ({
        name: c.name,
        description: truncate(c.description, 200),
      })),
      language_patterns: (insight.language_patterns ?? [])
        .slice(0, 6)
        .map((p) => p.pattern),
    },
    avatar_summary: truncate(avatar.avatar_summary ?? "", 600),
    customer_phrases: topPhrases,
    emotional_themes: topThemes,
    mass_desires: desireSummaries,
    marketing_angles: angleSummaries,
    ad_copy_snippets: adSnippets,
  };
}

function buildPrompt(
  project: ProductProject,
  context: Record<string, unknown>
): string {
  const sectionTypes = SECTION_ORDER.map(
    (type, index) => `${index + 1}. ${type}`
  ).join("\n");

  return [
    "Generate a Shopify product page content plan as structured JSON.",
    "The page should feel UGC-led, social-proof driven, emotionally resonant, and practical.",
    "Use the project's actual research language and customer phrasing where appropriate.",
    "",
    "Rules:",
    "- Keep claims cosmetic and plausible.",
    "- Do not invent clinical proof, fake statistics, testimonials from real people, or guaranteed results.",
    "- Avoid medical claims and before/after medical transformation imagery.",
    "- Use direct response tone: premium but practical.",
    "- Use the real product name and offer from context.",
    "- Each image_prompt must be paste-ready for ChatGPT image generation.",
    "- For each image_prompt include: image role, scene, subject, product placement, lighting, camera style, composition.",
    "- Do NOT output HTML or Liquid code.",
    "",
    "Return sections in this order and include ALL section types:",
    sectionTypes,
    "",
    "Each section object fields:",
    "- section_type (one of the types above)",
    "- section_title (short internal label, e.g. Proof 1)",
    "- shopify_section_name (Shopify section label)",
    "- purpose",
    "- headline",
    "- accent_headline (optional short phrase to highlight in gold)",
    "- proof_line (optional)",
    "- body_paragraphs (array of strings)",
    "- bullets (array of strings)",
    "- button_label (optional, use 👉 Try It Now where appropriate)",
    "- small_print (optional disclaimer line)",
    "- image_required (boolean)",
    "- image_role",
    "- image_prompt (required when image_required is true)",
    "- faq_items (array of {question, answer} for faq section)",
    "- benefit_items (array of {title, description} for benefits_grid — exactly 4)",
    "- steps (array of {title, description} for how_to_use — exactly 3)",
    "- comparison_left_title, comparison_right_title, comparison_left_bullets, comparison_right_bullets (for comparison)",
    "- testimonials (array of {quote, attribution} for reviews — 3 realistic UGC-style quotes, no fake full names; use first name + city style)",
    "",
    "Set image_required false for faq, guarantee, and care_disclaimer.",
    "",
    "Context (JSON):",
    JSON.stringify(context),
    "",
    "Return VALID JSON ONLY:",
    '{ "page_title": "string", "page_strategy": "string", "sections": [ ... ] }',
  ].join("\n");
}

function buildRepairPrompt(rawText: string): string {
  return [
    "Fix the JSON below to match the product page schema.",
    "Return VALID JSON ONLY with page_title, page_strategy, and sections array.",
    "",
    "Broken response:",
    truncate(rawText, 6000),
  ].join("\n");
}

function parsePageResponse(text: string): ProductPageContent {
  let parsed: unknown;
  try {
    parsed = extractJson(text);
  } catch {
    throw new ResearchParseError("OpenAI did not return valid JSON.", text);
  }

  const root = asRecord(parsed);
  const rawSections = asArray(root.sections);
  const sections = rawSections.map((raw, index) =>
    normalizeSection(raw, index + 1, SECTION_ORDER[index] ?? "proof_intro")
  );

  return {
    page_title: toStringValue(root.page_title) || "Product Page",
    page_strategy: toStringValue(root.page_strategy),
    sections: validateSections(sections),
  };
}

async function requestProductPage(
  input: string,
  usageContext: AiUsageLogContext
): Promise<{ text: string; summaries: AiUsageSummary[] }> {
  const client = getOpenAI();
  return callOpenAIWithRetry(
    "ProductPage",
    (signal) =>
      client.responses.create(
        { model: OPENAI_MODEL, input },
        { signal, timeout: 120_000 }
      ),
    {
      timeoutMs: 120_000,
      maxAttempts: 3,
      usageContext: {
        ...usageContext,
        promptChars: input.length,
      },
    }
  );
}

export async function generateProductPage(
  project: ProductProject,
  insight: ResearchInsight,
  avatar: CustomerAvatarContent,
  desires: MassDesire[],
  angles: MarketingAngle[],
  copySets: AdCopySet[],
  sources: ResearchSource[]
): Promise<{ content: ProductPageContent; aiUsage: AiUsageSummary[] }> {
  const context = buildCompactProductPageContext(
    project,
    insight,
    avatar,
    desires,
    angles,
    copySets,
    sources
  );
  const prompt = buildPrompt(project, context);
  const usageContext: AiUsageLogContext = {
    operation: "product-page",
    projectId: project.id,
    sourceRoute: "POST /api/product-page/generate",
  };

  let { text, summaries } = await requestProductPage(prompt, usageContext);

  let content: ProductPageContent;
  try {
    content = parsePageResponse(text);
  } catch (firstError: unknown) {
    const repair = buildRepairPrompt(text);
    const repaired = await requestProductPage(repair, {
      ...usageContext,
      metadata: { repair: true },
    });
    summaries = [...summaries, ...repaired.summaries];
    content = parsePageResponse(repaired.text);
  }

  content = hydrateProductPageContent({
    ...content,
    sections: content.sections.map((section) => ({
      ...section,
      id: section.id || randomUUID(),
    })),
  });

  return { content, aiUsage: summaries };
}

export function mergeProductPageSection(
  content: ProductPageContent,
  sectionId: string,
  patch: Partial<ProductPageSection>
): ProductPageContent {
  const sections = content.sections.map((section) => {
    if (section.id !== sectionId) return section;
    const merged = { ...section, ...patch };
    if (patch.headline || patch.section_title || patch.order) {
      merged.image_filename = buildProductPageImageFilename(merged);
    }
    return merged;
  });

  return hydrateProductPageContent({
    ...content,
    sections,
  });
}

export type { StarterProductPageContext };
export { buildStarterProductPageContent };

export const PRODUCT_PAGE_MISSING_TABLE_DETAILS =
  "Product page table not found. Run supabase/product_page_sets.sql in Supabase.";

export function isMissingProductPageTable(
  message: string,
  code?: string
): boolean {
  const lower = message.toLowerCase();
  return (
    code === "42P01" ||
    lower.includes("product_page_sets") ||
    lower.includes("does not exist") ||
    lower.includes("schema cache")
  );
}

export async function saveProductPageSet(
  supabase: ReturnType<typeof import("./supabase").getSupabase>,
  projectId: string,
  content: ProductPageContent
): Promise<ProductPageSet> {
  const now = new Date().toISOString();

  const { error: deleteError } = await supabase
    .from("product_page_sets")
    .delete()
    .eq("project_id", projectId);

  if (deleteError) {
    if (!isMissingProductPageTable(deleteError.message, deleteError.code)) {
      throw new Error(
        `Failed to clear old product page: ${deleteError.message}`
      );
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from("product_page_sets")
    .insert({
      project_id: projectId,
      content,
      status: "draft",
      updated_at: now,
    })
    .select()
    .single();

  if (insertError || !inserted) {
    const msg = insertError?.message ?? "Failed to save product page template.";
    if (isMissingProductPageTable(msg, insertError?.code)) {
      throw new Error(PRODUCT_PAGE_MISSING_TABLE_DETAILS);
    }
    throw new Error(`Failed to save product page: ${msg}`);
  }

  return {
    id: String(inserted.id),
    project_id: String(inserted.project_id),
    content: inserted.content as ProductPageContent,
    status: String(inserted.status ?? "draft"),
    created_at: String(inserted.created_at),
    updated_at: String(inserted.updated_at),
  };
}

export { OpenAIUpstreamError, ResearchParseError };
