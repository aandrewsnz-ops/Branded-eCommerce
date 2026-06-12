import type {
  AdCopySet,
  AdVariation,
  MarketingAngle,
  MassDesire,
} from "../types";

const ANGLE_LETTERS = "ABCDE";

/** A flattened ad unit ready for the Ads page (has an uploaded image). */
export interface FinalAd {
  ad_name: string;
  safe_filename: string;
  mass_desire_index: number;
  angle_letter: string;
  ad_variation_index: number;
  primary: string;
  headline: string;
  description: string;
  image_url: string;
  image_path?: string;
  image_filename?: string;
  needs_filename_fix: boolean;
  copy_set_id: string;
  marketing_angle_id: string;
  mass_desire_id: string;
}

export function getMassDesireNumber(desireIndex: number): number {
  return desireIndex + 1;
}

export function getAngleLetter(angleIndex: number): string {
  return ANGLE_LETTERS[angleIndex] ?? String(angleIndex + 1);
}

/** Sentence-style casing for ad display names. */
export function toDisplayCase(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function buildAdDescription(
  ad: Pick<AdVariation, "headline">,
  angleName: string
): string {
  if (ad.headline?.trim()) {
    return toDisplayCase(ad.headline);
  }
  if (angleName?.trim()) {
    return toDisplayCase(angleName);
  }
  return "Generated ad";
}

export function buildAdName(
  massDesireNumber: number,
  angleLetter: string,
  description: string
): string {
  return `${massDesireNumber}${angleLetter} - ${description}`;
}

/** Build the display ad name from a flattened final ad record. */
export function buildAdNameFromFinalAd(
  finalAd: Pick<FinalAd, "ad_name">
): string {
  return finalAd.ad_name.trim();
}

/**
 * Convert an ad display name to a safe storage/download filename.
 * Example: "1A - Feel polished from face to chest" → "1a-feel-polished-from-face-to-chest.png"
 */
export function slugifyAdNameForFilename(
  adName: string,
  extension = "png"
): string {
  const ext = extension.replace(/^\./, "").toLowerCase() || "png";
  const slug = adName
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return slug ? `${slug}.${ext}` : `ad.${ext}`;
}

/** Basename from a stored image path or filename. */
export function storedImageBasename(
  imageFilename?: string,
  imagePath?: string
): string {
  if (imageFilename?.trim()) return imageFilename.trim();
  if (imagePath?.trim()) {
    return imagePath.split("/").pop() ?? "";
  }
  return "";
}

/** True when the stored object name does not match the expected clean filename. */
export function imageFilenameNeedsFix(
  expectedSafeFilename: string,
  imageFilename?: string,
  imagePath?: string
): boolean {
  const expected = expectedSafeFilename.trim().toLowerCase();
  const stored = storedImageBasename(imageFilename, imagePath).toLowerCase();
  if (!stored) return true;
  if (stored === expected) return false;
  if (/^ad-\d+-/i.test(stored)) return true;
  if (imagePath?.includes("/copy-packs/") || imagePath?.includes("/angles/")) {
    return true;
  }
  return stored !== expected;
}

/** Build the expected safe filename for one ad variation. */
export function buildSafeFilenameForAd(
  massDesireNumber: number,
  angleLetter: string,
  ad: Pick<AdVariation, "headline">,
  angleName: string,
  adVariationIndex: number,
  extension: string
): string {
  const adName = buildAdName(
    massDesireNumber,
    angleLetter,
    buildAdDescription(ad, angleName)
  );
  let safeFilename = slugifyAdNameForFilename(adName, extension);
  if (adVariationIndex > 0) {
    const base = safeFilename.replace(/\.[^.]+$/, "");
    safeFilename = `${base}-ad-${adVariationIndex + 1}.${extension}`;
  }
  return safeFilename;
}

export function extensionFromVariation(ad: Partial<AdVariation>): string {
  if (ad.image_file_type) {
    const mime = ad.image_file_type.toLowerCase();
    if (mime.includes("png")) return "png";
    if (mime.includes("webp")) return "webp";
    if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  }
  const fromFilename = ad.image_filename?.split(".").pop()?.toLowerCase();
  if (fromFilename && ["png", "jpg", "jpeg", "webp"].includes(fromFilename)) {
    return fromFilename === "jpeg" ? "jpg" : fromFilename;
  }
  const fromPath = ad.image_path?.split(".").pop()?.toLowerCase();
  if (fromPath && ["png", "jpg", "jpeg", "webp"].includes(fromPath)) {
    return fromPath === "jpeg" ? "jpg" : fromPath;
  }
  return "png";
}

export interface AdNamingContext {
  massDesireNumber: number;
  angleLetter: string;
  description: string;
  adName: string;
  safeFilename: string;
}

/** Resolve stable ad naming for one variation inside a copy pack. */
export function resolveAdNaming(
  desires: MassDesire[],
  angles: MarketingAngle[],
  copySet: AdCopySet,
  ad: Pick<AdVariation, "headline">,
  adVariationIndex: number
): AdNamingContext {
  const sortedDesires = [...desires].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const desireIndex = sortedDesires.findIndex((d) => d.id === copySet.mass_desire_id);
  const massDesireNumber = getMassDesireNumber(Math.max(desireIndex, 0));

  const desireAngles = angles
    .filter((a) => a.mass_desire_id === copySet.mass_desire_id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const angleIndex = desireAngles.findIndex(
    (a) => a.id === copySet.marketing_angle_id
  );
  const angleLetter = getAngleLetter(Math.max(angleIndex, 0));
  const angleName =
    desireAngles[angleIndex]?.angle_name ??
    angles.find((a) => a.id === copySet.marketing_angle_id)?.angle_name ??
    "";

  const description = buildAdDescription(ad, angleName);
  const adName = buildAdName(massDesireNumber, angleLetter, description);
  const ext = extensionFromVariation(ad as AdVariation);
  let safeFilename = slugifyAdNameForFilename(adName, ext);

  // If multiple variations share one angle, keep filenames unique.
  if (adVariationIndex > 0) {
    const base = safeFilename.replace(/\.[^.]+$/, "");
    safeFilename = `${base}-ad-${adVariationIndex + 1}.${ext}`;
  }

  return {
    massDesireNumber,
    angleLetter,
    description,
    adName,
    safeFilename,
  };
}

/** Flatten all ad variations with uploaded images into final ad units. */
export function flattenFinalAds(
  desires: MassDesire[],
  angles: MarketingAngle[],
  copySets: AdCopySet[]
): FinalAd[] {
  const sortedDesires = [...desires].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const finalAds: FinalAd[] = [];

  for (const [desireIndex, desire] of sortedDesires.entries()) {
    const massDesireNumber = getMassDesireNumber(desireIndex);
    const desireAngles = angles
      .filter((a) => a.mass_desire_id === desire.id)
      .sort((a, b) => a.sort_order - b.sort_order);

    for (const [angleIndex, angle] of desireAngles.entries()) {
      const angleLetter = getAngleLetter(angleIndex);
      const copySet = copySets.find(
        (set) => set.marketing_angle_id === angle.id
      );
      if (!copySet?.ad_variations?.length) continue;

      copySet.ad_variations.forEach((rawAd, adVariationIndex) => {
        const ad = rawAd as AdVariation;
        if (!ad.image_url?.trim()) return;

        const description = buildAdDescription(ad, angle.angle_name);
        const adName = buildAdName(massDesireNumber, angleLetter, description);
        const ext = extensionFromVariation(ad);
        const safeFilename = buildSafeFilenameForAd(
          massDesireNumber,
          angleLetter,
          ad,
          angle.angle_name,
          adVariationIndex,
          ext
        );
        const needsFix = imageFilenameNeedsFix(
          safeFilename,
          ad.image_filename,
          ad.image_path
        );

        finalAds.push({
          ad_name: adName,
          safe_filename: safeFilename,
          mass_desire_index: massDesireNumber,
          angle_letter: angleLetter,
          ad_variation_index: adVariationIndex,
          primary: ad.primary ?? "",
          headline: ad.headline ?? "",
          description: ad.description ?? "",
          image_url: ad.image_url,
          image_path: ad.image_path,
          image_filename: ad.image_filename,
          needs_filename_fix: needsFix,
          copy_set_id: copySet.id,
          marketing_angle_id: angle.id,
          mass_desire_id: desire.id,
        });
      });
    }
  }

  return finalAds.sort((a, b) => {
    if (a.mass_desire_index !== b.mass_desire_index) {
      return a.mass_desire_index - b.mass_desire_index;
    }
    if (a.angle_letter !== b.angle_letter) {
      return a.angle_letter.localeCompare(b.angle_letter);
    }
    return a.ad_variation_index - b.ad_variation_index;
  });
}

/** Trigger a browser download using a safe filename (handles CORS when allowed). */
export async function downloadImageAs(
  imageUrl: string,
  filename: string
): Promise<void> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error("Could not download the image.");
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
