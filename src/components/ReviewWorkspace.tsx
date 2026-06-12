import { useState } from "react";
import { AlertTriangle, ClipboardCheck, ShieldCheck } from "lucide-react";
import type {
  AdCopySet,
  CreativePromptSet,
  MarketingAngle,
} from "../types";
import type { AngleFilterId } from "./workflow";
import {
  ANGLE_FILTERS,
  angleMatchesFilter,
  copySetForAngle,
  creativeSetForAngle,
} from "./workflow";
import { AngleReviewBadges } from "./shared";

interface ReviewWorkspaceProps {
  angles: MarketingAngle[];
  copySets: AdCopySet[];
  creativePromptSets: CreativePromptSet[];
  reviewError: string | null;
  selectedAngleId: string | null;
  onSelectAngle: (id: string) => void;
}

export function ReviewWorkspace({
  angles,
  copySets,
  creativePromptSets,
  reviewError,
  selectedAngleId,
  onSelectAngle,
}: ReviewWorkspaceProps) {
  const [filter, setFilter] = useState<AngleFilterId>("all");

  const total = angles.length;
  const shortlisted = angles.filter(
    (a) => a.is_shortlisted || a.review_status === "shortlisted"
  ).length;
  const rejected = angles.filter((a) => a.review_status === "rejected").length;
  const needsCopy = angles.filter((a) => a.review_status === "needs_copy").length;
  const readyForCreative = angles.filter(
    (a) => a.review_status === "ready_for_creative"
  ).length;
  const readyToPublish = angles.filter(
    (a) => a.review_status === "ready_to_publish"
  ).length;
  const withCopy = angles.filter((a) =>
    Boolean(copySetForAngle(a.id, copySets))
  ).length;
  const withCreative = angles.filter((a) =>
    Boolean(creativeSetForAngle(a.id, copySets, creativePromptSets))
  ).length;

  const visible = angles.filter((a) => angleMatchesFilter(a, filter));

  const stats: { label: string; value: number }[] = [
    { label: "Total angles", value: total },
    { label: "Shortlisted", value: shortlisted },
    { label: "Rejected", value: rejected },
    { label: "Needs copy", value: needsCopy },
    { label: "Ready for creative", value: readyForCreative },
    { label: "Ready to publish", value: readyToPublish },
    { label: "With quick copy", value: withCopy },
    { label: "With creative prompts", value: withCreative },
  ];

  return (
    <div className="workspace">
      <div className="workspace-head">
        <div>
          <h2 className="workspace-title">Review</h2>
          <p className="workspace-sub">Shortlist, score, and prioritise angles</p>
        </div>
      </div>

      {reviewError ? (
        <div className="banner banner-error" role="alert">
          <AlertTriangle size={16} />
          <span>{reviewError}</span>
        </div>
      ) : null}

      <div className="compliance-placeholder">
        <ShieldCheck size={18} strokeWidth={2} />
        <p>
          <strong>Compliance Check</strong> will score raw drafts, flag risk, and
          recommend publish-safe rewrites. (Not implemented yet.)
        </p>
      </div>

      {total > 0 ? (
        <div className="review-stats">
          {stats.map((stat) => (
            <div key={stat.label} className="review-stat">
              <span className="review-stat-value">{stat.value}</span>
              <span className="review-stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      ) : null}

      {total > 0 ? (
        <div className="filter-bar" role="group" aria-label="Filter review">
          {ANGLE_FILTERS.map((f) => (
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

      {total === 0 ? (
        <div className="empty-state">
          <ClipboardCheck size={32} strokeWidth={1.5} />
          <p>No marketing angles yet. Generate angles to start reviewing.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="list-state">No angles match this filter.</div>
      ) : (
        <div className="card-grid card-grid-wide">
          {visible.map((angle) => (
            <button
              key={angle.id}
              type="button"
              className={`review-card${selectedAngleId === angle.id ? " is-active" : ""}`}
              onClick={() => onSelectAngle(angle.id)}
            >
              <div className="review-card-head">
                <h4 className="review-card-title">{angle.angle_name}</h4>
                {angle.priority_score > 0 ? (
                  <span className="cell-flag cell-flag-priority">
                    P{angle.priority_score}
                  </span>
                ) : null}
              </div>
              <p className="review-card-status">
                Status: <strong>{angle.review_status.replace(/_/g, " ")}</strong>
              </p>
              <AngleReviewBadges angle={angle} />
              {angle.reviewer_notes.trim() ? (
                <p className="review-card-notes">
                  {angle.reviewer_notes.slice(0, 120)}
                  {angle.reviewer_notes.length > 120 ? "…" : ""}
                </p>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
