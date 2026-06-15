import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { DesireConcept, DesireConceptSet, MassDesire } from "../types";
import {
  formatAllTofAds,
  formatTofFullAd,
  resolveTofAd,
} from "../lib/tofAdFields";
import { resolveTofNaming } from "../lib/tofNaming";
import { TofImageUpload } from "./TofImageUpload";
import { CopyButton } from "./shared";

interface TofConceptModalProps {
  conceptSet: DesireConceptSet;
  desires: MassDesire[];
  desireTitle: string;
  product?: string;
  offer?: string;
  onUpdateConcept: (concept: DesireConcept) => Promise<DesireConcept>;
  onClose: () => void;
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div className="copy-pack-field">
      <span className="copy-pack-label">{label}</span>
      <p className="copy-pack-value">{value || "—"}</p>
    </div>
  );
}

export function TofConceptModal({
  conceptSet,
  desires,
  desireTitle,
  product,
  offer,
  onUpdateConcept,
  onClose,
}: TofConceptModalProps) {
  const [concepts, setConcepts] = useState(() =>
    [...conceptSet.concepts].sort((a, b) => a.concept_number - b.concept_number)
  );
  const [savingConceptId, setSavingConceptId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setConcepts(
      [...conceptSet.concepts].sort((a, b) => a.concept_number - b.concept_number)
    );
  }, [conceptSet]);

  const massDesireIndex = useMemo(() => {
    const sorted = [...desires].sort((a, b) => a.sort_order - b.sort_order);
    const index = sorted.findIndex((d) => d.id === conceptSet.mass_desire_id);
    return Math.max(index, 0);
  }, [desires, conceptSet.mass_desire_id]);

  const allAdsText = useMemo(
    () => formatAllTofAds(concepts, desireTitle),
    [concepts, desireTitle]
  );

  async function handleConceptImageUpdate(updated: DesireConcept) {
    setSaveError(null);
    setSavingConceptId(updated.id);
    try {
      const saved = await onUpdateConcept(updated);
      setConcepts((prev) =>
        prev.map((concept) => (concept.id === saved.id ? saved : concept))
      );
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save TOF image."
      );
      throw err;
    } finally {
      setSavingConceptId(null);
    }
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tof-modal-title"
      onClick={onClose}
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <h2 id="tof-modal-title" className="modal-title">
              TOF Copy Pack
            </h2>
            <p className="modal-subtitle">
              Complete Meta ad units anchored on the mass desire.
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
          <CopyButton text={allAdsText} label="Copy All Ads" />
        </div>

        {saveError ? (
          <div className="modal-banner modal-banner-error" role="alert">
            {saveError}
          </div>
        ) : null}

        <div className="modal-body">
          <div className="copy-pack-ads">
            {concepts.map((concept, index) => {
              const ad = resolveTofAd(concept);
              const naming = resolveTofNaming(concept, massDesireIndex, index);
              const busy = savingConceptId === concept.id;

              return (
                <article
                  key={concept.id}
                  className={`copy-pack-ad${busy ? " is-busy" : ""}`}
                >
                  <div className="copy-pack-ad-head">
                    <div className="copy-pack-ad-title-row">
                      <h4 className="copy-pack-ad-title">{naming.adName}</h4>
                    </div>
                    <div className="copy-pack-ad-actions">
                      <CopyButton
                        text={ad.primary}
                        label="Copy Primary"
                        variant="primary"
                      />
                      <CopyButton
                        text={ad.headline}
                        label="Copy Headline"
                        variant="headline"
                      />
                      <CopyButton
                        text={ad.description}
                        label="Copy Description"
                        variant="description"
                      />
                      <CopyButton
                        text={ad.image_prompt}
                        label="Copy Image Prompt"
                      />
                      <CopyButton
                        text={formatTofFullAd(ad)}
                        label="Copy Full Ad"
                      />
                    </div>
                  </div>

                  <div className="copy-pack-ad-grid">
                    <div className="copy-pack-col">
                      <ReadField label="Headline" value={ad.headline} />
                      <ReadField label="Primary" value={ad.primary} />
                      <ReadField label="Description" value={ad.description} />
                    </div>
                    <div className="copy-pack-col copy-pack-col-visual">
                      <ReadField
                        label="Visual Strategy"
                        value={ad.visual_strategy}
                      />
                      <ReadField label="Image Prompt" value={ad.image_prompt} />
                      <TofImageUpload
                        concept={concept}
                        conceptLabel={naming.adName}
                        projectId={conceptSet.project_id}
                        massDesireId={conceptSet.mass_desire_id}
                        safeFilename={naming.safeFilename}
                        disabled={busy}
                        onUpdate={handleConceptImageUpdate}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
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
