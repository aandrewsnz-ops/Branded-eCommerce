import { AlertTriangle, Compass, HeartPulse, Loader2, PenLine, Sparkles } from "lucide-react";
import type {
  AdCopySet,
  CreativePromptSet,
  MarketingAngle,
  MassDesire,
} from "../types";
import { AngleReviewBadges } from "./shared";
import { copySetForAngle, creativeSetForAngle } from "./workflow";

interface StrategyMatrixProps {
  desires: MassDesire[];
  angles: MarketingAngle[];
  copySets: AdCopySet[];
  creativePromptSets: CreativePromptSet[];

  isGeneratingDesires: boolean;
  isGeneratingAngles: boolean;
  isLoading: boolean;
  desiresError: string | null;
  anglesError: string | null;

  onGenerateDesires: () => void;
  onGenerateAngles: () => void;

  generatingCopyAngleId: string | null;
  generatingCreativePromptAngleId: string | null;

  selectedAngleId: string | null;
  selectedDesireId: string | null;
  onSelectAngle: (id: string) => void;
  onSelectDesire: (id: string) => void;
}

export function StrategyMatrix({
  desires,
  angles,
  copySets,
  creativePromptSets,
  isGeneratingDesires,
  isGeneratingAngles,
  isLoading,
  desiresError,
  anglesError,
  onGenerateDesires,
  onGenerateAngles,
  generatingCopyAngleId,
  generatingCreativePromptAngleId,
  selectedAngleId,
  selectedDesireId,
  onSelectAngle,
  onSelectDesire,
}: StrategyMatrixProps) {
  return (
    <div className="workspace">
      <div className="workspace-head">
        <div>
          <h2 className="workspace-title">Strategy</h2>
          <p className="workspace-sub">
            {desires.length} desires · {angles.length} angles
          </p>
        </div>
        <div className="workspace-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onGenerateDesires}
            disabled={isGeneratingDesires}
          >
            {isGeneratingDesires ? (
              <Loader2 size={14} strokeWidth={2.5} className="spin" />
            ) : (
              <HeartPulse size={14} strokeWidth={2.5} />
            )}
            {isGeneratingDesires ? "Generating…" : "Generate Mass Desires"}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onGenerateAngles}
            disabled={isGeneratingAngles}
          >
            {isGeneratingAngles ? (
              <Loader2 size={14} strokeWidth={2.5} className="spin" />
            ) : (
              <Compass size={14} strokeWidth={2.5} />
            )}
            {isGeneratingAngles ? "Generating…" : "Generate Marketing Angles"}
          </button>
        </div>
      </div>

      {desiresError ? (
        <div className="banner banner-error" role="alert">
          <AlertTriangle size={16} />
          <span>{desiresError}</span>
        </div>
      ) : null}
      {anglesError ? (
        <div className="banner banner-error" role="alert">
          <AlertTriangle size={16} />
          <span>{anglesError}</span>
        </div>
      ) : null}

      {isGeneratingDesires || isGeneratingAngles || isLoading ? (
        <div className="list-state">
          <Loader2 size={16} strokeWidth={2} className="spin" />
          <span>
            {isGeneratingAngles
              ? "Generating marketing angles… this can take a few minutes."
              : isGeneratingDesires
                ? "Generating mass desires… this can take a minute."
                : "Loading strategy…"}
          </span>
        </div>
      ) : null}

      {!isLoading && desires.length === 0 && !isGeneratingDesires ? (
        <div className="empty-state">
          <HeartPulse size={32} strokeWidth={1.5} />
          <p>No mass desires yet. Generate them to build the strategy matrix.</p>
        </div>
      ) : null}

      {desires.length > 0 ? (
        <div className="matrix">
          {desires.map((desire, index) => {
            const desireAngles = angles
              .filter((a) => a.mass_desire_id === desire.id)
              .sort((a, b) => a.sort_order - b.sort_order);

            return (
              <div key={desire.id} className="matrix-row">
                <button
                  type="button"
                  className={`matrix-desire${selectedDesireId === desire.id ? " is-active" : ""}`}
                  onClick={() => onSelectDesire(desire.id)}
                >
                  <span className="stage-index">{index + 1}</span>
                  <h4 className="matrix-desire-title">
                    {desire.desire_statement}
                  </h4>
                  {desire.audience_segment ? (
                    <span className="meta-chip meta-chip-theme">
                      {desire.audience_segment}
                    </span>
                  ) : null}
                  <p className="matrix-desire-row">
                    <strong>Driver:</strong> {desire.emotional_driver}
                  </p>
                  <p className="matrix-desire-row">
                    <strong>Really buying:</strong>{" "}
                    {desire.what_they_are_really_buying}
                  </p>
                </button>

                <div className="matrix-cells">
                  {desireAngles.length === 0 ? (
                    <p className="matrix-empty-cell">No angles yet</p>
                  ) : (
                    desireAngles.map((angle) => {
                      const copySet = copySetForAngle(angle.id, copySets);
                      const creative = creativeSetForAngle(
                        angle.id,
                        copySets,
                        creativePromptSets
                      );
                      const busy =
                        generatingCopyAngleId === angle.id ||
                        generatingCreativePromptAngleId === angle.id;

                      return (
                        <button
                          key={angle.id}
                          type="button"
                          className={`angle-cell${selectedAngleId === angle.id ? " is-active" : ""}`}
                          onClick={() => onSelectAngle(angle.id)}
                        >
                          <div className="angle-cell-head">
                            <h5 className="angle-cell-title">
                              {angle.angle_name}
                            </h5>
                            {busy ? (
                              <Loader2
                                size={13}
                                strokeWidth={2.5}
                                className="spin"
                              />
                            ) : null}
                          </div>
                          <p className="angle-cell-text">
                            {angle.crisis_or_realization_moment}
                          </p>
                          <AngleReviewBadges angle={angle} />
                          <div className="angle-cell-foot">
                            {angle.priority_score > 0 ? (
                              <span className="cell-flag cell-flag-priority">
                                P{angle.priority_score}
                              </span>
                            ) : null}
                            {copySet ? (
                              <span className="cell-flag cell-flag-copy">
                                <PenLine size={11} /> Copy
                              </span>
                            ) : null}
                            {creative ? (
                              <span className="cell-flag cell-flag-creative">
                                <Sparkles size={11} /> Creative
                              </span>
                            ) : null}
                            {copySet || creative ? (
                              <span className="cell-flag cell-flag-draft">
                                Raw draft
                              </span>
                            ) : null}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
