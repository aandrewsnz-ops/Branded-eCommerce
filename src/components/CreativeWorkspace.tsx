import { useState } from "react";
import { AlertTriangle, Loader2, PenLine, Sparkles } from "lucide-react";
import type {
  AdCopySet,
  CreativePromptSet,
  MarketingAngle,
} from "../types";
import type { CreativeFilterId } from "./workflow";
import {
  CREATIVE_FILTERS,
  copySetForAngle,
  creativeSetForAngle,
} from "./workflow";
import { AngleReviewBadges } from "./shared";

interface CreativeWorkspaceProps {
  angles: MarketingAngle[];
  copySets: AdCopySet[];
  creativePromptSets: CreativePromptSet[];
  copyError: string | null;
  creativePromptError: string | null;
  generatingCopyAngleId: string | null;
  generatingCreativePromptAngleId: string | null;
  selectedAngleId: string | null;
  onSelectAngle: (id: string) => void;
}

function passesFilter(
  angle: MarketingAngle,
  filter: CreativeFilterId,
  hasCopy: boolean,
  hasCreative: boolean
): boolean {
  switch (filter) {
    case "all":
      return (
        hasCopy ||
        hasCreative ||
        angle.is_shortlisted ||
        angle.review_status === "ready_for_creative" ||
        angle.review_status === "ready_to_publish"
      );
    case "shortlisted":
      return angle.is_shortlisted || angle.review_status === "shortlisted";
    case "needs_copy":
      return !hasCopy;
    case "has_copy":
      return hasCopy;
    case "needs_creative":
      return hasCopy && !hasCreative;
    case "has_creative":
      return hasCreative;
    case "ready_for_review":
      return (
        angle.review_status === "ready_for_creative" ||
        angle.review_status === "ready_to_publish"
      );
    default:
      return true;
  }
}

export function CreativeWorkspace({
  angles,
  copySets,
  creativePromptSets,
  copyError,
  creativePromptError,
  generatingCopyAngleId,
  generatingCreativePromptAngleId,
  selectedAngleId,
  onSelectAngle,
}: CreativeWorkspaceProps) {
  const [filter, setFilter] = useState<CreativeFilterId>("all");

  const visible = angles.filter((angle) => {
    const hasCopy = Boolean(copySetForAngle(angle.id, copySets));
    const hasCreative = Boolean(
      creativeSetForAngle(angle.id, copySets, creativePromptSets)
    );
    return passesFilter(angle, filter, hasCopy, hasCreative);
  });

  return (
    <div className="workspace">
      <div className="workspace-head">
        <div>
          <h2 className="workspace-title">Creative</h2>
          <p className="workspace-sub">Production assets per angle</p>
        </div>
      </div>

      <p className="conversion-first-note">
        Conversion first raw draft. Run Compliance Check before publishing.
      </p>

      {copyError ? (
        <div className="banner banner-error" role="alert">
          <AlertTriangle size={16} />
          <span>{copyError}</span>
        </div>
      ) : null}
      {creativePromptError ? (
        <div className="banner banner-error" role="alert">
          <AlertTriangle size={16} />
          <span>{creativePromptError}</span>
        </div>
      ) : null}

      {angles.length > 0 ? (
        <div className="filter-bar" role="group" aria-label="Filter creative">
          {CREATIVE_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`filter-btn${filter === f.id ? " is-active" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      ) : null}

      {angles.length === 0 ? (
        <div className="empty-state">
          <Sparkles size={32} strokeWidth={1.5} />
          <p>
            No marketing angles yet. Build the strategy matrix first, then
            generate quick copy and creative prompts.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className="list-state">No angles match this filter.</div>
      ) : (
        <div className="card-grid card-grid-wide">
          {visible.map((angle) => {
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
                className={`asset-card${selectedAngleId === angle.id ? " is-active" : ""}`}
                onClick={() => onSelectAngle(angle.id)}
              >
                <div className="asset-card-head">
                  <h4 className="asset-card-title">{angle.angle_name}</h4>
                  {busy ? (
                    <Loader2 size={14} strokeWidth={2.5} className="spin" />
                  ) : null}
                </div>
                <p className="asset-card-text">{angle.target_audience}</p>
                <AngleReviewBadges angle={angle} />
                <div className="asset-card-status">
                  <span
                    className={`asset-flag${copySet ? " is-done" : ""}`}
                  >
                    <PenLine size={12} />
                    {copySet ? "Quick copy" : "No quick copy"}
                  </span>
                  <span
                    className={`asset-flag${creative ? " is-done" : ""}`}
                  >
                    <Sparkles size={12} />
                    {creative ? "Creative prompts" : "No creative prompts"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
