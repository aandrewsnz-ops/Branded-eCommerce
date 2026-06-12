import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Loader2,
  PenLine,
  Rocket,
  Star,
  ThumbsDown,
} from "lucide-react";
import type { AdCopySet, AngleReviewPatch, MarketingAngle } from "../types";
import { copySetHasWinners, copySetImageBadgeLabel } from "./workflow";

interface MarketingAngleCardProps {
  angle: MarketingAngle;
  number?: number;
  desireStatement?: string;
  copySet?: AdCopySet;
  isGeneratingCopy: boolean;
  isSavingReview: boolean;
  onGenerateCopy: () => void;
  onOpenCopy: (copySet: AdCopySet) => void;
  onUpdateReview: (updates: AngleReviewPatch) => void;
  defaultExpanded?: boolean;
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value?.trim()) return null;
  return (
    <p className="angle-field">
      <span className="angle-field-label">{label}</span>
      <span className="angle-field-value">{value}</span>
    </p>
  );
}

export function MarketingAngleCard({
  angle,
  number,
  desireStatement,
  copySet,
  isGeneratingCopy,
  isSavingReview,
  onGenerateCopy,
  onOpenCopy,
  onUpdateReview,
  defaultExpanded = false,
}: MarketingAngleCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasCopy = Boolean(copySet);
  const isShortlisted =
    angle.is_shortlisted || angle.review_status === "shortlisted";
  const isRejected = angle.review_status === "rejected";
  const isPublished = angle.review_status === "published";
  const imageBadgeLabel = copySet ? copySetImageBadgeLabel(copySet) : null;

  // Debounced reviewer notes (persisted via onUpdateReview).
  const [localNotes, setLocalNotes] = useState(angle.reviewer_notes ?? "");
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedNotesRef = useRef(angle.reviewer_notes ?? "");

  useEffect(() => {
    return () => {
      if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
    };
  }, []);

  function handleNotesChange(value: string) {
    setLocalNotes(value);
    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
    notesDebounceRef.current = setTimeout(() => {
      if (value !== lastSavedNotesRef.current) {
        lastSavedNotesRef.current = value;
        onUpdateReview({ reviewer_notes: value });
      }
    }, 600);
  }

  return (
    <article
      className={`angle-card${isRejected ? " is-rejected" : ""}${
        isPublished ? " is-published" : ""
      }`}
    >
      <header className="angle-card-head">
        <div className="angle-card-headline">
          {typeof number === "number" ? (
            <span className="angle-card-number">
              {String(number).padStart(2, "0")}
            </span>
          ) : null}
          <h4 className="angle-card-title">{angle.angle_name}</h4>
        </div>
        {isGeneratingCopy ? (
          <Loader2 size={14} strokeWidth={2.5} className="spin" />
        ) : null}
      </header>

      {/* Status badges */}
      <div className="angle-badges">
        {hasCopy && copySet ? (
          <>
            <button
              type="button"
              className="angle-badge angle-badge-copy"
              onClick={() => onOpenCopy(copySet)}
              title="View saved copy pack"
            >
              Show Copy
            </button>
            {copySet.is_edited ? (
              <span className="angle-badge angle-badge-edited">Edited</span>
            ) : null}
            {copySetHasWinners(copySet) ? (
              <span className="angle-badge angle-badge-winner">Winner Selected</span>
            ) : null}
            {imageBadgeLabel ? (
              <span className="angle-badge angle-badge-images">
                {imageBadgeLabel}
              </span>
            ) : null}
          </>
        ) : (
          <span className="angle-badge angle-badge-empty">No copy yet</span>
        )}
        {isShortlisted ? (
          <span className="angle-badge angle-badge-shortlist">Shortlisted</span>
        ) : null}
        {isRejected ? (
          <span className="angle-badge angle-badge-reject">Rejected</span>
        ) : null}
        {isPublished ? (
          <span className="angle-badge angle-badge-published">Published</span>
        ) : null}
      </div>

      {/* Generate Copy sits directly under the heading + badges */}
      <button
        type="button"
        className="btn btn-primary btn-sm angle-generate-btn"
        onClick={onGenerateCopy}
        disabled={isGeneratingCopy}
      >
        {isGeneratingCopy ? (
          <Loader2 size={14} strokeWidth={2.5} className="spin" />
        ) : (
          <PenLine size={14} strokeWidth={2.5} />
        )}
        {isGeneratingCopy ? "Generating…" : "Generate Copy"}
      </button>

      {desireStatement ? (
        <p className="angle-card-desire">
          <span className="angle-field-label">Mass desire</span>
          {desireStatement}
        </p>
      ) : null}

      <div className="angle-card-fields">
        <Field label="Target audience" value={angle.target_audience} />
        <Field
          label="Crisis / realization moment"
          value={angle.crisis_or_realization_moment}
        />
        <Field
          label="Key emotional moment"
          value={angle.key_emotional_moment}
        />
        <Field label="Creative direction" value={angle.creative_direction} />
        <Field label="Copy direction" value={angle.copy_direction} />
      </div>

      <button
        type="button"
        className="angle-card-expand"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <ChevronDown
          size={14}
          className={`angle-notes-chevron${expanded ? " is-open" : ""}`}
        />
        {expanded ? "Hide full angle details" : "Show full angle details"}
      </button>

      {expanded ? (
        <div className="angle-card-fields angle-card-fields-full">
          <Field label="Story arc" value={angle.story_arc} />
          <Field
            label="Beginning situation"
            value={angle.beginning_situation}
          />
          <Field label="Discovery moment" value={angle.discovery_moment} />
          <Field label="Resolution" value={angle.resolution} />
          <Field
            label="Unique problem mechanism"
            value={angle.unique_problem_mechanism}
          />
          <Field
            label="Unique solution mechanism"
            value={angle.unique_solution_mechanism}
          />
          {angle.real_language_patterns.length > 0 ? (
            <div className="angle-field">
              <span className="angle-field-label">Real language patterns</span>
              <ul className="phrase-list">
                {angle.real_language_patterns.map((p, i) => (
                  <li key={i} className="phrase">
                    “{p}”
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {angle.compliance_notes.length > 0 ? (
            <div className="angle-field">
              <span className="angle-field-label">Compliance notes</span>
              <ul className="bullet-list">
                {angle.compliance_notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Footer: review actions sit at the bottom and align across cards */}
      <div className="angle-card-footer">
        <div className="angle-review-actions">
          <button
            type="button"
            className={`btn btn-sm angle-shortlist-btn${isShortlisted ? " is-active" : ""}`}
            disabled={isSavingReview}
            onClick={() =>
              onUpdateReview({
                is_shortlisted: !isShortlisted,
                review_status: !isShortlisted ? "shortlisted" : "untested",
              })
            }
          >
            <Star
              size={13}
              className={isShortlisted ? "star-filled" : undefined}
            />
            Shortlist
          </button>
          <button
            type="button"
            className={`btn btn-sm angle-quick-btn${isRejected ? " is-active-bad" : ""}`}
            disabled={isSavingReview}
            onClick={() =>
              onUpdateReview({
                is_shortlisted: false,
                review_status: "rejected",
              })
            }
          >
            <ThumbsDown size={13} />
            Reject
          </button>
          <button
            type="button"
            className={`btn btn-sm angle-quick-btn${isPublished ? " is-active-good" : ""}`}
            disabled={isSavingReview}
            onClick={() =>
              onUpdateReview({
                is_shortlisted: false,
                review_status: "published",
              })
            }
          >
            <Rocket size={13} />
            Published
          </button>
        </div>

        <div className="angle-priority-row">
          <span className="angle-priority-label">Priority</span>
          <div
            className="priority-score-group"
            role="group"
            aria-label="Priority score"
          >
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                type="button"
                className={`priority-score-btn${angle.priority_score === score ? " is-active" : ""}`}
                disabled={isSavingReview}
                onClick={() =>
                  onUpdateReview({
                    priority_score:
                      angle.priority_score === score ? 0 : score,
                  })
                }
                aria-pressed={angle.priority_score === score}
              >
                {score}
              </button>
            ))}
          </div>
        </div>

        <div className="angle-notes-row">
          <label
            className="angle-priority-label"
            htmlFor={`reviewer-notes-${angle.id}`}
          >
            Reviewer notes
          </label>
          <textarea
            id={`reviewer-notes-${angle.id}`}
            className="angle-notes-input"
            rows={2}
            placeholder="Add review notes…"
            value={localNotes}
            disabled={isSavingReview}
            onChange={(event) => handleNotesChange(event.target.value)}
          />
        </div>
      </div>
    </article>
  );
}
