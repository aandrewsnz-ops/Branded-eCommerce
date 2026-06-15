import { readAdImageFields } from "./adImageStorage";
import type { AdCopySet, AdVariation } from "../types";

const AD_COUNT = 5;

const EMPTY_AD: AdVariation = {
  primary: "",
  headline: "",
  description: "",
  visual_strategy: "",
  image_prompt: "",
};

/** Read ad variations from a copy set (matches Copy Pack modal behaviour). */
export function resolveAdVariations(copySet: AdCopySet): AdVariation[] {
  if (copySet.ad_variations && copySet.ad_variations.length > 0) {
    return copySet.ad_variations.map((ad, i) => ({
      primary: ad.primary ?? "",
      headline: ad.headline ?? "",
      description: ad.description ?? "",
      visual_strategy: ad.visual_strategy ?? "",
      image_prompt: ad.image_prompt ?? copySet.image_prompts?.[i] ?? "",
      locked: Boolean(ad.locked),
      is_winner: Boolean(ad.is_winner),
      last_regenerated_at: ad.last_regenerated_at,
      revision_count:
        typeof ad.revision_count === "number" ? ad.revision_count : 0,
      ...readAdImageFields(ad),
    }));
  }
  const primaries = copySet.short_primary_texts ?? [];
  const headlines = copySet.headlines ?? [];
  const descriptions = copySet.descriptions ?? [];
  const prompts = copySet.image_prompts ?? [];
  const count = Math.max(
    primaries.length,
    headlines.length,
    descriptions.length,
    prompts.length
  );
  const ads: AdVariation[] = [];
  for (let i = 0; i < count; i += 1) {
    ads.push({
      primary: primaries[i]?.text ?? "",
      headline: headlines[i]?.text ?? "",
      description: descriptions[i]?.text ?? "",
      visual_strategy: "",
      image_prompt: prompts[i] ?? "",
    });
  }
  return ads;
}

/** Pad/truncate to exactly five ads for PATCH /api/copy/:id. */
export function toFiveAds(ads: AdVariation[]): AdVariation[] {
  const next = ads.slice(0, AD_COUNT).map((ad) => ({ ...ad }));
  while (next.length < AD_COUNT) next.push({ ...EMPTY_AD });
  return next;
}

export function patchAdVariation(
  copySet: AdCopySet,
  adIndex: number,
  patch: Partial<AdVariation>
): AdVariation[] {
  return toFiveAds(resolveAdVariations(copySet)).map((ad, i) =>
    i === adIndex ? { ...ad, ...patch } : ad
  );
}
