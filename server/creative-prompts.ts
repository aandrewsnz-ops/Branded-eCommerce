import type {
  ProductProject,
  ResearchInsight,
  CustomerAvatarContent,
  MassDesire,
  MarketingAngle,
  AdCopySet,
  CreativePromptContent,
  CreativeConcept,
  ImagePrompt,
  UgcScript,
  CreativeOverlayText,
  CreativeComplianceNote,
} from "../src/types";
import {
  OPENAI_MODEL,
  ResearchParseError,
  getOpenAI,
  extractJson,
  toStringValue,
  toStringArray,
} from "./openai";

export const CREATIVE_PROMPT_LIMITS = {
  creative_concepts: 3,
  image_prompts: 3,
  ugc_scripts: 2,
  overlay_texts: 5,
  compliance_notes_max: 3,
} as const;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeConcepts(value: unknown): CreativeConcept[] {
  return asArray(value).map((item) => {
    const r = asRecord(item);
    return {
      concept_name: toStringValue(r.concept_name),
      format: toStringValue(r.format),
      core_idea: toStringValue(r.core_idea),
      why_it_matches_the_angle: toStringValue(r.why_it_matches_the_angle),
      visual_hook: toStringValue(r.visual_hook),
      recommended_use: toStringValue(r.recommended_use),
    };
  });
}

function normalizeImagePrompts(value: unknown): ImagePrompt[] {
  return asArray(value).map((item) => {
    const r = asRecord(item);
    return {
      concept_name: toStringValue(r.concept_name),
      aspect_ratio: toStringValue(r.aspect_ratio),
      prompt: toStringValue(r.prompt),
      overlay_text: toStringValue(r.overlay_text),
      style_notes: toStringValue(r.style_notes),
    };
  });
}

function normalizeUgcScripts(value: unknown): UgcScript[] {
  return asArray(value).map((item) => {
    const r = asRecord(item);
    return {
      script_name: toStringValue(r.script_name),
      duration: toStringValue(r.duration),
      hook: toStringValue(r.hook),
      script: toStringValue(r.script),
      shot_list: toStringArray(r.shot_list),
      caption: toStringValue(r.caption),
    };
  });
}

function normalizeOverlayTexts(value: unknown): CreativeOverlayText[] {
  return asArray(value).map((item) => {
    const r = asRecord(item);
    return {
      text: toStringValue(r.text),
      use_case: toStringValue(r.use_case),
    };
  });
}

function normalizeComplianceNotes(value: unknown): CreativeComplianceNote[] {
  return asArray(value)
    .map((item) => {
      const r = asRecord(item);
      return {
        risk: toStringValue(r.risk),
        safer_direction: toStringValue(r.safer_direction),
      };
    })
    .slice(0, CREATIVE_PROMPT_LIMITS.compliance_notes_max);
}

function normalizeCreativePrompts(parsed: unknown): CreativePromptContent {
  const root = asRecord(parsed);
  return {
    creative_concepts: normalizeConcepts(root.creative_concepts),
    image_prompts: normalizeImagePrompts(root.image_prompts),
    ugc_scripts: normalizeUgcScripts(root.ugc_scripts),
    overlay_texts: normalizeOverlayTexts(root.overlay_texts),
    negative_prompts: toStringArray(root.negative_prompts),
    compliance_notes: normalizeComplianceNotes(root.compliance_notes),
  };
}

export function validateCreativePrompts(content: CreativePromptContent): void {
  const checks: Array<{ label: string; expected: number; actual: number }> = [
    {
      label: "creative concepts",
      expected: CREATIVE_PROMPT_LIMITS.creative_concepts,
      actual: content.creative_concepts.length,
    },
    {
      label: "image prompts",
      expected: CREATIVE_PROMPT_LIMITS.image_prompts,
      actual: content.image_prompts.length,
    },
    {
      label: "UGC scripts",
      expected: CREATIVE_PROMPT_LIMITS.ugc_scripts,
      actual: content.ugc_scripts.length,
    },
    {
      label: "overlay texts",
      expected: CREATIVE_PROMPT_LIMITS.overlay_texts,
      actual: content.overlay_texts.length,
    },
  ];

  for (const check of checks) {
    if (check.actual !== check.expected) {
      throw new Error(
        `Expected ${check.expected} ${check.label}, got ${check.actual}.`
      );
    }
  }

  if (content.negative_prompts.length === 0) {
    throw new Error("Expected at least one negative prompt.");
  }
}

function buildPrompt(
  project: ProductProject,
  insight: ResearchInsight,
  avatar: CustomerAvatarContent,
  massDesire: MassDesire,
  angle: MarketingAngle,
  copySet: AdCopySet
): string {
  return [
    "Generate a LEAN creative prompt pack for ONE marketing angle and ONE quick copy set.",
    "These prompts will be used for Meta/Facebook direct-response ecommerce creatives.",
    "They should be practical to paste into ChatGPT image generation later.",
    "",
    "Generate EXACTLY:",
    "1. Three creative concepts.",
    "2. Three image prompts.",
    "3. Two UGC video scripts.",
    "4. Five overlay text options.",
    "5. One negative prompt list (array of strings).",
    "6. Up to three concise compliance notes.",
    "",
    "Creative direction:",
    "- Use the marketing angle, quick copy, product details, customer avatar, insight report.",
    "- Prioritise direct-response ecommerce creatives.",
    "- Do NOT ask for fake before/after images or unrealistic transformations.",
    "- Do NOT ask for medical results or fake testimonials.",
    "- Do NOT imply the viewer has a personal flaw or condition.",
    "- Respect claims_banned.",
    "- Keep visuals realistic, publishable, and Meta-safe.",
    "- Beauty: avoid extreme skin closeups, exaggerated ageing, pore gore, fake clinical proof.",
    "- Wellness: avoid shame-driven framing.",
    "- Religious/identity products: avoid implying viewer's religion or beliefs directly.",
    "",
    "Image prompt style — each must include:",
    "- subject, scene, product placement, lighting, background, composition",
    "- text overlay area, camera feel, aspect ratio, what to avoid",
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
    "",
    "Insight report (JSON):",
    JSON.stringify(
      {
        pain_clusters: insight.pain_clusters,
        language_patterns: insight.language_patterns,
        emotional_states: insight.emotional_states,
        compliance_warnings: insight.compliance_warnings,
      },
      null,
      2
    ),
    "",
    "Customer avatar summary:",
    avatar.avatar_summary,
    "",
    "Mass desire:",
    JSON.stringify(
      {
        desire_statement: massDesire.desire_statement,
        emotional_driver: massDesire.emotional_driver,
        copy_direction: massDesire.copy_direction,
      },
      null,
      2
    ),
    "",
    "Marketing angle:",
    JSON.stringify(angle, null, 2),
    "",
    "Quick copy set:",
    JSON.stringify(
      {
        long_form_story: copySet.long_form_story,
        short_primary_texts: copySet.short_primary_texts,
        medium_primary_texts: copySet.medium_primary_texts,
        headlines: copySet.headlines,
        hooks: copySet.hooks,
        callouts: copySet.callouts,
      },
      null,
      2
    ),
    "",
    "Respond with VALID JSON ONLY (no markdown, no commentary) in exactly this shape:",
    "{",
    '  "creative_concepts": [{',
    '    "concept_name": "string",',
    '    "format": "static_image | ugc_video | product_demo | lifestyle | comparison_style",',
    '    "core_idea": "string",',
    '    "why_it_matches_the_angle": "string",',
    '    "visual_hook": "string",',
    '    "recommended_use": "cold_ad | retargeting | landing_page | creative_test"',
    "  }],",
    '  "image_prompts": [{',
    '    "concept_name": "string",',
    '    "aspect_ratio": "1:1 | 4:5 | 9:16",',
    '    "prompt": "string",',
    '    "overlay_text": "string",',
    '    "style_notes": "string"',
    "  }],",
    '  "ugc_scripts": [{',
    '    "script_name": "string",',
    '    "duration": "15s | 30s",',
    '    "hook": "string",',
    '    "script": "string",',
    '    "shot_list": ["string"],',
    '    "caption": "string"',
    "  }],",
    '  "overlay_texts": [{',
    '    "text": "string",',
    '    "use_case": "static_ad | ugc_video | product_demo | retargeting"',
    "  }],",
    '  "negative_prompts": ["string"],',
    '  "compliance_notes": [{ "risk": "string", "safer_direction": "string" }]',
    "}",
  ].join("\n");
}

/**
 * Generate creative prompts for one marketing angle and ad copy set.
 * Throws ResearchParseError (with raw text) if the model output is not JSON.
 */
export async function generateCreativePrompts(
  project: ProductProject,
  insight: ResearchInsight,
  avatar: CustomerAvatarContent,
  massDesire: MassDesire,
  angle: MarketingAngle,
  copySet: AdCopySet
): Promise<CreativePromptContent> {
  const client = getOpenAI();

  const response = await client.responses.create({
    model: OPENAI_MODEL,
    input: buildPrompt(project, insight, avatar, massDesire, angle, copySet),
  });

  const text = response.output_text ?? "";

  let parsed: unknown;
  try {
    parsed = extractJson(text);
  } catch {
    throw new ResearchParseError("OpenAI did not return valid JSON.", text);
  }

  const content = normalizeCreativePrompts(parsed);
  validateCreativePrompts(content);
  return content;
}
