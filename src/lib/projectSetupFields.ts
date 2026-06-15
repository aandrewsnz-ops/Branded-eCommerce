import type { ProductProject, ProductProjectInput } from "../types";

export const YOUR_STORE_NAME_MAX = 120;
export const YOUR_STORE_URL_MAX = 250;

export type ProductProjectUpdate = ProductProjectInput & {
  your_store_logo_url?: string | null;
  your_store_logo_path?: string | null;
  your_store_logo_filename?: string | null;
  your_store_logo_uploaded_at?: string | null;
};

export function normalizeOptionalString(
  value: string | null | undefined
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function normalizeOptionalTimestamp(
  value: string | null | undefined
): string | null {
  return normalizeOptionalString(value);
}

export function sanitizeYourStoreLogoFields(
  input: Pick<
    ProductProjectUpdate,
    | "your_store_logo_url"
    | "your_store_logo_path"
    | "your_store_logo_filename"
    | "your_store_logo_uploaded_at"
  >
): {
  your_store_logo_url: string | null;
  your_store_logo_path: string | null;
  your_store_logo_filename: string | null;
  your_store_logo_uploaded_at: string | null;
} {
  return {
    your_store_logo_url: normalizeOptionalString(input.your_store_logo_url),
    your_store_logo_path: normalizeOptionalString(input.your_store_logo_path),
    your_store_logo_filename: normalizeOptionalString(
      input.your_store_logo_filename
    ),
    your_store_logo_uploaded_at: normalizeOptionalTimestamp(
      input.your_store_logo_uploaded_at
    ),
  };
}

export function trimYourStoreName(value: string): string {
  return value.trim().slice(0, YOUR_STORE_NAME_MAX);
}

export function normalizeYourStoreUrl(value: string): string {
  const trimmed = value.trim().slice(0, YOUR_STORE_URL_MAX);
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Display-friendly URL without protocol for summaries. */
export function displayYourStoreUrl(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  return value.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

export function projectToSetupDraft(project: ProductProject): ProductProjectUpdate {
  return {
    our_product_name: project.our_product_name ?? "",
    supplier_product_url: project.supplier_product_url ?? "",
    supplier_product_description: project.supplier_product_description ?? "",
    primary_competitor_url: project.primary_competitor_url ?? "",
    additional_competitor_urls: project.additional_competitor_urls ?? "",
    closest_competitor_product_description:
      project.closest_competitor_product_description ?? "",
    target_country: project.target_country ?? "",
    cost_price_including_shipping: project.cost_price_including_shipping ?? "",
    planned_sale_price: project.planned_sale_price ?? "",
    current_offer: project.current_offer ?? "",
    initial_problem_hypothesis: project.initial_problem_hypothesis ?? "",
    initial_customer_hypothesis: project.initial_customer_hypothesis ?? "",
    preferred_tone: project.preferred_tone ?? "",
    your_store_name: project.your_store_name ?? "",
    your_store_url: project.your_store_url ?? "",
    your_store_logo_url: project.your_store_logo_url ?? null,
    your_store_logo_path: project.your_store_logo_path ?? null,
    your_store_logo_filename: project.your_store_logo_filename ?? null,
    your_store_logo_uploaded_at: project.your_store_logo_uploaded_at ?? null,
  };
}

export function sanitizeSetupUpdate(input: ProductProjectUpdate): ProductProjectUpdate {
  const result: ProductProjectUpdate = {
    ...input,
    our_product_name: input.our_product_name.trim(),
    supplier_product_url: input.supplier_product_url.trim(),
    supplier_product_description: input.supplier_product_description.trim(),
    primary_competitor_url: input.primary_competitor_url.trim(),
    additional_competitor_urls: input.additional_competitor_urls.trim(),
    closest_competitor_product_description:
      input.closest_competitor_product_description.trim(),
    target_country: input.target_country.trim(),
    cost_price_including_shipping: input.cost_price_including_shipping.trim(),
    planned_sale_price: input.planned_sale_price.trim(),
    current_offer: input.current_offer.trim(),
    initial_problem_hypothesis: input.initial_problem_hypothesis.trim(),
    initial_customer_hypothesis: input.initial_customer_hypothesis.trim(),
    preferred_tone: input.preferred_tone.trim(),
    your_store_name: trimYourStoreName(input.your_store_name),
    your_store_url: normalizeYourStoreUrl(input.your_store_url),
  };

  if (
    "your_store_logo_url" in input ||
    "your_store_logo_path" in input ||
    "your_store_logo_filename" in input ||
    "your_store_logo_uploaded_at" in input
  ) {
    Object.assign(result, sanitizeYourStoreLogoFields(input));
  }

  return result;
}
