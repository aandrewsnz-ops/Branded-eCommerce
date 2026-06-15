import { getMassDesireNumber, toDisplayCase } from "./finalAds";
import type { DesireConcept } from "../types";
import { resolveTofAd } from "./tofAdFields";

export const TOF_CONCEPT_LETTERS = "ABC";

export function getTofConceptLetter(tofConceptIndex: number): string {
  return TOF_CONCEPT_LETTERS[tofConceptIndex] ?? String(tofConceptIndex + 1);
}

/** Naming text for TOF ads: description → headline → TOF Ad N. */
export function buildTofNamingText(
  description?: string,
  headline?: string,
  tofConceptIndex?: number
): string {
  if (description?.trim()) {
    return toDisplayCase(description);
  }
  if (headline?.trim()) {
    return toDisplayCase(headline);
  }
  if (tofConceptIndex !== undefined) {
    return `TOF Ad ${tofConceptIndex + 1}`;
  }
  return "TOF Ad";
}

export function buildTofAdName({
  massDesireIndex,
  tofConceptIndex,
  description,
  headline,
}: {
  massDesireIndex: number;
  tofConceptIndex: number;
  description?: string;
  headline?: string;
}): string {
  const massDesireNumber = getMassDesireNumber(massDesireIndex);
  const letter = getTofConceptLetter(tofConceptIndex);
  const namingText = buildTofNamingText(description, headline, tofConceptIndex);
  return `TOF ${massDesireNumber}${letter} - ${namingText}`;
}

export function slugifyTofText(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function buildTofImageFilename({
  massDesireIndex,
  tofConceptIndex,
  description,
  headline,
  extension = "png",
}: {
  massDesireIndex: number;
  tofConceptIndex: number;
  description?: string;
  headline?: string;
  extension?: string;
}): string {
  const massDesireNumber = getMassDesireNumber(massDesireIndex);
  const letter = getTofConceptLetter(tofConceptIndex).toLowerCase();
  const prefix = `tof-${massDesireNumber}${letter}`;
  const source =
    description?.trim() ||
    headline?.trim() ||
    `tof-ad-${tofConceptIndex + 1}`;
  const textSlug = slugifyTofText(source);
  const ext = extension.replace(/^\./, "").toLowerCase() || "png";
  return textSlug ? `${prefix}-${textSlug}.${ext}` : `${prefix}.${ext}`;
}

export function extensionFromTofConcept(
  concept: Pick<DesireConcept, "image_file_type" | "image_filename" | "image_path">
): string {
  if (concept.image_file_type) {
    const mime = concept.image_file_type.toLowerCase();
    if (mime.includes("png")) return "png";
    if (mime.includes("webp")) return "webp";
    if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  }
  const fromFilename = concept.image_filename?.split(".").pop()?.toLowerCase();
  if (fromFilename && ["png", "jpg", "jpeg", "webp"].includes(fromFilename)) {
    return fromFilename === "jpeg" ? "jpg" : fromFilename;
  }
  const fromPath = concept.image_path?.split(".").pop()?.toLowerCase();
  if (fromPath && ["png", "jpg", "jpeg", "webp"].includes(fromPath)) {
    return fromPath === "jpeg" ? "jpg" : fromPath;
  }
  return "png";
}

export interface TofNamingContext {
  massDesireIndex: number;
  massDesireNumber: number;
  tofConceptIndex: number;
  tofConceptLetter: string;
  adName: string;
  safeFilename: string;
}

export function resolveTofNaming(
  concept: DesireConcept,
  massDesireIndex: number,
  tofConceptIndex: number
): TofNamingContext {
  const ad = resolveTofAd(concept);
  const massDesireNumber = getMassDesireNumber(massDesireIndex);
  const tofConceptLetter = getTofConceptLetter(tofConceptIndex);
  const adName = buildTofAdName({
    massDesireIndex,
    tofConceptIndex,
    description: ad.description,
    headline: ad.headline,
  });
  const safeFilename = buildTofImageFilename({
    massDesireIndex,
    tofConceptIndex,
    description: ad.description,
    headline: ad.headline,
    extension: extensionFromTofConcept(concept),
  });
  return {
    massDesireIndex,
    massDesireNumber,
    tofConceptIndex,
    tofConceptLetter,
    adName,
    safeFilename,
  };
}
