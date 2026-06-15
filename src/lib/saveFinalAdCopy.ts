import { patchAdVariation } from "./copyPackAds";
import type { AdCopySet, AdVariation } from "../types";
import type { FinalAd } from "./finalAds";

export interface AdCopyDraft {
  primary: string;
  headline: string;
  description: string;
}

export function normalizeAdCopyDraft(draft: AdCopyDraft): AdCopyDraft {
  return {
    primary: draft.primary,
    headline: draft.headline.trim(),
    description: draft.description.trim(),
  };
}

/** Persist primary/headline/description for one View Ads or Review Ads unit. */
export async function saveFinalAdCopy(
  ad: FinalAd,
  draft: AdCopyDraft,
  handlers: {
    copySetById: Map<string, AdCopySet>;
    onSaveCopyPack: (
      copySet: AdCopySet,
      adVariations: AdVariation[]
    ) => Promise<AdCopySet>;
    onUpdateTofConceptCopy: (
      conceptId: string,
      copy: AdCopyDraft
    ) => Promise<void>;
  }
): Promise<void> {
  const normalized = normalizeAdCopyDraft(draft);

  if (ad.source_type === "tof") {
    if (!ad.desire_concept_id) {
      throw new Error("Missing TOF concept id.");
    }
    await handlers.onUpdateTofConceptCopy(ad.desire_concept_id, normalized);
    return;
  }

  const copySet = handlers.copySetById.get(ad.copy_set_id);
  if (!copySet) {
    throw new Error("Copy pack not found.");
  }

  const nextAds = patchAdVariation(copySet, ad.ad_variation_index, {
    primary: normalized.primary,
    headline: normalized.headline,
    description: normalized.description,
  });

  await handlers.onSaveCopyPack(copySet, nextAds);
}

/** Toggle publish star (is_winner) for angle ads — same field as Review Ads. */
export async function toggleFinalAdPublishStar(
  ad: FinalAd,
  handlers: {
    copySetById: Map<string, AdCopySet>;
    onSaveCopyPack: (
      copySet: AdCopySet,
      adVariations: AdVariation[]
    ) => Promise<AdCopySet>;
  }
): Promise<void> {
  if (ad.source_type === "tof") {
    throw new Error("Publish starring is not yet supported for TOF ads.");
  }

  const copySet = handlers.copySetById.get(ad.copy_set_id);
  if (!copySet) {
    throw new Error("Copy pack not found.");
  }

  const nextAds = patchAdVariation(copySet, ad.ad_variation_index, {
    is_winner: !ad.is_winner,
  });

  await handlers.onSaveCopyPack(copySet, nextAds);
}
