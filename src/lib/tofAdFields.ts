import type { DesireConcept } from "../types";

/** Normalized TOF ad fields for display and copy actions. */
export interface TofAdFields {
  primary: string;
  headline: string;
  description: string;
  visual_strategy: string;
  image_prompt: string;
}

/**
 * Map a desire_concepts row to the current ad-unit shape.
 * New generations store primary in `rationale` and description in `support_line`.
 * Older concept-board rows fall back to legacy fields.
 */
export function resolveTofAd(concept: DesireConcept): TofAdFields {
  const headline =
    concept.headline?.trim() || concept.concept_title?.trim() || "";

  const primary =
    concept.rationale?.trim() ||
    concept.visual_strategy?.trim() ||
    "";

  const description = concept.support_line?.trim() || "";

  return {
    primary,
    headline,
    description,
    visual_strategy: concept.visual_strategy?.trim() ?? "",
    image_prompt: concept.image_prompt?.trim() ?? "",
  };
}

export function formatTofFullAd(ad: TofAdFields): string {
  return [
    `Headline: ${ad.headline}`,
    `Primary: ${ad.primary}`,
    `Description: ${ad.description}`,
    ad.visual_strategy ? `Visual Strategy: ${ad.visual_strategy}` : null,
    ad.image_prompt ? `Image Prompt: ${ad.image_prompt}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatAllTofAds(
  concepts: DesireConcept[],
  desireTitle?: string
): string {
  const sorted = [...concepts].sort(
    (a, b) => a.concept_number - b.concept_number
  );
  const parts = [
    desireTitle ? `TOF Copy Pack — ${desireTitle}` : "TOF Copy Pack",
    "",
  ];
  sorted.forEach((concept, index) => {
    const ad = resolveTofAd(concept);
    parts.push(`TOF Ad ${index + 1}`, formatTofFullAd(ad), "");
  });
  return parts.join("\n").trim();
}
