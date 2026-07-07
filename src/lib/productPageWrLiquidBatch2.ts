import type {
  ProductPageComparisonRow,
  ProductPageDocumentLink,
  ProductPageFaqItem,
  ProductPageSection,
} from "../types";
import { renderWrHeadlineH2 } from "./productPageWrLiquid";

const DEFAULT_GUARANTEE_SEAL =
  "https://cdn.shopify.com/s/files/1/0741/9609/1054/files/Guarantee.png?v=1780234306";

const DEFAULT_FAQ_ITEMS: ProductPageFaqItem[] = [
  {
    question: "Is this for blackheads?",
    answer:
      "This is a cosmetic peel off mask for dull, clogged looking skin and visible surface buildup. It is not an acne treatment, medicine, medical device, or clinical skin treatment.",
  },
  {
    question: "How often should I use it?",
    answer:
      "Use 1 to 2 times weekly, or when your skin feels dull, textured, or ready for a reset. Do not overuse it. Follow with moisturiser after peeling.",
  },
  {
    question: "Where should I apply it?",
    answer:
      "Focus on areas that tend to look congested, such as the nose, chin, and T zone. You do not need to apply it everywhere.",
  },
  {
    question: "Will it hurt to peel off?",
    answer:
      "Apply a thin, even layer and let it dry fully before peeling. Peel slowly from the edges. Avoid eyes, eyebrows, lips, hairline, facial hair, irritated skin, broken skin, and sunburnt skin.",
  },
  {
    question: "Can I use it before makeup?",
    answer:
      "Yes. Use it when skin feels dull or textured. After peeling, rinse away any residue, moisturise, and let your skin settle before applying makeup.",
  },
  {
    question: "Is this suitable for sensitive skin?",
    answer:
      "Patch test before first use. Do not use on highly sensitive, irritated, broken, or sunburnt skin. Stop use if irritation occurs.",
  },
  {
    question: "What does 24K Gold mean?",
    answer:
      "24K Gold is part of the supplier's product name and presentation. We do not claim that gold provides a therapeutic benefit.",
  },
  {
    question: "Is this another full skincare routine?",
    answer:
      "No. It is an occasional add on step. Cleanse first, apply the mask, peel gently once dry, rinse any residue, then moisturise.",
  },
];

const DEFAULT_CARE_ITEMS = [
  {
    title: "Patch test first",
    description:
      "Apply to a small area before first use. Stop using if irritation occurs.",
  },
  {
    title: "Avoid sensitive areas",
    description:
      "Keep away from eyes, eyebrows, lips, hairline, facial hair, broken skin, irritated skin, and sunburnt skin.",
  },
  {
    title: "Clear expectations",
    description:
      "This is not a medicine, acne treatment, medical device, or clinical skin treatment. Results vary by skin type.",
  },
];

const DEFAULT_DOCUMENT_LINKS: ProductPageDocumentLink[] = [
  {
    label: "MSDS",
    url: "https://cdn.shopify.com/s/files/1/0741/9609/1054/files/MSDS.pdf?v=1780135229",
  },
  {
    label: "FDA listing",
    url: "https://cdn.shopify.com/s/files/1/0741/9609/1054/files/FDA.pdf?v=1780135229",
  },
  {
    label: "UK SCPN",
    url: "https://cdn.shopify.com/s/files/1/0741/9609/1054/files/APEX_SCPN.pdf?v=1780135229",
  },
  {
    label: "EU CPNP",
    url: "https://cdn.shopify.com/s/files/1/0741/9609/1054/files/CPNP_LAIKOU_KOREA_SNAIL_PEEL_OFF_MASK.pdf?v=1780135228",
  },
];

const DEFAULT_COMPARISON_ROWS: ProductPageComparisonRow[] = [
  { feature: "Fresh enough to stop checking", left_mark: "yes", right_mark: "no" },
  { feature: "Visible peel off proof", left_mark: "yes", right_mark: "no" },
  { feature: "Nose and chin reset", left_mark: "yes", right_mark: "partial" },
  { feature: "No squeezing or picking", left_mark: "yes", right_mark: "no" },
  { feature: "No complicated routine", left_mark: "yes", right_mark: "partial" },
  { feature: "30 day money back guarantee", left_mark: "yes", right_mark: "no" },
];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function scrollButton(className: string, label: string): string {
  const text = label.trim() || "👉 Try It Now";
  return `<button type="button" class="${className}" onclick="window.scrollTo({ top: 0, behavior: 'smooth' });">
        ${escapeHtml(text)}
      </button>`;
}

function renderFaqItem(item: ProductPageFaqItem): string {
  return `<details class="wr_mask_faq_simple__item">
          <summary>
            <span>${escapeHtml(item.question)}</span>
            <span class="wr_mask_faq_simple__chevron">›</span>
          </summary>
          <div class="wr_mask_faq_simple__answer">
            <p>${escapeHtml(item.answer)}</p>
          </div>
        </details>`;
}

function resolveFaqItems(section: ProductPageSection): ProductPageFaqItem[] {
  const items = section.faq_items ?? [];
  return items.length > 0 ? items : DEFAULT_FAQ_ITEMS;
}

function resolveGuaranteeSealUrl(section: ProductPageSection): string {
  return section.shopify_image_url?.trim() || DEFAULT_GUARANTEE_SEAL;
}

function resolveCareItems(
  section: ProductPageSection
): { title: string; description: string }[] {
  if (section.care_items?.length) {
    return section.care_items.slice(0, 3);
  }

  const bullets = section.bullets ?? [];
  if (bullets.length > 0) {
    return bullets.slice(0, 3).map((bullet) => {
      const text = bullet.trim();
      const words = text.split(/\s+/).filter(Boolean);
      const title =
        words.length <= 4 ? text : words.slice(0, 4).join(" ");
      return { title, description: text };
    });
  }

  return DEFAULT_CARE_ITEMS;
}

function resolveDocumentLinks(section: ProductPageSection): ProductPageDocumentLink[] {
  const links = section.document_links ?? [];
  return links.length > 0 ? links : DEFAULT_DOCUMENT_LINKS;
}

function renderComparisonMark(mark: ProductPageComparisonRow["left_mark"]): string {
  switch (mark) {
    case "yes":
      return '<span class="wr-clean-reset-compare__yes" aria-label="Yes">✓</span>';
    case "no":
      return '<span class="wr-clean-reset-compare__no" aria-label="No">✕</span>';
    case "partial":
      return '<span class="wr-clean-reset-compare__partial" aria-label="Sometimes">–</span>';
    default:
      return '<span class="wr-clean-reset-compare__partial">–</span>';
  }
}

function resolveComparisonRows(section: ProductPageSection): ProductPageComparisonRow[] {
  if (section.comparison_rows?.length) {
    return section.comparison_rows;
  }

  const leftBullets = section.comparison_left_bullets ?? [];
  const rightBullets = section.comparison_right_bullets ?? [];
  const bulletFeatures = section.bullets ?? [];

  if (leftBullets.length > 0) {
    return leftBullets.map((feature, index) => ({
      feature,
      left_mark: "yes" as const,
      right_mark: rightBullets[index] ? ("no" as const) : ("partial" as const),
    }));
  }

  if (bulletFeatures.length > 0) {
    return bulletFeatures.map((feature, index) => ({
      feature,
      left_mark: DEFAULT_COMPARISON_ROWS[index]?.left_mark ?? "yes",
      right_mark: DEFAULT_COMPARISON_ROWS[index]?.right_mark ?? "no",
    }));
  }

  return DEFAULT_COMPARISON_ROWS;
}

export function maskFaqSimpleStyles(): string {
  return `
  .wr_mask_faq_simple,
  .wr_mask_faq_simple * {
    box-sizing: border-box;
    letter-spacing: normal;
    word-spacing: normal;
  }

  .wr_mask_faq_simple {
    width: 100%;
    padding: 42px 18px 46px;
    background: #f8f4ee;
    color: #181614;
  }

  .wr_mask_faq_simple__inner {
    max-width: 1040px;
    margin: 0 auto;
  }

  .wr_mask_faq_simple__header {
    text-align: center;
    margin: 0 0 24px;
  }

  .wr_mask_faq_simple__header h2 {
    margin: 0;
    color: #181614;
    font-size: clamp(24px, 2.6vw, 34px);
    line-height: 1.15;
    letter-spacing: -0.025em;
    font-weight: 850;
  }

  .wr_mask_faq_simple__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 28px;
  }

  .wr_mask_faq_simple__column {
    display: grid;
    align-content: start;
  }

  .wr_mask_faq_simple__item {
    border-bottom: 1px solid rgba(24, 22, 20, 0.18);
  }

  .wr_mask_faq_simple__item:first-child {
    border-top: 1px solid rgba(24, 22, 20, 0.18);
  }

  .wr_mask_faq_simple__item summary {
    min-height: 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 14px 0;
    cursor: pointer;
    list-style: none;
    color: #181614;
    font-size: 15.5px;
    line-height: 1.25;
    font-weight: 850;
  }

  .wr_mask_faq_simple__item summary::-webkit-details-marker {
    display: none;
  }

  .wr_mask_faq_simple__chevron {
    flex: 0 0 auto;
    color: #181614;
    font-size: 28px;
    line-height: 1;
    font-weight: 400;
    transform: translateY(-1px);
    transition: transform 0.18s ease;
  }

  .wr_mask_faq_simple__item[open] .wr_mask_faq_simple__chevron {
    transform: rotate(90deg) translateX(-1px);
  }

  .wr_mask_faq_simple__answer {
    padding: 0 34px 16px 0;
  }

  .wr_mask_faq_simple__answer p {
    max-width: 520px;
    margin: 0;
    color: rgba(24, 22, 20, 0.68);
    font-size: 13.5px;
    line-height: 1.55;
  }

  @media screen and (max-width: 760px) {
    .wr_mask_faq_simple {
      padding: 34px 14px 38px;
    }

    .wr_mask_faq_simple__header {
      margin-bottom: 20px;
    }

    .wr_mask_faq_simple__header h2 {
      font-size: 26px;
      line-height: 1.12;
    }

    .wr_mask_faq_simple__grid {
      grid-template-columns: 1fr;
      gap: 0;
    }

    .wr_mask_faq_simple__column + .wr_mask_faq_simple__column .wr_mask_faq_simple__item:first-child {
      border-top: 0;
    }

    .wr_mask_faq_simple__item summary {
      min-height: 46px;
      padding: 13px 0;
      font-size: 14.5px;
    }

    .wr_mask_faq_simple__answer {
      padding: 0 28px 15px 0;
    }

    .wr_mask_faq_simple__answer p {
      font-size: 13.2px;
      line-height: 1.52;
    }
  }`;
}

export function moneyBackStyles(): string {
  return `
  .wr_money_back,
  .wr_money_back * {
    box-sizing: border-box;
    letter-spacing: normal;
    word-spacing: normal;
  }

  .wr_money_back {
    width: 100%;
    padding: 40px 18px;
    background: #ffffff;
    color: #181614;
    text-align: center;
  }

  .wr_money_back__inner {
    max-width: 820px;
    margin: 0 auto;
  }

  .wr_money_back__seal {
    display: flex;
    justify-content: center;
    margin-bottom: 14px;
  }

  .wr_money_back__seal img {
    display: block;
    width: 100px;
    height: 100px;
    object-fit: contain;
  }

  .wr_money_back__subheading {
    margin: 0 0 6px;
    color: #181614;
    font-size: 22px;
    line-height: 1.22;
    font-weight: 400;
  }

  .wr_money_back h2 {
    margin: 0 0 10px;
    color: #181614;
    font-size: clamp(26px, 2.8vw, 34px);
    line-height: 1.15;
    font-weight: 850;
    letter-spacing: -0.02em;
  }

  .wr_money_back__copy {
    max-width: 760px;
    margin: 0 auto;
    color: rgba(24, 22, 20, 0.82);
    font-size: 17px;
    line-height: 1.55;
  }

  .wr_money_back__copy strong {
    color: #181614;
    font-weight: 850;
  }

  @media screen and (max-width: 640px) {
    .wr_money_back {
      padding: 34px 16px;
    }

    .wr_money_back__seal {
      margin-bottom: 12px;
    }

    .wr_money_back__seal img {
      width: 92px;
      height: 92px;
    }

    .wr_money_back__subheading {
      font-size: 20px;
      margin-bottom: 5px;
    }

    .wr_money_back h2 {
      font-size: 25px;
      line-height: 1.18;
      margin-bottom: 9px;
    }

    .wr_money_back__copy {
      font-size: 15px;
      line-height: 1.55;
    }
  }`;
}

export function useCareCompactStyles(): string {
  return `
  .wr_use_care_compact,
  .wr_use_care_compact * {
    box-sizing: border-box;
    letter-spacing: normal;
    word-spacing: normal;
  }

  .wr_use_care_compact {
    width: 100%;
    padding: 34px 18px;
    background: #f8f4ee;
    color: #181614;
  }

  .wr_use_care_compact__inner {
    max-width: 940px;
    margin: 0 auto;
    padding: 24px 26px;
    background: #fffaf4;
    border: 1px solid rgba(121, 87, 45, 0.13);
    border-radius: 16px;
  }

  .wr_use_care_compact__header {
    display: grid;
    grid-template-columns: 0.7fr 1.3fr;
    gap: 24px;
    align-items: start;
    padding-bottom: 18px;
    border-bottom: 1px solid rgba(121, 87, 45, 0.13);
  }

  .wr_use_care_compact__header h2 {
    margin: 0;
    color: #181614;
    font-size: clamp(24px, 2.6vw, 32px);
    line-height: 1.08;
    letter-spacing: -0.035em;
    font-weight: 850;
  }

  .wr_use_care_compact__header p {
    margin: 2px 0 0;
    color: rgba(24, 22, 20, 0.72);
    font-size: 14px;
    line-height: 1.55;
  }

  .wr_use_care_compact__grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
    padding: 18px 0;
    border-bottom: 1px solid rgba(121, 87, 45, 0.13);
  }

  .wr_use_care_compact__item h3 {
    margin: 0 0 6px;
    color: #181614;
    font-size: 13.5px;
    line-height: 1.25;
    font-weight: 850;
  }

  .wr_use_care_compact__item p {
    margin: 0;
    color: rgba(24, 22, 20, 0.66);
    font-size: 12.5px;
    line-height: 1.48;
  }

  .wr_use_care_compact__docs {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: center;
    padding-top: 16px;
  }

  .wr_use_care_compact__docs span {
    color: rgba(24, 22, 20, 0.62);
    font-size: 12px;
    line-height: 1.4;
  }

  .wr_use_care_compact__links {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }

  .wr_use_care_compact__links a {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 7px 10px;
    background: #ffffff;
    border: 1px solid rgba(121, 87, 45, 0.16);
    border-radius: 999px;
    color: #8a6231;
    font-size: 11.5px;
    line-height: 1;
    font-weight: 750;
    text-decoration: none;
  }

  .wr_use_care_compact__links a:hover {
    background: rgba(184, 135, 66, 0.08);
    color: #181614;
  }

  @media screen and (max-width: 780px) {
    .wr_use_care_compact {
      padding: 30px 14px;
    }

    .wr_use_care_compact__inner {
      padding: 20px 16px;
      border-radius: 14px;
    }

    .wr_use_care_compact__header {
      grid-template-columns: 1fr;
      gap: 8px;
      padding-bottom: 16px;
    }

    .wr_use_care_compact__header h2 {
      font-size: 27px;
      line-height: 1.06;
    }

    .wr_use_care_compact__header p {
      font-size: 13.5px;
      line-height: 1.5;
    }

    .wr_use_care_compact__grid {
      grid-template-columns: 1fr;
      gap: 14px;
      padding: 16px 0;
    }

    .wr_use_care_compact__item p {
      font-size: 12.5px;
      line-height: 1.5;
    }

    .wr_use_care_compact__docs {
      display: block;
      padding-top: 14px;
    }

    .wr_use_care_compact__links {
      justify-content: flex-start;
      margin-top: 10px;
    }
  }`;
}

export function cleanResetCompareStyles(): string {
  return `
  .wr-clean-reset-compare,
  .wr-clean-reset-compare * {
    box-sizing: border-box;
    letter-spacing: normal;
    word-spacing: normal;
  }

  .wr-clean-reset-compare {
    width: 100%;
    padding: 46px 18px 50px;
    background: #ffffff;
    color: #181614;
  }

  .wr-clean-reset-compare__inner {
    max-width: 920px;
    margin: 0 auto;
  }

  .wr-clean-reset-compare__header {
    max-width: 760px;
    margin: 0 auto 28px;
    text-align: center;
  }

  .wr-clean-reset-compare__header h2 {
    margin: 0 0 10px;
    color: #181614;
    font-size: clamp(28px, 3vw, 38px);
    line-height: 1.06;
    letter-spacing: -0.04em;
    font-weight: 850;
  }

  .wr-clean-reset-compare__header h2 span {
    color: #c58b38;
  }

  .wr-clean-reset-compare__header p {
    margin: 0;
    color: rgba(24, 22, 20, 0.76);
    font-size: 15px;
    line-height: 1.62;
  }

  .wr-clean-reset-compare__table {
    display: grid;
    grid-template-columns: 1.3fr 0.85fr 0.85fr;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 10px 28px rgba(24, 22, 20, 0.1);
  }

  .wr-clean-reset-compare__desktop {
    margin: 0 auto;
  }

  .wr-clean-reset-compare__cell {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 52px;
    padding: 12px 14px;
    border-bottom: 1px solid rgba(24, 22, 20, 0.08);
    font-size: 14px;
    line-height: 1.35;
    text-align: center;
  }

  .wr-clean-reset-compare__cell--feature {
    justify-content: flex-start;
    text-align: left;
    background: #222b31;
    color: #ffffff;
    font-weight: 750;
    border-bottom-color: rgba(255, 255, 255, 0.08);
  }

  .wr-clean-reset-compare__cell--head {
    background: #181614;
    color: #ffffff;
    font-weight: 850;
    font-size: 13.5px;
    letter-spacing: -0.01em;
  }

  .wr-clean-reset-compare__cell--head-feature {
    background: #222b31;
  }

  .wr-clean-reset-compare__cell--mark {
    background: #ffffff;
    font-size: 20px;
    font-weight: 900;
  }

  .wr-clean-reset-compare__yes {
    color: #1f6b3a;
  }

  .wr-clean-reset-compare__no {
    color: #a34444;
  }

  .wr-clean-reset-compare__partial {
    color: rgba(24, 22, 20, 0.45);
  }

  .wr-clean-reset-compare__mobile {
    display: none;
  }

  .wr-clean-reset-compare__action {
    margin-top: 24px;
    text-align: center;
  }

  .wr-clean-reset-compare__button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0 22px;
    border: 0;
    border-radius: 7px;
    background: #222b31;
    color: #ffffff;
    font-size: 14px;
    line-height: 1;
    font-weight: 850;
    cursor: pointer;
    box-shadow: 0 8px 18px rgba(24, 22, 20, 0.14);
  }

  .wr-clean-reset-compare__note {
    margin: 10px 0 0;
    color: rgba(24, 22, 20, 0.58);
    font-size: 12px;
    line-height: 1.42;
  }

  @media screen and (max-width: 760px) {
    .wr-clean-reset-compare {
      padding: 36px 14px 40px;
    }

    .wr-clean-reset-compare__header h2 {
      font-size: 28px;
    }

    .wr-clean-reset-compare__header p {
      font-size: 13.8px;
      line-height: 1.55;
    }

    .wr-clean-reset-compare__desktop {
      display: none;
    }

    .wr-clean-reset-compare__mobile {
      display: grid;
      gap: 12px;
    }

    .wr-clean-reset-compare__card {
      background: #f8f4ee;
      border: 1px solid rgba(24, 22, 20, 0.1);
      border-radius: 12px;
      padding: 14px 16px;
    }

    .wr-clean-reset-compare__card h3 {
      margin: 0 0 10px;
      font-size: 15px;
      line-height: 1.25;
      font-weight: 850;
      color: #181614;
    }

    .wr-clean-reset-compare__card-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
      border-top: 1px solid rgba(24, 22, 20, 0.1);
      font-size: 13.5px;
    }

    .wr-clean-reset-compare__card-row span:first-child {
      color: rgba(24, 22, 20, 0.72);
      font-weight: 700;
    }
  }`;
}

export function renderFaqLiquid(section: ProductPageSection): string {
  const items = resolveFaqItems(section);
  const midpoint = Math.ceil(items.length / 2);
  const leftColumn = items.slice(0, midpoint).map(renderFaqItem).join("\n\n        ");
  const rightColumn = items.slice(midpoint).map(renderFaqItem).join("\n\n        ");
  const headline =
    section.headline?.trim() || "Frequently Asked Questions";

  return `<section class="wr_mask_faq_simple">
  <div class="wr_mask_faq_simple__inner">
    <div class="wr_mask_faq_simple__header">
      <h2>${escapeHtml(headline)}</h2>
    </div>
    <div class="wr_mask_faq_simple__grid">
      <div class="wr_mask_faq_simple__column">
        ${leftColumn}
      </div>
      <div class="wr_mask_faq_simple__column">
        ${rightColumn}
      </div>
    </div>
  </div>
</section>
<style>${maskFaqSimpleStyles()}</style>`;
}

export function renderGuaranteeLiquid(section: ProductPageSection): string {
  const sealUrl = resolveGuaranteeSealUrl(section);
  const subheading =
    section.subheading?.trim() ||
    section.proof_line?.trim() ||
    "No Questions Asked";
  const headline =
    section.headline?.trim() || "60 Day Money Back Guarantee";
  const productName = section.product_name?.trim() || "the product";

  const copyBlock =
    section.body_paragraphs?.length &&
    section.body_paragraphs.some((p) => p.trim())
      ? `<p class="wr_money_back__copy">${escapeHtml(section.body_paragraphs.join(" "))}</p>`
      : `<p class="wr_money_back__copy">Try the <strong>${escapeHtml(productName)}</strong> with confidence. If it is not for you, just send back the <strong>unused portion within 60 days</strong> and we will <strong>refund your order.</strong></p>`;

  return `<section class="wr_money_back">
  <div class="wr_money_back__inner">
    <div class="wr_money_back__seal" aria-hidden="true">
      <img src="${escapeHtml(sealUrl)}" alt="60 day money back guarantee" width="100" height="100" loading="lazy" />
    </div>
    <p class="wr_money_back__subheading">${escapeHtml(subheading)}</p>
    <h2>${escapeHtml(headline)}</h2>
    ${copyBlock}
  </div>
</section>
<style>${moneyBackStyles()}</style>`;
}

export function renderCareDisclaimerLiquid(section: ProductPageSection): string {
  const headline = section.headline?.trim() || "Use with care.";
  const intro =
    section.body_paragraphs?.[0]?.trim() ||
    "A cosmetic peel off mask for occasional reset days. Simple to use, but best used gently.";
  const careItems = resolveCareItems(section);
  const documentLinks = resolveDocumentLinks(section);

  const careGrid = careItems
    .map(
      (item) => `<div class="wr_use_care_compact__item">
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
      </div>`
    )
    .join("\n\n      ");

  const linkPills = documentLinks
    .map(
      (link) =>
        `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`
    )
    .join("\n        ");

  return `<section class="wr_use_care_compact">
  <div class="wr_use_care_compact__inner">
    <div class="wr_use_care_compact__header">
      <h2>${escapeHtml(headline)}</h2>
      <p>${escapeHtml(intro)}</p>
    </div>
    <div class="wr_use_care_compact__grid">
      ${careGrid}
    </div>
    <div class="wr_use_care_compact__docs">
      <span>Product documents</span>
      <div class="wr_use_care_compact__links">
        ${linkPills}
      </div>
    </div>
  </div>
</section>
<style>${useCareCompactStyles()}</style>`;
}

export function renderComparisonLiquid(section: ProductPageSection): string {
  const rows = resolveComparisonRows(section);
  const leftColumn =
    section.comparison_columns?.left?.trim() ||
    section.comparison_left_title?.trim() ||
    "Pore Reset Mask";
  const rightColumn =
    section.comparison_columns?.right?.trim() ||
    section.comparison_right_title?.trim() ||
    "Cleansing Alone";
  const intro =
    section.body_paragraphs?.[0]?.trim() ||
    "A peel off reset step for the days when cleansing alone still leaves skin looking dull, textured, or not quite fresh enough.";
  const accent = section.accent_headline?.trim() || "different?";
  const headline = section.headline?.trim() || "What makes it different?";
  const note =
    section.small_print?.trim() ||
    "Cosmetic peel off mask. Results vary by skin type.";

  const desktopCells = [
    `<div class="wr-clean-reset-compare__cell wr-clean-reset-compare__cell--head wr-clean-reset-compare__cell--head-feature"></div>`,
    `<div class="wr-clean-reset-compare__cell wr-clean-reset-compare__cell--head">${escapeHtml(leftColumn)}</div>`,
    `<div class="wr-clean-reset-compare__cell wr-clean-reset-compare__cell--head">${escapeHtml(rightColumn)}</div>`,
    ...rows.flatMap(
      (row) => [
        `<div class="wr-clean-reset-compare__cell wr-clean-reset-compare__cell--feature">${escapeHtml(row.feature)}</div>`,
        `<div class="wr-clean-reset-compare__cell wr-clean-reset-compare__cell--mark">${renderComparisonMark(row.left_mark)}</div>`,
        `<div class="wr-clean-reset-compare__cell wr-clean-reset-compare__cell--mark">${renderComparisonMark(row.right_mark)}</div>`,
      ]
    ),
  ].join("\n      ");

  const mobileCards = rows
    .map(
      (row) => `<article class="wr-clean-reset-compare__card">
        <h3>${escapeHtml(row.feature)}</h3>
        <div class="wr-clean-reset-compare__card-row">
          <span>${escapeHtml(leftColumn)}</span>
          ${renderComparisonMark(row.left_mark)}
        </div>
        <div class="wr-clean-reset-compare__card-row">
          <span>${escapeHtml(rightColumn)}</span>
          ${renderComparisonMark(row.right_mark)}
        </div>
      </article>`
    )
    .join("\n      ");

  return `<section class="wr-clean-reset-compare">
  <div class="wr-clean-reset-compare__inner">
    <div class="wr-clean-reset-compare__header">
      ${renderWrHeadlineH2(headline, accent)}
      <p>${escapeHtml(intro)}</p>
    </div>
    <div class="wr-clean-reset-compare__desktop">
      <div class="wr-clean-reset-compare__table">
      ${desktopCells}
      </div>
    </div>
    <div class="wr-clean-reset-compare__mobile">
      ${mobileCards}
    </div>
    <div class="wr-clean-reset-compare__action">
      ${scrollButton("wr-clean-reset-compare__button", section.button_label ?? "👉 Try It Now")}
      <p class="wr-clean-reset-compare__note">${escapeHtml(note)}</p>
    </div>
  </div>
</section>
<style>${cleanResetCompareStyles()}</style>`;
}

export function wrPreviewStylesBatch2(): string {
  return [
    maskFaqSimpleStyles(),
    moneyBackStyles(),
    useCareCompactStyles(),
    cleanResetCompareStyles(),
  ].join("\n");
}

export function getFaqItemsForPreview(section: ProductPageSection): ProductPageFaqItem[] {
  return resolveFaqItems(section);
}

export function getCareItemsForPreview(
  section: ProductPageSection
): { title: string; description: string }[] {
  return resolveCareItems(section);
}

export function getDocumentLinksForPreview(
  section: ProductPageSection
): ProductPageDocumentLink[] {
  return resolveDocumentLinks(section);
}

export function getComparisonRowsForPreview(
  section: ProductPageSection
): ProductPageComparisonRow[] {
  return resolveComparisonRows(section);
}
