import {
  AlertTriangle,
  Compass,
  HeartPulse,
  Loader2,
} from "lucide-react";
import type {
  AdCopySet,
  AngleReviewPatch,
  DesireConceptSet,
  MarketingAngle,
  MassDesire,
} from "../types";
import { MassDesireSection } from "./MassDesireSection";

interface StrategyWorkspaceProps {
  desires: MassDesire[];
  angles: MarketingAngle[];
  copySets: AdCopySet[];
  conceptSets: DesireConceptSet[];

  isGeneratingDesires: boolean;
  isGeneratingAngles: boolean;
  isLoading: boolean;
  desiresError: string | null;
  anglesError: string | null;
  copyError: string | null;
  tofError: string | null;

  onGenerateDesires: () => void;
  onGenerateAngles: () => void;

  generatingTofDesireId: string | null;
  generatingCopyAngleId: string | null;
  savingReviewAngleId: string | null;
  onGenerateTofConcepts: (desireId: string) => void;
  onOpenTofConcepts: (conceptSet: DesireConceptSet) => void;
  onGenerateCopy: (angleId: string) => void;
  onUpdateAngleReview: (angleId: string, updates: AngleReviewPatch) => void;
  onOpenCopyPack: (copySet: AdCopySet, angleName: string) => void;
}

export function StrategyWorkspace({
  desires,
  angles,
  copySets,
  conceptSets,
  isGeneratingDesires,
  isGeneratingAngles,
  isLoading,
  desiresError,
  anglesError,
  copyError,
  tofError,
  onGenerateDesires,
  onGenerateAngles,
  generatingTofDesireId,
  generatingCopyAngleId,
  savingReviewAngleId,
  onGenerateTofConcepts,
  onOpenTofConcepts,
  onGenerateCopy,
  onUpdateAngleReview,
  onOpenCopyPack,
}: StrategyWorkspaceProps) {
  return (
    <div className="workspace workspace-full">
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
      {copyError ? (
        <div className="banner banner-error" role="alert">
          <AlertTriangle size={16} />
          <span>{copyError}</span>
        </div>
      ) : null}
      {tofError ? (
        <div className="banner banner-error" role="alert">
          <AlertTriangle size={16} />
          <span>{tofError}</span>
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
          <p>No mass desires yet. Generate them to build the strategy.</p>
        </div>
      ) : null}

      {desires.length > 0 ? (
        <div className="desire-stack">
          {desires.map((desire, index) => (
            <MassDesireSection
              key={desire.id}
              desire={desire}
              index={index}
              angles={angles}
              copySets={copySets}
              conceptSets={conceptSets}
              generatingTofDesireId={generatingTofDesireId}
              generatingCopyAngleId={generatingCopyAngleId}
              savingReviewAngleId={savingReviewAngleId}
              onGenerateTofConcepts={onGenerateTofConcepts}
              onOpenTofConcepts={onOpenTofConcepts}
              onGenerateCopy={onGenerateCopy}
              onUpdateAngleReview={onUpdateAngleReview}
              onOpenCopyPack={onOpenCopyPack}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
