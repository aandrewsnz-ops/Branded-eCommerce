import type { ProductPageContent, ProductPageSection } from "../types";
import {
  renderRitualLiquid,
  renderBenefitsGridLiquid,
  renderHowToUseLiquid,
  renderSocialProofLiquid,
  renderWrHeadlineH2,
} from "./productPageWrLiquid";
import {
  renderFaqLiquid,
  renderGuaranteeLiquid,
  renderCareDisclaimerLiquid,
  renderComparisonLiquid,
} from "./productPageWrLiquidBatch2";

const IMAGE_PLACEHOLDER = "REPLACE_WITH_SHOPIFY_IMAGE_URL";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resolveImageUrl(section: ProductPageSection): string {
  const url = section.shopify_image_url?.trim();
  return url || IMAGE_PLACEHOLDER;
}

function renderHeadline(section: ProductPageSection): string {
  const headline = section.headline?.trim() ?? "";
  const accent = section.accent_headline?.trim();
  if (!headline) return "";
  if (!accent) return escapeHtml(headline);

  const lowerHeadline = headline.toLowerCase();
  const lowerAccent = accent.toLowerCase();
  const index = lowerHeadline.indexOf(lowerAccent);
  if (index < 0) {
    return `${escapeHtml(headline)} <span class="pp-gold">${escapeHtml(accent)}</span>`;
  }

  const before = headline.slice(0, index);
  const match = headline.slice(index, index + accent.length);
  const after = headline.slice(index + accent.length);
  return `${escapeHtml(before)}<span class="pp-gold">${escapeHtml(match)}</span>${escapeHtml(after)}`;
}

function baseStyles(rootClass: string): string {
  return `
.${rootClass} {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #1a1a1a;
  line-height: 1.55;
  box-sizing: border-box;
}
.${rootClass} *, .${rootClass} *::before, .${rootClass} *::after {
  box-sizing: border-box;
}
.${rootClass} .pp-wrap {
  max-width: 720px;
  margin: 0 auto;
  padding: 32px 20px;
}
.${rootClass}.pp-cream {
  background: #f9f5ef;
}
.${rootClass}.pp-white {
  background: #ffffff;
}
.${rootClass} .pp-headline {
  margin: 0 0 12px;
  font-size: clamp(1.65rem, 4vw, 2.25rem);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: #111111;
}
.${rootClass} .pp-gold {
  color: #c9a227;
}
.${rootClass} .pp-proof-line {
  margin: 0 0 14px;
  font-size: 1rem;
  font-weight: 600;
  color: #3d3d3d;
}
.${rootClass} .pp-body {
  margin: 0 0 12px;
  font-size: 1rem;
  color: #333333;
}
.${rootClass} .pp-body:last-child {
  margin-bottom: 0;
}
.${rootClass} .pp-bullets {
  margin: 14px 0 0;
  padding-left: 1.15rem;
  color: #333333;
}
.${rootClass} .pp-bullets li {
  margin-bottom: 8px;
}
.${rootClass} .pp-img-card {
  margin: 20px 0;
  border-radius: 16px;
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}
.${rootClass} .pp-img-card img {
  display: block;
  width: 100%;
  height: auto;
  object-fit: cover;
}
.${rootClass} .pp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 18px;
  padding: 14px 24px;
  border: none;
  border-radius: 999px;
  background: #1a1a1a;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}
.${rootClass} .pp-small {
  margin-top: 14px;
  font-size: 0.75rem;
  line-height: 1.45;
  color: #666666;
}
@media (max-width: 640px) {
  .${rootClass} .pp-wrap {
    padding: 24px 16px;
  }
}`;
}

function resolveImageAlt(section: ProductPageSection): string {
  const alt = section.image_alt?.trim();
  if (alt) return alt;
  return section.headline?.trim() || "Product proof image";
}

const DEFAULT_PROOF_QUOTE = "My skin felt softer after peeling it off.";

/** Strip star glyphs and normalize quote text for proof-line export. */
function parseProofLineQuote(proofLine?: string): string {
  if (!proofLine?.trim()) return DEFAULT_PROOF_QUOTE;

  let text = proofLine.trim().replace(/★+/g, "").trim();
  text = text.replace(/^[“"']+\s*/, "").replace(/\s*[”"']+$/, "").trim();

  return text || DEFAULT_PROOF_QUOTE;
}

function renderProofLineBlock(proofLine?: string): string {
  const quote = parseProofLineQuote(proofLine);
  return `<div class="wr-proof-intro__proof-line">
      <div class="wr_feedback_pattern__proof_line">
        <span class="wr_feedback_pattern__stars">★★★★★</span>
        <em>“${escapeHtml(quote)}”</em>
      </div>
    </div>`;
}

function proofIntroStyles(): string {
  return `
.wr-proof-intro {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: #f8f4ee;
  color: #181614;
  line-height: 1.55;
  box-sizing: border-box;
}
.wr-proof-intro *, .wr-proof-intro *::before, .wr-proof-intro *::after {
  box-sizing: border-box;
}
.wr-proof-intro__inner {
  max-width: 1040px;
  margin: 0 auto;
  padding: 56px 24px;
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(360px, 0.88fr);
  gap: 44px;
  align-items: center;
}
.wr-proof-intro__copy h2 {
  margin: 0 0 16px;
  font-size: clamp(30px, 3.3vw, 42px);
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -0.02em;
  color: #181614;
}
.wr-proof-intro__copy p {
  margin: 0 0 14px;
  font-size: 1rem;
  color: #333333;
}
.wr_feedback_pattern__proof_line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 0.98rem;
  color: #3d3d3d;
}
.wr_feedback_pattern__stars {
  color: #c58b2b;
  letter-spacing: 0.05em;
  font-style: normal;
}
.wr_feedback_pattern__proof_line em {
  font-style: italic;
  font-weight: 500;
}
.wr-proof-intro__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 18px;
  padding: 14px 28px;
  border: none;
  border-radius: 7px;
  background: #222b31;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}
.wr-proof-intro__small {
  margin: 14px 0 0;
  font-size: 0.75rem;
  line-height: 1.45;
  color: #666666;
}
.wr-proof-intro__media img {
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
  object-position: center;
  border-radius: 14px;
  box-shadow: 0 10px 24px rgba(24, 22, 20, 0.12);
  background: #ffffff;
}
@media (max-width: 768px) {
  .wr-proof-intro__inner {
    grid-template-columns: 1fr;
    padding: 40px 18px;
    gap: 28px;
  }
  .wr-proof-intro__media {
    order: -1;
  }
  .wr-proof-intro__media img {
    border-radius: 13px;
  }
}`;
}

function renderProofIntro(section: ProductPageSection): string {
  const imageUrl = resolveImageUrl(section);
  const imageAlt = resolveImageAlt(section);
  const paragraphs = (section.body_paragraphs ?? [])
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("\n    ");
  const buttonLabel = section.button_label?.trim() || "👉 Try It Now";
  const smallPrint = section.small_print?.trim()
    ? `<p class="wr-proof-intro__small">${escapeHtml(section.small_print)}</p>`
    : "";
  const imageBlock = section.image_required
    ? `<div class="wr-proof-intro__media">
      <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(imageAlt)}" loading="lazy" />
    </div>`
    : "";

  return `<section class="wr-proof-intro">
  <div class="wr-proof-intro__inner">
    <div class="wr-proof-intro__copy">
      ${renderProofLineBlock(section.proof_line)}
      <h2>${escapeHtml(section.headline?.trim() ?? "")}</h2>
      ${paragraphs}
      <button type="button" class="wr-proof-intro__button" onclick="window.scrollTo({ top: 0, behavior: 'smooth' });">
        ${escapeHtml(buttonLabel)}
      </button>
      ${smallPrint}
    </div>
    ${imageBlock}
  </div>
</section>
<style>${proofIntroStyles()}</style>`;
}

function renderRitual(section: ProductPageSection): string {
  return renderRitualLiquid(section);
}

function renderBenefitsGrid(section: ProductPageSection): string {
  return renderBenefitsGridLiquid(section);
}

function renderHowToUse(section: ProductPageSection): string {
  return renderHowToUseLiquid(section);
}

function renderSocialProof(section: ProductPageSection): string {
  return renderSocialProofLiquid(section);
}

function renderComparison(section: ProductPageSection): string {
  return renderComparisonLiquid(section);
}

function renderFaq(section: ProductPageSection): string {
  return renderFaqLiquid(section);
}

function renderGuarantee(section: ProductPageSection): string {
  return renderGuaranteeLiquid(section);
}

function renderCareDisclaimer(section: ProductPageSection): string {
  return renderCareDisclaimerLiquid(section);
}

function renderReviews(section: ProductPageSection): string {
  const root = `pp-${section.id}`;
  const imageUrl = resolveImageUrl(section);
  const cards = (section.testimonials ?? []).map(
    (item) =>
      `<blockquote class="pp-review"><p>“${escapeHtml(item.quote)}”</p><cite>— ${escapeHtml(item.attribution)}</cite></blockquote>`
  );
  const imageBlock = section.image_required
    ? `<div class="pp-img-card"><img src="${escapeHtml(imageUrl)}" alt="Customer reviews" loading="lazy" /></div>`
    : "";

  return `<section class="${root} pp-white">
  <div class="pp-wrap">
    <h2 class="pp-headline">${renderHeadline(section)}</h2>
    ${imageBlock}
    <div class="pp-reviews">${cards.join("")}</div>
  </div>
</section>
<style>
${baseStyles(root)}
.${root} .pp-reviews { display: grid; gap: 12px; margin-top: 16px; }
.${root} .pp-review { margin: 0; padding: 14px; border-radius: 12px; background: #f9f5ef; border: 1px solid #ece5d8; }
.${root} .pp-review p { margin: 0 0 8px; font-style: italic; }
.${root} .pp-review cite { font-size: 0.85rem; color: #666; font-style: normal; }
</style>`;
}

export function getProofLineQuote(proofLine?: string): string {
  return parseProofLineQuote(proofLine);
}

/** Render full standalone Custom Liquid for one product page section. */
export function renderProductPageSectionLiquid(
  section: ProductPageSection
): string {
  switch (section.section_type) {
    case "proof_intro":
      return renderProofIntro(section);
    case "ritual":
      return renderRitual(section);
    case "benefits_grid":
      return renderBenefitsGrid(section);
    case "how_to_use":
      return renderHowToUse(section);
    case "social_proof":
      return renderSocialProof(section);
    case "comparison":
      return renderComparison(section);
    case "faq":
      return renderFaq(section);
    case "guarantee":
      return renderGuarantee(section);
    case "reviews":
      return renderReviews(section);
    case "care_disclaimer":
      return renderCareDisclaimer(section);
    default:
      return renderProofIntro(section);
  }
}

/** Attach regenerated Custom Liquid to every section in page content. */
export function hydrateProductPageContent(
  content: ProductPageContent
): ProductPageContent {
  return {
    ...content,
    sections: content.sections.map((section) => ({
      ...section,
      custom_liquid: renderProductPageSectionLiquid(section),
    })),
  };
}

export { IMAGE_PLACEHOLDER, renderWrHeadlineH2 };
