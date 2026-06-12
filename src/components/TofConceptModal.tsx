import { useMemo } from "react";
import { ImageIcon, X } from "lucide-react";
import type { DesireConcept, DesireConceptSet } from "../types";
import { CopyButton } from "./shared";

interface TofConceptModalProps {
  conceptSet: DesireConceptSet;
  desireTitle: string;
  product?: string;
  offer?: string;
  onClose: () => void;
}

function overlayLabel(value: DesireConcept["overlay_recommendation"]): string {
  switch (value) {
    case "headline_only":
      return "Headline only";
    case "headline_plus_support_line":
      return "Headline + support line";
    default:
      return "None";
  }
}

function formatFullConcept(concept: DesireConcept): string {
  const lines = [
    `Concept: ${concept.concept_title}`,
    `Headline: ${concept.headline}`,
  ];
  if (concept.support_line.trim()) {
    lines.push(`Support line: ${concept.support_line}`);
  }
  lines.push(
    `Overlay: ${overlayLabel(concept.overlay_recommendation)}`,
    `Visual strategy: ${concept.visual_strategy}`,
    `Rationale: ${concept.rationale}`,
    `Image prompt: ${concept.image_prompt}`
  );
  return lines.join("\n");
}

function formatAllConcepts(concepts: DesireConcept[]): string {
  return concepts
    .map((concept, index) => {
      const header = `--- Concept ${index + 1} ---`;
      return `${header}\n${formatFullConcept(concept)}`;
    })
    .join("\n\n");
}

export function TofConceptModal({
  conceptSet,
  desireTitle,
  product,
  offer,
  onClose,
}: TofConceptModalProps) {
  const concepts = useMemo(
    () =>
      [...conceptSet.concepts].sort(
        (a, b) => a.concept_number - b.concept_number
      ),
    [conceptSet.concepts]
  );

  const allConceptsText = useMemo(
    () => formatAllConcepts(concepts),
    [concepts]
  );

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tof-modal-title"
      onClick={onClose}
    >
      <div className="modal-card modal-card-tof" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <h2 id="tof-modal-title" className="modal-title">
              Top of Funnel Concepts
            </h2>
            <p className="modal-subtitle">
              Broad, image-first Meta concepts for scroll-stopping awareness.
            </p>
            <dl className="modal-context">
              <div>
                <dt>Mass Desire</dt>
                <dd>{desireTitle}</dd>
              </div>
              {product ? (
                <div>
                  <dt>Product</dt>
                  <dd>{product}</dd>
                </div>
              ) : null}
              {offer ? (
                <div>
                  <dt>Offer</dt>
                  <dd>{offer}</dd>
                </div>
              ) : null}
            </dl>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="modal-toolbar">
          <CopyButton text={allConceptsText} label="Copy All Concepts" />
        </div>

        <div className="modal-body">
          <div className="tof-concept-list">
            {concepts.map((concept) => (
              <article
                key={concept.id}
                className="tof-concept-card"
              >
                <header className="tof-concept-head">
                  <span className="tof-concept-number">
                    Concept {concept.concept_number}
                  </span>
                  <h3 className="tof-concept-title">{concept.concept_title}</h3>
                </header>

                <div className="tof-concept-fields">
                  <div className="tof-field">
                    <span className="tof-field-label">Headline</span>
                    <p className="tof-field-value">{concept.headline}</p>
                  </div>
                  {concept.support_line.trim() ? (
                    <div className="tof-field">
                      <span className="tof-field-label">Support line</span>
                      <p className="tof-field-value">{concept.support_line}</p>
                    </div>
                  ) : null}
                  <div className="tof-field">
                    <span className="tof-field-label">Overlay recommendation</span>
                    <p className="tof-field-value">
                      {overlayLabel(concept.overlay_recommendation)}
                    </p>
                  </div>
                  <div className="tof-field">
                    <span className="tof-field-label">Visual strategy</span>
                    <p className="tof-field-value">{concept.visual_strategy}</p>
                  </div>
                  <div className="tof-field">
                    <span className="tof-field-label">Rationale</span>
                    <p className="tof-field-value">{concept.rationale}</p>
                  </div>
                  <div className="tof-field tof-field-prompt">
                    <span className="tof-field-label">
                      <ImageIcon size={13} strokeWidth={2} />
                      ChatGPT image prompt
                    </span>
                    <p className="tof-field-value tof-prompt-value">
                      {concept.image_prompt}
                    </p>
                  </div>
                </div>

                <div className="tof-concept-actions">
                  <CopyButton
                    text={concept.headline}
                    label="Copy Headline"
                    variant="headline"
                  />
                  {concept.support_line.trim() ? (
                    <CopyButton
                      text={concept.support_line}
                      label="Copy Support Line"
                      variant="description"
                    />
                  ) : null}
                  <CopyButton
                    text={concept.image_prompt}
                    label="Copy Image Prompt"
                  />
                  <CopyButton
                    text={formatFullConcept(concept)}
                    label="Copy Full Concept"
                  />
                </div>
              </article>
            ))}
          </div>
        </div>

        <footer className="modal-foot">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
