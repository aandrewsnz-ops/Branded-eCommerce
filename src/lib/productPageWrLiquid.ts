import {
  wrPreviewStylesBatch2,
} from "./productPageWrLiquidBatch2";
import type { ProductPageBenefitItem, ProductPageSection } from "../types";

const IMAGE_PLACEHOLDER = "REPLACE_WITH_SHOPIFY_IMAGE_URL";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resolveImageUrl(section: ProductPageSection): string {
  return section.shopify_image_url?.trim() || IMAGE_PLACEHOLDER;
}

function resolveImageAlt(section: ProductPageSection): string {
  return (
    section.image_alt?.trim() ||
    section.headline?.trim() ||
    "Product image"
  );
}

function parseProofLineQuote(proofLine?: string): string {
  const fallback =
    "It didn't erase my pores, but they looked less congested after using it.";
  if (!proofLine?.trim()) return fallback;

  let text = proofLine.trim().replace(/★+/g, "").trim();
  text = text.replace(/^[“"']+\s*/, "").replace(/\s*[”"']+$/, "").trim();
  return text || fallback;
}

/** Wrap accent phrase in span for Westward Reserve h2 styling. */
export function renderWrHeadlineH2(
  headline: string,
  accent?: string
): string {
  const h = headline.trim();
  const acc = accent?.trim();
  if (!h) return "<h2></h2>";
  if (!acc) return `<h2>${escapeHtml(h)}</h2>`;

  const lowerH = h.toLowerCase();
  const lowerA = acc.toLowerCase();
  const index = lowerH.indexOf(lowerA);

  if (index < 0) {
    return `<h2><span>${escapeHtml(acc)}</span> ${escapeHtml(h)}</h2>`;
  }

  const before = h.slice(0, index);
  const match = h.slice(index, index + acc.length);
  const after = h.slice(index + acc.length);
  return `<h2>${escapeHtml(before)}<span>${escapeHtml(match)}</span>${escapeHtml(after)}</h2>`;
}

function scrollButton(className: string, label: string): string {
  const text = label.trim() || "👉 Try It Now";
  return `<button type="button" class="${className}" onclick="window.scrollTo({ top: 0, behavior: 'smooth' });">
        ${escapeHtml(text)}
      </button>`;
}

const BENEFIT_SVG_ICONS = [
  `<svg viewBox="0 0 24 24">
              <path d="M7.5 4.5c2.3 1 6.7 1 9 0 1.2 2.5 1.7 5.2 1.2 7.8-.7 3.7-3 6.1-5.7 7.2-2.7-1.1-5-3.5-5.7-7.2-.5-2.6 0-5.3 1.2-7.8Z"/>
              <path d="M9.2 9.4c.9.5 1.8.5 2.6 0"/>
              <path d="M14.1 9.4c.5.3 1 .3 1.5 0"/>
              <path d="M9.3 14.2c1.7 1 3.7 1 5.4 0"/>
            </svg>`,
  `<svg viewBox="0 0 24 24">
              <path d="M12 3.2c2 2.4 3.6 4.6 4.5 6.5.8 1.7 1.1 3.1 1.1 4.2 0 3.2-2.4 5.6-5.6 5.6s-5.6-2.4-5.6-5.6c0-1.1.3-2.5 1.1-4.2.9-1.9 2.5-4.1 4.5-6.5Z"/>
              <path d="M9.4 14.2c.8.8 1.7 1.2 2.6 1.2s1.8-.4 2.6-1.2"/>
            </svg>`,
  `<svg viewBox="0 0 24 24">
              <path d="M12 4.5c4.8 0 8.6 3 10 7.5-1.4 4.5-5.2 7.5-10 7.5S3.4 16.5 2 12c1.4-4.5 5.2-7.5 10-7.5Z"/>
              <path d="M12 8.2a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6Z"/>
              <path d="M12 10.4a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2Z"/>
            </svg>`,
  `<svg viewBox="0 0 24 24">
              <path d="M5.5 5.5h13"/>
              <path d="M5.5 12h13"/>
              <path d="M5.5 18.5h13"/>
              <path d="M8.4 3.8v3.4"/>
              <path d="M15.6 10.3v3.4"/>
              <path d="M11.2 16.8v3.4"/>
            </svg>`,
];

const DEFAULT_BENEFITS: ProductPageBenefitItem[] = [
  {
    title: "Satisfying peel",
    description: "A golden layer that dries and peels away cleanly.",
  },
  {
    title: "Fresh after cleansing",
    description: "For when washed skin still does not look fresh enough.",
  },
  {
    title: "Smoother looking texture",
    description: "Helps skin look more reset before makeup or mirror checks.",
  },
  {
    title: "No routine overload",
    description: "Use when needed, moisturise, and move on.",
  },
];

function resolveBenefitFeatures(section: ProductPageSection): ProductPageBenefitItem[] {
  const items = section.benefit_items ?? [];
  if (items.length >= 4) return items.slice(0, 4);

  const bullets = section.bullets ?? [];
  return Array.from({ length: 4 }, (_, index) => {
    if (items[index]) return items[index];
    if (bullets[index]) {
      return {
        title: DEFAULT_BENEFITS[index].title,
        description: bullets[index],
      };
    }
    return DEFAULT_BENEFITS[index];
  });
}

function renderBenefitFeature(item: ProductPageBenefitItem, iconIndex: number): string {
  const svg = BENEFIT_SVG_ICONS[iconIndex] ?? BENEFIT_SVG_ICONS[0];
  return `<div class="wr-routine-reset__feature">
          <div class="wr-routine-reset__icon" aria-hidden="true">
            ${svg}
          </div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
        </div>`;
}

function parseFeedbackBullet(text: string): { title: string; detail: string } {
  const trimmed = text.trim();
  const period = trimmed.indexOf(".");
  if (period > 0 && period < 80) {
    const title = trimmed.slice(0, period + 1);
    const detail = trimmed.slice(period + 1).trim();
    return { title, detail };
  }
  return { title: trimmed, detail: "" };
}

function resolveFeedbackItems(section: ProductPageSection): { title: string; detail: string }[] {
  const bullets = section.bullets ?? [];
  const defaults = [
    {
      title: "The peel feels satisfying.",
      detail: "You can see the layer set, lift, and come away.",
    },
    {
      title: "Skin feels softer after.",
      detail: "Cleanse, apply, peel, rinse, moisturise.",
    },
    {
      title: "The T zone looks fresher.",
      detail: "For nose, chin, and dull, textured skin days.",
    },
  ];

  return Array.from({ length: 3 }, (_, index) => {
    if (bullets[index]) return parseFeedbackBullet(bullets[index]);
    return defaults[index];
  });
}

function proofPeelStyles(): string {
  return `
  .wr-proof-peel,
  .wr-proof-peel * {
    box-sizing: border-box;
    letter-spacing: normal;
    word-spacing: normal;
  }

  .wr-proof-peel {
    width: 100%;
    padding: 46px 18px;
    background: #ffffff;
    color: #181614;
  }

  .wr-proof-peel__inner {
    max-width: 1040px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(360px, 0.9fr) minmax(0, 0.92fr);
    gap: 44px;
    align-items: center;
  }

  .wr-proof-peel__media {
    width: 100%;
  }

  .wr-proof-peel__media img {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    object-position: center;
    border-radius: 14px;
    box-shadow: 0 10px 24px rgba(24, 22, 20, 0.12);
    background: #f8f4ee;
  }

  .wr-proof-peel__copy {
    max-width: 520px;
  }

  .wr-proof-peel__copy h2 {
    max-width: 520px;
    margin: 0 0 15px;
    color: #181614;
    font-size: clamp(30px, 3.3vw, 42px);
    line-height: 1.04;
    letter-spacing: -0.04em;
    font-weight: 850;
  }

  .wr-proof-peel__copy h2 span {
    color: #c58b38;
  }

  .wr-proof-peel__copy p {
    max-width: 510px;
    margin: 0 0 15px;
    color: rgba(24, 22, 20, 0.78);
    font-size: 15px;
    line-height: 1.62;
  }

  .wr-proof-peel__list {
    display: grid;
    gap: 7px;
    margin: 19px 0 22px;
    padding: 0;
    list-style: none;
  }

  .wr-proof-peel__list li {
    position: relative;
    padding-left: 28px;
    color: rgba(24, 22, 20, 0.82);
    font-size: 14px;
    line-height: 1.4;
    font-weight: 600;
  }

  .wr-proof-peel__list li::before {
    content: "✓";
    position: absolute;
    left: 0;
    top: 1px;
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #181614;
    color: #ffffff;
    font-size: 11px;
    line-height: 1;
    font-weight: 900;
  }

  .wr-proof-peel__button {
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
    transition: transform 0.18s ease, opacity 0.18s ease;
  }

  .wr-proof-peel__button:hover {
    transform: translateY(-1px);
    opacity: 0.94;
  }

  .wr-proof-peel__small {
    margin: 10px 0 0 !important;
    color: rgba(24, 22, 20, 0.58) !important;
    font-size: 12px !important;
    line-height: 1.42 !important;
  }

  @media screen and (max-width: 980px) {
    .wr-proof-peel {
      padding: 38px 16px;
    }

    .wr-proof-peel__inner {
      grid-template-columns: 1fr;
      gap: 24px;
    }

    .wr-proof-peel__copy {
      max-width: none;
      order: 2;
    }

    .wr-proof-peel__media {
      order: 1;
    }
  }

  @media screen and (max-width: 640px) {
    .wr-proof-peel {
      padding: 32px 14px;
    }

    .wr-proof-peel__copy h2 {
      font-size: 30px;
      line-height: 1.05;
      margin-bottom: 12px;
    }

    .wr-proof-peel__copy p {
      font-size: 13.8px;
      line-height: 1.55;
      margin-bottom: 13px;
    }

    .wr-proof-peel__list {
      margin: 17px 0 20px;
      gap: 7px;
    }

    .wr-proof-peel__list li {
      font-size: 13.2px;
      line-height: 1.4;
      padding-left: 27px;
    }

    .wr-proof-peel__button {
      min-height: 44px;
      padding: 0 20px;
      border-radius: 7px;
    }

    .wr-proof-peel__media img {
      border-radius: 13px;
      aspect-ratio: 4 / 3.15;
    }
  }`;
}

function routineResetStyles(): string {
  return `
  .wr-routine-reset,
  .wr-routine-reset * {
    box-sizing: border-box;
    letter-spacing: normal;
    word-spacing: normal;
  }

  .wr-routine-reset {
    width: 100%;
    padding: 46px 18px 50px;
    background: #f8f4ee;
    color: #181614;
  }

  .wr-routine-reset__inner {
    max-width: 1040px;
    margin: 0 auto;
  }

  .wr-routine-reset__header {
    max-width: 820px;
    margin: 0 auto 34px;
    text-align: center;
  }

  .wr-routine-reset__header h2 {
    margin: 0;
    color: #181614;
    font-size: clamp(30px, 3.3vw, 42px);
    line-height: 1.06;
    letter-spacing: -0.04em;
    font-weight: 850;
  }

  .wr-routine-reset__header h2 span {
    color: #c58b38;
  }

  .wr-routine-reset__header p {
    max-width: 760px;
    margin: 12px auto 0;
    color: rgba(24, 22, 20, 0.76);
    font-size: 15px;
    line-height: 1.62;
  }

  .wr-routine-reset__layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(240px, 0.78fr) minmax(0, 1fr);
    gap: 34px;
    align-items: center;
  }

  .wr-routine-reset__features {
    display: grid;
    gap: 34px;
  }

  .wr-routine-reset__feature {
    text-align: center;
  }

  .wr-routine-reset__icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 13px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .wr-routine-reset__icon svg {
    width: 48px;
    height: 48px;
    fill: none;
    stroke: #181614;
    stroke-width: 1.65;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .wr-routine-reset__feature h3 {
    margin: 0 0 8px;
    color: #181614;
    font-size: 18px;
    line-height: 1.25;
    font-weight: 850;
    letter-spacing: -0.015em;
  }

  .wr-routine-reset__feature p {
    max-width: 280px;
    margin: 0 auto;
    color: rgba(24, 22, 20, 0.72);
    font-size: 14px;
    line-height: 1.58;
  }

  .wr-routine-reset__image-wrap {
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .wr-routine-reset__image-wrap img {
    display: block;
    width: 100%;
    max-width: 285px;
    aspect-ratio: 1 / 1.08;
    object-fit: cover;
    object-position: center;
    border-radius: 14px;
    box-shadow: 0 10px 24px rgba(24, 22, 20, 0.12);
    background: #ffffff;
  }

  .wr-routine-reset__footer {
    max-width: 860px;
    margin: 30px auto 0;
    text-align: center;
  }

  .wr-routine-reset__footer p {
    margin: 0;
    color: #181614;
    font-size: 17px;
    line-height: 1.45;
    font-weight: 850;
    letter-spacing: -0.01em;
  }

  @media screen and (max-width: 980px) {
    .wr-routine-reset {
      padding: 40px 16px 44px;
    }

    .wr-routine-reset__layout {
      grid-template-columns: 1fr;
      gap: 30px;
    }

    .wr-routine-reset__image-wrap {
      order: 1;
    }

    .wr-routine-reset__features:first-child {
      order: 2;
    }

    .wr-routine-reset__features:last-child {
      order: 3;
    }

    .wr-routine-reset__features {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 26px;
    }

    .wr-routine-reset__image-wrap img {
      max-width: 390px;
      aspect-ratio: 4 / 3.1;
    }
  }

  @media screen and (max-width: 640px) {
    .wr-routine-reset {
      padding: 34px 14px 38px;
    }

    .wr-routine-reset__header {
      text-align: center;
      margin-bottom: 26px;
    }

    .wr-routine-reset__header h2 {
      font-size: 30px;
      line-height: 1.06;
    }

    .wr-routine-reset__header p {
      font-size: 13.8px;
      line-height: 1.55;
    }

    .wr-routine-reset__features {
      grid-template-columns: 1fr;
      gap: 24px;
    }

    .wr-routine-reset__feature {
      text-align: center;
    }

    .wr-routine-reset__icon {
      width: 42px;
      height: 42px;
      margin-bottom: 11px;
    }

    .wr-routine-reset__icon svg {
      width: 42px;
      height: 42px;
    }

    .wr-routine-reset__feature h3 {
      font-size: 17px;
      margin-bottom: 6px;
    }

    .wr-routine-reset__feature p {
      font-size: 13.5px;
      line-height: 1.52;
    }

    .wr-routine-reset__image-wrap img {
      max-width: none;
      aspect-ratio: 4 / 3.1;
      border-radius: 13px;
    }

    .wr-routine-reset__footer {
      margin-top: 26px;
    }

    .wr-routine-reset__footer p {
      font-size: 15.5px;
      line-height: 1.4;
    }
  }`;
}

function threeStepResetStyles(): string {
  return `
  .wr-three-step-reset,
  .wr-three-step-reset * {
    box-sizing: border-box;
    letter-spacing: normal;
    word-spacing: normal;
  }

  .wr-three-step-reset {
    width: 100%;
    padding: 46px 18px;
    background: #ffffff;
    color: #181614;
  }

  .wr-three-step-reset__inner {
    max-width: 1040px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(0, 0.82fr) minmax(360px, 1fr);
    gap: 44px;
    align-items: center;
  }

  .wr-three-step-reset__copy {
    max-width: 520px;
  }

  .wr-three-step-reset__copy h2 {
    margin: 0;
    color: #181614;
    font-size: clamp(30px, 3.3vw, 42px);
    line-height: 1.04;
    letter-spacing: -0.04em;
    font-weight: 850;
  }

  .wr-three-step-reset__copy h2 span {
    color: #c58b38;
  }

  .wr-three-step-reset__spark {
    margin: 8px 0 24px;
    color: #e2b323;
    font-size: 24px;
    line-height: 1;
  }

  .wr-three-step-reset__steps {
    display: grid;
    gap: 19px;
    margin: 0 0 24px;
  }

  .wr-three-step-reset__steps p {
    margin: 0;
    color: rgba(24, 22, 20, 0.78);
    font-size: 15px;
    line-height: 1.62;
  }

  .wr-three-step-reset__steps strong {
    color: #181614;
    font-weight: 850;
  }

  .wr-three-step-reset__button {
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
    transition: transform 0.18s ease, opacity 0.18s ease;
  }

  .wr-three-step-reset__button:hover {
    transform: translateY(-1px);
    opacity: 0.94;
  }

  .wr-three-step-reset__note {
    margin: 10px 0 0;
    color: rgba(24, 22, 20, 0.58);
    font-size: 12px;
    line-height: 1.42;
  }

  .wr-three-step-reset__media {
    width: 100%;
  }

  .wr-three-step-reset__media img {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    object-position: center;
    border-radius: 14px;
    box-shadow: 0 10px 24px rgba(24, 22, 20, 0.12);
    background: #f8f4ee;
  }

  @media screen and (max-width: 980px) {
    .wr-three-step-reset {
      padding: 38px 16px;
    }

    .wr-three-step-reset__inner {
      grid-template-columns: 1fr;
      gap: 24px;
    }

    .wr-three-step-reset__copy {
      max-width: none;
      order: 2;
    }

    .wr-three-step-reset__media {
      order: 1;
    }
  }

  @media screen and (max-width: 640px) {
    .wr-three-step-reset {
      padding: 32px 14px;
    }

    .wr-three-step-reset__copy h2 {
      font-size: 30px;
      line-height: 1.05;
    }

    .wr-three-step-reset__spark {
      margin: 7px 0 20px;
      font-size: 21px;
    }

    .wr-three-step-reset__steps {
      gap: 16px;
      margin-bottom: 22px;
    }

    .wr-three-step-reset__steps p {
      font-size: 13.8px;
      line-height: 1.55;
    }

    .wr-three-step-reset__button {
      min-height: 44px;
      padding: 0 20px;
      border-radius: 7px;
    }

    .wr-three-step-reset__media img {
      border-radius: 13px;
      aspect-ratio: 4 / 3.15;
    }
  }`;
}

function feedbackPatternStyles(): string {
  return `
  .wr_feedback_pattern,
  .wr_feedback_pattern * {
    box-sizing: border-box;
    letter-spacing: normal;
    word-spacing: normal;
  }

  .wr_feedback_pattern {
    width: 100%;
    padding: 42px 18px;
    background: #f8f4ee;
    color: #181614;
  }

  .wr_feedback_pattern__inner {
    max-width: 1040px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(390px, 0.96fr) minmax(0, 0.9fr);
    gap: 42px;
    align-items: center;
  }

  .wr_feedback_pattern__media {
    width: 100%;
  }

  .wr_feedback_pattern__media img {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    object-position: center;
    border-radius: 14px;
    box-shadow: 0 10px 24px rgba(24, 22, 20, 0.12);
    background: #ffffff;
  }

  .wr_feedback_pattern__copy {
    max-width: 510px;
  }

  .wr_feedback_pattern__proof_line {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 9px;
    color: rgba(24, 22, 20, 0.76);
    font-size: 12.8px;
    line-height: 1.35;
    white-space: normal;
  }

  .wr_feedback_pattern__stars {
    flex: 0 0 auto;
    color: #e2b323;
    font-size: 16px;
    line-height: 1;
    letter-spacing: 0.5px;
    font-style: normal;
    font-weight: 700;
  }

  .wr_feedback_pattern__proof_line em {
    display: inline;
    font-style: italic;
    font-weight: 400;
    color: rgba(24, 22, 20, 0.78);
  }

  .wr_feedback_pattern__copy h2 {
    max-width: 500px;
    margin: 0 0 10px;
    color: #181614;
    font-size: clamp(28px, 3vw, 38px);
    line-height: 1.04;
    letter-spacing: -0.04em;
    font-weight: 850;
  }

  .wr_feedback_pattern__copy h2 span {
    color: #c58b38;
  }

  .wr_feedback_pattern__lead {
    max-width: 500px;
    margin: 0 0 17px;
    color: rgba(24, 22, 20, 0.78);
    font-size: 14.2px;
    line-height: 1.5;
  }

  .wr_feedback_pattern__list {
    display: grid;
    margin: 0 0 19px;
    border-top: 1px solid rgba(24, 22, 20, 0.16);
  }

  .wr_feedback_pattern__item {
    display: grid;
    grid-template-columns: 22px 1fr;
    gap: 11px;
    padding: 11px 0;
    border-bottom: 1px solid rgba(24, 22, 20, 0.16);
  }

  .wr_feedback_pattern__item span {
    width: 18px;
    height: 18px;
    margin-top: 2px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #181614;
    color: #ffffff;
    font-size: 10.5px;
    line-height: 1;
    font-weight: 900;
  }

  .wr_feedback_pattern__item p {
    margin: 0;
    color: rgba(24, 22, 20, 0.76);
    font-size: 14.2px;
    line-height: 1.42;
  }

  .wr_feedback_pattern__item strong {
    color: #181614;
    font-weight: 850;
  }

  .wr_feedback_pattern__action {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .wr_feedback_pattern__button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 42px;
    padding: 0 20px;
    border: 0;
    border-radius: 7px;
    background: #222b31;
    color: #ffffff;
    font-size: 13.5px;
    line-height: 1;
    font-weight: 850;
    cursor: pointer;
    box-shadow: 0 8px 18px rgba(24, 22, 20, 0.14);
    transition: transform 0.18s ease, opacity 0.18s ease;
    white-space: nowrap;
  }

  .wr_feedback_pattern__button:hover {
    transform: translateY(-1px);
    opacity: 0.94;
  }

  .wr_feedback_pattern__note {
    margin: 0;
    color: rgba(24, 22, 20, 0.58);
    font-size: 11.5px;
    line-height: 1.35;
  }

  @media screen and (max-width: 980px) {
    .wr_feedback_pattern {
      padding: 38px 16px;
    }

    .wr_feedback_pattern__inner {
      grid-template-columns: 1fr;
      gap: 24px;
    }

    .wr_feedback_pattern__copy {
      max-width: none;
      order: 2;
    }

    .wr_feedback_pattern__media {
      order: 1;
    }
  }

  @media screen and (max-width: 640px) {
    .wr_feedback_pattern {
      padding: 32px 14px;
    }

    .wr_feedback_pattern__proof_line {
      align-items: flex-start;
      gap: 7px;
      margin-bottom: 10px;
      font-size: 12.3px;
    }

    .wr_feedback_pattern__stars {
      font-size: 15px;
      padding-top: 1px;
    }

    .wr_feedback_pattern__copy h2 {
      font-size: 30px;
      line-height: 1.05;
      margin-bottom: 11px;
    }

    .wr_feedback_pattern__lead {
      font-size: 13.8px;
      line-height: 1.5;
      margin-bottom: 16px;
    }

    .wr_feedback_pattern__item {
      grid-template-columns: 22px 1fr;
      gap: 10px;
      padding: 12px 0;
    }

    .wr_feedback_pattern__item p {
      font-size: 13.7px;
      line-height: 1.48;
    }

    .wr_feedback_pattern__action {
      display: block;
    }

    .wr_feedback_pattern__button {
      min-height: 44px;
      padding: 0 20px;
      border-radius: 7px;
    }

    .wr_feedback_pattern__note {
      margin-top: 9px;
      font-size: 11.5px;
    }

    .wr_feedback_pattern__media img {
      border-radius: 13px;
      aspect-ratio: 4 / 3.15;
    }
  }`;
}

export function wrPreviewStyles(): string {
  const combined = [
    proofPeelStyles(),
    routineResetStyles(),
    threeStepResetStyles(),
    feedbackPatternStyles(),
    wrPreviewStylesBatch2(),
  ].join("\n");
  return combined.replace(
    /\.wr[_a-zA-Z0-9-]+/g,
    (match) => `.pp-live-preview ${match}`
  );
}

export function getBenefitFeaturesForPreview(
  section: ProductPageSection
): ProductPageBenefitItem[] {
  return resolveBenefitFeatures(section);
}

export function getFeedbackItemsForPreview(
  section: ProductPageSection
): { title: string; detail: string }[] {
  return resolveFeedbackItems(section);
}

export function getSocialProofQuote(proofLine?: string): string {
  return parseProofLineQuote(proofLine);
}

export { BENEFIT_SVG_ICONS };

export function renderRitualLiquid(section: ProductPageSection): string {
  const imageUrl = resolveImageUrl(section);
  const imageAlt = resolveImageAlt(section);
  const paragraphs = (section.body_paragraphs ?? [])
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("\n\n      ");
  const bullets = (section.bullets ?? [])
    .map((b) => `<li>${escapeHtml(b)}</li>`)
    .join("\n        ");
  const listBlock = bullets
    ? `<ul class="wr-proof-peel__list">
        ${bullets}
      </ul>`
    : "";
  const smallPrint = section.small_print?.trim()
    ? `<p class="wr-proof-peel__small">${escapeHtml(section.small_print)}</p>`
    : "";
  const accent = section.accent_headline?.trim() || "Feel the reset";
  const imageBlock = section.image_required
    ? `<div class="wr-proof-peel__media">
      <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(imageAlt)}" loading="lazy" />
    </div>`
    : "";

  return `<section class="wr-proof-peel">
  <div class="wr-proof-peel__inner">
    ${imageBlock}
    <div class="wr-proof-peel__copy">
      ${renderWrHeadlineH2(section.headline, accent)}
      ${paragraphs}
      ${listBlock}
      ${scrollButton("wr-proof-peel__button", section.button_label ?? "👉 Try It Now")}
      ${smallPrint}
    </div>
  </div>
</section>
<style>${proofPeelStyles()}</style>`;
}

export function renderBenefitsGridLiquid(section: ProductPageSection): string {
  const imageUrl = resolveImageUrl(section);
  const imageAlt = resolveImageAlt(section);
  const features = resolveBenefitFeatures(section);
  const leftFeatures = features
    .slice(0, 2)
    .map((item, index) => renderBenefitFeature(item, index))
    .join("\n\n        ");
  const rightFeatures = features
    .slice(2, 4)
    .map((item, index) => renderBenefitFeature(item, index + 2))
    .join("\n\n        ");
  const headerBody =
    section.body_paragraphs?.[0]?.trim() ||
    "A simple peel off ritual for the skin days where cleansing alone does not quite give you the fresh, smooth, clean looking result you want.";
  const accent = section.accent_headline?.trim() || "Reset";
  const footerLine =
    section.footer_line?.trim() ||
    "One golden layer. One satisfying peel. One reset moment.";

  return `<section class="wr-routine-reset">
  <div class="wr-routine-reset__inner">
    <div class="wr-routine-reset__header">
      ${renderWrHeadlineH2(section.headline, accent)}
      <p>${escapeHtml(headerBody)}</p>
    </div>
    <div class="wr-routine-reset__layout">
      <div class="wr-routine-reset__features">
        ${leftFeatures}
      </div>
      <div class="wr-routine-reset__image-wrap">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(imageAlt)}" loading="lazy" />
      </div>
      <div class="wr-routine-reset__features">
        ${rightFeatures}
      </div>
    </div>
    <div class="wr-routine-reset__footer">
      <p>${escapeHtml(footerLine)}</p>
    </div>
  </div>
</section>
<style>${routineResetStyles()}</style>`;
}

export function renderHowToUseLiquid(section: ProductPageSection): string {
  const imageUrl = resolveImageUrl(section);
  const imageAlt = resolveImageAlt(section);
  const steps = section.steps?.length
    ? section.steps.slice(0, 3)
    : (section.bullets ?? []).slice(0, 3).map((bullet, index) => ({
        title: `Step ${index + 1}`,
        description: bullet,
      }));
  const stepBlocks = steps
    .map(
      (step, index) =>
        `<p><strong>${index + 1}) ${escapeHtml(step.title)}:</strong> ${escapeHtml(step.description)}</p>`
    )
    .join("\n\n        ");
  const note =
    section.small_print?.trim() ||
    "Use 1 to 2 times weekly. Patch test before first use.";
  const accent =
    section.accent_headline?.trim() ||
    (section.headline.toLowerCase().includes("3 easy steps")
      ? "3 easy steps."
      : "3 easy steps.");

  return `<section class="wr-three-step-reset">
  <div class="wr-three-step-reset__inner">
    <div class="wr-three-step-reset__copy">
      ${renderWrHeadlineH2(section.headline, accent)}
      <div class="wr-three-step-reset__spark" aria-hidden="true">✦</div>
      <div class="wr-three-step-reset__steps">
        ${stepBlocks}
      </div>
      ${scrollButton("wr-three-step-reset__button", section.button_label ?? "👉 Try It Now")}
      <p class="wr-three-step-reset__note">${escapeHtml(note)}</p>
    </div>
    <div class="wr-three-step-reset__media">
      <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(imageAlt)}" loading="lazy" />
    </div>
  </div>
</section>
<style>${threeStepResetStyles()}</style>`;
}

export function renderSocialProofLiquid(section: ProductPageSection): string {
  const imageUrl = resolveImageUrl(section);
  const imageAlt = resolveImageAlt(section);
  const quote = parseProofLineQuote(section.proof_line);
  const lead = section.body_paragraphs?.[0]?.trim() || "";
  const leadBlock = lead
    ? `<p class="wr_feedback_pattern__lead">${escapeHtml(lead)}</p>`
    : "";
  const extraBody = (section.body_paragraphs ?? [])
    .slice(1)
    .map((p) => `<p class="wr_feedback_pattern__lead">${escapeHtml(p)}</p>`)
    .join("\n      ");
  const feedbackItems = resolveFeedbackItems(section)
    .map(
      (item) => `<div class="wr_feedback_pattern__item">
          <span aria-hidden="true">✓</span>
          <p>
            <strong>${escapeHtml(item.title)}</strong>${item.detail ? ` ${escapeHtml(item.detail)}` : ""}
          </p>
        </div>`
    )
    .join("\n\n        ");
  const note =
    section.small_print?.trim() || "Cosmetic peel off mask. Results vary by skin type.";
  const accent = section.accent_headline?.trim() || "after the peel.";

  return `<section class="wr_feedback_pattern">
  <div class="wr_feedback_pattern__inner">
    <div class="wr_feedback_pattern__media">
      <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(imageAlt)}" loading="lazy" />
    </div>
    <div class="wr_feedback_pattern__copy">
      <div class="wr_feedback_pattern__proof_line">
        <span class="wr_feedback_pattern__stars">★★★★★</span>
        <em>“${escapeHtml(quote)}”</em>
      </div>
      ${renderWrHeadlineH2(section.headline, accent)}
      ${leadBlock}
      ${extraBody}
      <div class="wr_feedback_pattern__list">
        ${feedbackItems}
      </div>
      <div class="wr_feedback_pattern__action">
        ${scrollButton("wr_feedback_pattern__button", section.button_label ?? "👉 Try It Now")}
        <p class="wr_feedback_pattern__note">${escapeHtml(note)}</p>
      </div>
    </div>
  </div>
</section>
<style>${feedbackPatternStyles()}</style>`;
}
