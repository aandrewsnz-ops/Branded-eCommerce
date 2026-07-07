import type { ProductPageSection, ProductPageSectionType } from "../types";

const SECTION_FILE_PREFIX: Record<ProductPageSectionType, string> = {
  proof_intro: "proof",
  ritual: "ritual",
  benefits_grid: "benefits",
  how_to_use: "steps",
  social_proof: "social-proof",
  comparison: "comparison",
  faq: "faq",
  guarantee: "guarantee",
  reviews: "reviews",
  care_disclaimer: "care",
};

export function slugifyForFilename(text: string, maxLen = 48): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) return "section";
  return slug.length <= maxLen ? slug : slug.slice(0, maxLen).replace(/-+$/, "");
}

/** Deterministic export filename for a product page section image. */
export function buildProductPageImageFilename(
  section: Pick<
    ProductPageSection,
    "order" | "section_type" | "headline" | "section_title"
  >
): string {
  const prefix = SECTION_FILE_PREFIX[section.section_type];
  const slugSource = section.headline?.trim() || section.section_title?.trim();
  const slug = slugifyForFilename(slugSource);
  return `${prefix}-${section.order}-${slug}.jpg`;
}
