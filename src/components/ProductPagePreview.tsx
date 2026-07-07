import { Fragment } from "react";
import type { ProductPageSection } from "../types";
import { getProofLineQuote } from "../lib/productPageLiquid";
import {
  BENEFIT_SVG_ICONS,
  getBenefitFeaturesForPreview,
  getFeedbackItemsForPreview,
  getSocialProofQuote,
  wrPreviewStyles,
} from "../lib/productPageWrLiquid";
import {
  getCareItemsForPreview,
  getComparisonRowsForPreview,
  getDocumentLinksForPreview,
  getFaqItemsForPreview,
} from "../lib/productPageWrLiquidBatch2";
import {
  PreviewImage,
  PreviewSectionShell,
  PreviewStars,
  WrHeadline,
} from "./productPagePreviewParts";

const DEFAULT_GUARANTEE_SEAL =
  "https://cdn.shopify.com/s/files/1/0741/9609/1054/files/Guarantee.png?v=1780234306";

interface ProductPagePreviewProps {
  sections: ProductPageSection[];
  disabled?: boolean;
  onEditSection: (section: ProductPageSection) => void;
  onUploadSectionImage: (
    section: ProductPageSection,
    file: File
  ) => Promise<void>;
}

function renderSection(
  section: ProductPageSection,
  props: Omit<ProductPagePreviewProps, "sections">
) {
  const shell = (className: string, content: React.ReactNode) => (
    <PreviewSectionShell
      key={section.id}
      section={section}
      disabled={props.disabled}
      className={className}
      onEdit={() => props.onEditSection(section)}
      onUpload={(file) => void props.onUploadSectionImage(section, file)}
    >
      {content}
    </PreviewSectionShell>
  );

  switch (section.section_type) {
    case "proof_intro":
      return shell(
        "wr-proof-intro-shell",
        <section className="wr-proof-intro">
          <div className="wr-proof-intro__inner">
            <div className="wr-proof-intro__copy">
              <div className="wr-proof-intro__proof-line">
                <div className="wr_feedback_pattern__proof_line">
                  <span className="wr_feedback_pattern__stars">★★★★★</span>
                  <em>“{getProofLineQuote(section.proof_line)}”</em>
                </div>
              </div>
              <h2>{section.headline}</h2>
              {(section.body_paragraphs ?? []).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              <span
                className="wr-proof-intro__button"
                role="presentation"
              >
                {section.button_label?.trim() || "👉 Try It Now"}
              </span>
              {section.small_print?.trim() ? (
                <p className="wr-proof-intro__small">{section.small_print}</p>
              ) : null}
            </div>
            <div className="wr-proof-intro__media">
              <PreviewImage section={section} />
            </div>
          </div>
        </section>
      );

    case "ritual":
      return shell(
        "wr-proof-peel-shell",
        <section className="wr-proof-peel">
          <div className="wr-proof-peel__inner">
            <div className="wr-proof-peel__media">
              <PreviewImage section={section} />
            </div>
            <div className="wr-proof-peel__copy">
              <WrHeadline
                headline={section.headline}
                accent={section.accent_headline ?? "Feel the reset"}
              />
              {(section.body_paragraphs ?? []).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              {(section.bullets ?? []).length > 0 ? (
                <ul className="wr-proof-peel__list">
                  {(section.bullets ?? []).map((bullet, index) => (
                    <li key={index}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
              <span className="wr-proof-peel__button" role="presentation">
                {section.button_label?.trim() || "👉 Try It Now"}
              </span>
              {section.small_print?.trim() ? (
                <p className="wr-proof-peel__small">{section.small_print}</p>
              ) : null}
            </div>
          </div>
        </section>
      );

    case "benefits_grid": {
      const features = getBenefitFeaturesForPreview(section);
      const headerBody =
        section.body_paragraphs?.[0]?.trim() ||
        "A simple peel off ritual for the skin days where cleansing alone does not quite give you the fresh, smooth, clean looking result you want.";
      const footerLine =
        section.footer_line?.trim() ||
        "One golden layer. One satisfying peel. One reset moment.";

      return shell(
        "wr-routine-reset-shell",
        <section className="wr-routine-reset">
          <div className="wr-routine-reset__inner">
            <div className="wr-routine-reset__header">
              <WrHeadline
                headline={section.headline}
                accent={section.accent_headline ?? "Reset"}
              />
              <p>{headerBody}</p>
            </div>
            <div className="wr-routine-reset__layout">
              <div className="wr-routine-reset__features">
                {features.slice(0, 2).map((item, index) => (
                  <div key={index} className="wr-routine-reset__feature">
                    <div
                      className="wr-routine-reset__icon"
                      aria-hidden
                      dangerouslySetInnerHTML={{
                        __html: BENEFIT_SVG_ICONS[index] ?? BENEFIT_SVG_ICONS[0],
                      }}
                    />
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                ))}
              </div>
              <div className="wr-routine-reset__image-wrap">
                <PreviewImage section={section} />
              </div>
              <div className="wr-routine-reset__features">
                {features.slice(2, 4).map((item, index) => (
                  <div key={index} className="wr-routine-reset__feature">
                    <div
                      className="wr-routine-reset__icon"
                      aria-hidden
                      dangerouslySetInnerHTML={{
                        __html:
                          BENEFIT_SVG_ICONS[index + 2] ?? BENEFIT_SVG_ICONS[0],
                      }}
                    />
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="wr-routine-reset__footer">
              <p>{footerLine}</p>
            </div>
          </div>
        </section>
      );
    }

    case "how_to_use": {
      const steps = section.steps?.length
        ? section.steps.slice(0, 3)
        : (section.bullets ?? []).slice(0, 3).map((bullet, index) => ({
            title: `Step ${index + 1}`,
            description: bullet,
          }));

      return shell(
        "wr-three-step-reset-shell",
        <section className="wr-three-step-reset">
          <div className="wr-three-step-reset__inner">
            <div className="wr-three-step-reset__copy">
              <WrHeadline
                headline={section.headline}
                accent={section.accent_headline ?? "3 easy steps."}
              />
              <div className="wr-three-step-reset__spark" aria-hidden>
                ✦
              </div>
              <div className="wr-three-step-reset__steps">
                {steps.map((step, index) => (
                  <p key={index}>
                    <strong>
                      {index + 1}) {step.title}:
                    </strong>{" "}
                    {step.description}
                  </p>
                ))}
              </div>
              <span className="wr-three-step-reset__button" role="presentation">
                {section.button_label?.trim() || "👉 Try It Now"}
              </span>
              <p className="wr-three-step-reset__note">
                {section.small_print?.trim() ||
                  "Use 1 to 2 times weekly. Patch test before first use."}
              </p>
            </div>
            <div className="wr-three-step-reset__media">
              <PreviewImage section={section} />
            </div>
          </div>
        </section>
      );
    }

    case "social_proof": {
      const feedbackItems = getFeedbackItemsForPreview(section);
      const lead = section.body_paragraphs?.[0]?.trim() || "";

      return shell(
        "wr-feedback-pattern-shell",
        <section className="wr_feedback_pattern">
          <div className="wr_feedback_pattern__inner">
            <div className="wr_feedback_pattern__media">
              <PreviewImage section={section} />
            </div>
            <div className="wr_feedback_pattern__copy">
              <div className="wr_feedback_pattern__proof_line">
                <span className="wr_feedback_pattern__stars">★★★★★</span>
                <em>“{getSocialProofQuote(section.proof_line)}”</em>
              </div>
              <WrHeadline
                headline={section.headline}
                accent={section.accent_headline ?? "after the peel."}
              />
              {lead ? <p className="wr_feedback_pattern__lead">{lead}</p> : null}
              {(section.body_paragraphs ?? []).slice(1).map((paragraph, index) => (
                <p key={index} className="wr_feedback_pattern__lead">
                  {paragraph}
                </p>
              ))}
              <div className="wr_feedback_pattern__list">
                {feedbackItems.map((item, index) => (
                  <div key={index} className="wr_feedback_pattern__item">
                    <span aria-hidden>✓</span>
                    <p>
                      <strong>{item.title}</strong>
                      {item.detail ? ` ${item.detail}` : ""}
                    </p>
                  </div>
                ))}
              </div>
              <div className="wr_feedback_pattern__action">
                <span
                  className="wr_feedback_pattern__button"
                  role="presentation"
                >
                  {section.button_label?.trim() || "👉 Try It Now"}
                </span>
                <p className="wr_feedback_pattern__note">
                  {section.small_print?.trim() ||
                    "Cosmetic peel off mask. Results vary by skin type."}
                </p>
              </div>
            </div>
          </div>
        </section>
      );
    }

    case "comparison": {
      const rows = getComparisonRowsForPreview(section);
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

      return shell(
        "wr-clean-reset-compare-shell",
        <section className="wr-clean-reset-compare">
          <div className="wr-clean-reset-compare__inner">
            <div className="wr-clean-reset-compare__header">
              <WrHeadline
                headline={section.headline || "What makes it different?"}
                accent={section.accent_headline ?? "different?"}
              />
              <p>{intro}</p>
            </div>
            <div className="wr-clean-reset-compare__desktop">
              <div className="wr-clean-reset-compare__table">
                <div className="wr-clean-reset-compare__cell wr-clean-reset-compare__cell--head wr-clean-reset-compare__cell--head-feature" />
                <div className="wr-clean-reset-compare__cell wr-clean-reset-compare__cell--head">
                  {leftColumn}
                </div>
                <div className="wr-clean-reset-compare__cell wr-clean-reset-compare__cell--head">
                  {rightColumn}
                </div>
                {rows.map((row, index) => (
                  <Fragment key={index}>
                    <div
                      key={`${index}-feature`}
                      className="wr-clean-reset-compare__cell wr-clean-reset-compare__cell--feature"
                    >
                      {row.feature}
                    </div>
                    <div
                      key={`${index}-left`}
                      className="wr-clean-reset-compare__cell wr-clean-reset-compare__cell--mark"
                    >
                      <span
                        className={
                          row.left_mark === "yes"
                            ? "wr-clean-reset-compare__yes"
                            : row.left_mark === "no"
                              ? "wr-clean-reset-compare__no"
                              : "wr-clean-reset-compare__partial"
                        }
                      >
                        {row.left_mark === "yes"
                          ? "✓"
                          : row.left_mark === "no"
                            ? "✕"
                            : "–"}
                      </span>
                    </div>
                    <div
                      key={`${index}-right`}
                      className="wr-clean-reset-compare__cell wr-clean-reset-compare__cell--mark"
                    >
                      <span
                        className={
                          row.right_mark === "yes"
                            ? "wr-clean-reset-compare__yes"
                            : row.right_mark === "no"
                              ? "wr-clean-reset-compare__no"
                              : "wr-clean-reset-compare__partial"
                        }
                      >
                        {row.right_mark === "yes"
                          ? "✓"
                          : row.right_mark === "no"
                            ? "✕"
                            : "–"}
                      </span>
                    </div>
                  </Fragment>
                ))}
              </div>
            </div>
            <div className="wr-clean-reset-compare__mobile">
              {rows.map((row, index) => (
                <article key={index} className="wr-clean-reset-compare__card">
                  <h3>{row.feature}</h3>
                  <div className="wr-clean-reset-compare__card-row">
                    <span>{leftColumn}</span>
                    <span>
                      {row.left_mark === "yes"
                        ? "✓"
                        : row.left_mark === "no"
                          ? "✕"
                          : "–"}
                    </span>
                  </div>
                  <div className="wr-clean-reset-compare__card-row">
                    <span>{rightColumn}</span>
                    <span>
                      {row.right_mark === "yes"
                        ? "✓"
                        : row.right_mark === "no"
                          ? "✕"
                          : "–"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
            <div className="wr-clean-reset-compare__action">
              <span
                className="wr-clean-reset-compare__button"
                role="presentation"
              >
                {section.button_label?.trim() || "👉 Try It Now"}
              </span>
              <p className="wr-clean-reset-compare__note">
                {section.small_print?.trim() ||
                  "Cosmetic peel off mask. Results vary by skin type."}
              </p>
            </div>
          </div>
        </section>
      );
    }

    case "faq": {
      const items = getFaqItemsForPreview(section);
      const midpoint = Math.ceil(items.length / 2);
      const leftItems = items.slice(0, midpoint);
      const rightItems = items.slice(midpoint);

      return shell(
        "wr-faq-shell",
        <section className="wr_mask_faq_simple">
          <div className="wr_mask_faq_simple__inner">
            <div className="wr_mask_faq_simple__header">
              <h2>
                {section.headline?.trim() || "Frequently Asked Questions"}
              </h2>
            </div>
            <div className="wr_mask_faq_simple__grid">
              <div className="wr_mask_faq_simple__column">
                {leftItems.map((item, index) => (
                  <details key={index} className="wr_mask_faq_simple__item">
                    <summary>
                      <span>{item.question}</span>
                      <span className="wr_mask_faq_simple__chevron">›</span>
                    </summary>
                    <div className="wr_mask_faq_simple__answer">
                      <p>{item.answer}</p>
                    </div>
                  </details>
                ))}
              </div>
              <div className="wr_mask_faq_simple__column">
                {rightItems.map((item, index) => (
                  <details key={index} className="wr_mask_faq_simple__item">
                    <summary>
                      <span>{item.question}</span>
                      <span className="wr_mask_faq_simple__chevron">›</span>
                    </summary>
                    <div className="wr_mask_faq_simple__answer">
                      <p>{item.answer}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
      );
    }

    case "guarantee": {
      const sealUrl =
        section.shopify_image_url?.trim() || DEFAULT_GUARANTEE_SEAL;
      const subheading =
        section.subheading?.trim() ||
        section.proof_line?.trim() ||
        "No Questions Asked";
      const headline =
        section.headline?.trim() || "60 Day Money Back Guarantee";
      const productName = section.product_name?.trim() || "the product";
      const hasBody = section.body_paragraphs?.some((p) => p.trim());

      return shell(
        "wr-money-back-shell",
        <section className="wr_money_back">
          <div className="wr_money_back__inner">
            <div className="wr_money_back__seal" aria-hidden>
              <img src={sealUrl} alt="60 day money back guarantee" loading="lazy" />
            </div>
            <p className="wr_money_back__subheading">{subheading}</p>
            <h2>{headline}</h2>
            {hasBody ? (
              <p className="wr_money_back__copy">
                {section.body_paragraphs.join(" ")}
              </p>
            ) : (
              <p className="wr_money_back__copy">
                Try the <strong>{productName}</strong> with confidence. If it is
                not for you, just send back the{" "}
                <strong>unused portion within 60 days</strong> and we will{" "}
                <strong>refund your order.</strong>
              </p>
            )}
          </div>
        </section>
      );
    }

    case "reviews":
      return shell(
        "ppv-cream",
        <section className="ppv-section">
          <div className="ppv-wrap ppv-reviews-wrap">
            <h2 className="ppv-headline ppv-headline--center">
              {section.headline || "What people are saying"}
            </h2>
            {(section.body_paragraphs ?? []).map((paragraph, index) => (
              <p key={index} className="ppv-body ppv-body--center">
                {paragraph}
              </p>
            ))}
            <div className="ppv-reviews-grid">
              {(section.testimonials ?? []).map((item, index) => (
                <article key={index} className="ppv-review-card">
                  <div className="ppv-review-img ppv-review-img--placeholder">
                    <span>Review image</span>
                  </div>
                  <PreviewStars />
                  <blockquote>
                    <p>“{item.quote}”</p>
                    <cite>— {item.attribution}</cite>
                  </blockquote>
                </article>
              ))}
            </div>
          </div>
        </section>
      );

    case "care_disclaimer": {
      const careItems = getCareItemsForPreview(section);
      const documentLinks = getDocumentLinksForPreview(section);
      const intro =
        section.body_paragraphs?.[0]?.trim() ||
        "A cosmetic peel off mask for occasional reset days. Simple to use, but best used gently.";

      return shell(
        "wr-use-care-shell",
        <section className="wr_use_care_compact">
          <div className="wr_use_care_compact__inner">
            <div className="wr_use_care_compact__header">
              <h2>{section.headline?.trim() || "Use with care."}</h2>
              <p>{intro}</p>
            </div>
            <div className="wr_use_care_compact__grid">
              {careItems.map((item, index) => (
                <div key={index} className="wr_use_care_compact__item">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>
            <div className="wr_use_care_compact__docs">
              <span>Product documents</span>
              <div className="wr_use_care_compact__links">
                {documentLinks.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      );
    }

    default:
      return null;
  }
}

export function ProductPagePreview({
  sections,
  disabled,
  onEditSection,
  onUploadSectionImage,
}: ProductPagePreviewProps) {
  const sectionProps = { disabled, onEditSection, onUploadSectionImage };

  return (
    <div className="pp-live-preview">
      <style dangerouslySetInnerHTML={{ __html: wrPreviewStyles() }} />
      {sections.map((section) => renderSection(section, sectionProps))}
    </div>
  );
}
