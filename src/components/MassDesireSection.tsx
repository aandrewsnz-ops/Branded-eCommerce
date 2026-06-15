import { Loader2, PenLine } from "lucide-react";
import type {
  AdCopySet,
  AngleReviewPatch,
  DesireConceptSet,
  MarketingAngle,
  MassDesire,
} from "../types";
import {
  conceptSetForDesire,
  conceptSetHasCopy,
  conceptSetImageBadgeLabel,
  copySetForAngle,
} from "./workflow";

import { MarketingAngleCard } from "./MarketingAngleCard";

interface MassDesireSectionProps {
  desire: MassDesire;
  index: number;
  angles: MarketingAngle[];
  copySets: AdCopySet[];
  conceptSets: DesireConceptSet[];
  generatingTofDesireId: string | null;
  generatingCopyAngleId: string | null;
  savingReviewAngleId: string | null;
  onGenerateTofConcepts: (desireId: string) => void;
  onOpenTofConcepts: (conceptSet: DesireConceptSet) => void;
  onGenerateCopy: (angleId: string) => void;
  onUpdateAngleReview: (angleId: string, updates: AngleReviewPatch) => void;
  onOpenCopyPack: (copySet: AdCopySet, angleName: string) => void;
}

function DesireField({ label, value }: { label: string; value: string }) {
  if (!value?.trim()) return null;
  return (
    <p className="angle-field">
      <span className="angle-field-label">{label}</span>
      <span className="angle-field-value">{value}</span>
    </p>
  );
}

export function MassDesireSection({
  desire,
  index,
  angles,
  copySets,
  conceptSets,
  generatingTofDesireId,
  generatingCopyAngleId,
  savingReviewAngleId,
  onGenerateTofConcepts,
  onOpenTofConcepts,
  onGenerateCopy,
  onUpdateAngleReview,
  onOpenCopyPack,
}: MassDesireSectionProps) {
  const desireAngles = angles
    .filter((a) => a.mass_desire_id === desire.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const conceptSet = conceptSetForDesire(desire.id, conceptSets);
  const hasTofCopy = conceptSetHasCopy(conceptSet);
  const isGeneratingTof = generatingTofDesireId === desire.id;
  const imageBadgeLabel = conceptSetImageBadgeLabel(conceptSet);

  const angleCountLabel =
    desireAngles.length === 1 ? "1 angle" : `${desireAngles.length} angles`;

  return (
    <section className="strategy-desire-group">
      <header className="strategy-desire-header">
        <div className="strategy-desire-header-top">
          <span className="stage-index">{index + 1}</span>
          <h3 className="desire-card-title">{desire.desire_statement}</h3>
          <span className="strategy-angle-count">{angleCountLabel}</span>
          <div className="strategy-desire-header-actions">
            {hasTofCopy && conceptSet ? (
              <>
                <button
                  type="button"
                  className="angle-badge angle-badge-copy"
                  onClick={() => onOpenTofConcepts(conceptSet)}
                  title="View saved TOF copy pack"
                >
                  Show Copy
                </button>
                {imageBadgeLabel ? (
                  <span className="angle-badge angle-badge-images">
                    {imageBadgeLabel}
                  </span>
                ) : null}
              </>
            ) : null}
            <button
              type="button"
              className="btn btn-primary btn-sm angle-generate-btn"
              disabled={isGeneratingTof}
              onClick={() => onGenerateTofConcepts(desire.id)}
            >
              {isGeneratingTof ? (
                <Loader2 size={14} strokeWidth={2.5} className="spin" />
              ) : (
                <PenLine size={14} strokeWidth={2.5} />
              )}
              {isGeneratingTof ? "Generating…" : "Generate Copy"}
            </button>
          </div>
        </div>

        {desire.audience_segment ? (
          <span className="meta-chip meta-chip-theme strategy-audience-band">
            {desire.audience_segment}
          </span>
        ) : null}

        <div className="strategy-desire-header-main">
          <div className="desire-card-fields">
            <DesireField
              label="What they're really buying"
              value={desire.what_they_are_really_buying}
            />
            <DesireField
              label="Emotional driver"
              value={desire.emotional_driver}
            />
            <DesireField label="Life context" value={desire.life_context} />
            <DesireField
              label="Pain it moves away from"
              value={desire.pain_it_moves_away_from}
            />
            <DesireField
              label="Positive outcome it moves toward"
              value={desire.positive_outcome_it_moves_toward}
            />
            <DesireField
              label="Why this desire is distinct"
              value={desire.why_this_desire_is_distinct}
            />
            <DesireField label="Copy direction" value={desire.copy_direction} />
            <DesireField
              label="Messaging to avoid"
              value={desire.messaging_to_avoid}
            />
          </div>
          {desire.compliance_notes.length > 0 ? (
            <div className="angle-field">
              <span className="angle-field-label">Compliance notes</span>
              <ul className="bullet-list">
                {desire.compliance_notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </header>

      {desireAngles.length === 0 ? (
        <p className="matrix-empty-cell">No angles yet for this desire.</p>
      ) : (
        <div className="strategy-angle-grid">
          {desireAngles.map((angle) => (
            <MarketingAngleCard
              key={angle.id}
              angle={angle}
              desireStatement={undefined}
              copySet={copySetForAngle(angle.id, copySets)}
              isGeneratingCopy={generatingCopyAngleId === angle.id}
              isSavingReview={savingReviewAngleId === angle.id}
              onGenerateCopy={() => onGenerateCopy(angle.id)}
              onOpenCopy={(copySet) => onOpenCopyPack(copySet, angle.angle_name)}
              onUpdateReview={(updates) =>
                onUpdateAngleReview(angle.id, updates)
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
