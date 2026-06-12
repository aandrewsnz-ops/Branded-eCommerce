import { useState } from "react";
import {
  CheckCircle2,
  Loader2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import type {
  AdCandidate,
  AdCandidatePatch,
  CreativePromptSet,
  ImagePrompt,
  MarketingAngle,
} from "../types";
import { CopyButton } from "./shared";
import { formatImagePromptForCopy } from "./workflow";

interface AdCandidateCardProps {
  candidate: AdCandidate;
  angle?: MarketingAngle;
  creativeSet?: CreativePromptSet;
  isSaving: boolean;
  onPatch: (patch: AdCandidatePatch) => void;
}

const STATUS_LABELS: Record<AdCandidate["status"], string> = {
  draft: "Draft",
  ready: "Ready to publish",
  needs_revision: "Needs revision",
};

function buildFullAd(candidate: AdCandidate): string {
  return [
    candidate.ad_title ? `# ${candidate.ad_title}` : "",
    "",
    candidate.selected_primary_text
      ? `Primary text:\n${candidate.selected_primary_text}`
      : "",
    "",
    candidate.selected_headline
      ? `Headline:\n${candidate.selected_headline}`
      : "",
    "",
    candidate.selected_description
      ? `Description:\n${candidate.selected_description}`
      : "",
    "",
    candidate.selected_hook ? `Hook:\n${candidate.selected_hook}` : "",
    "",
    candidate.selected_callouts.length > 0
      ? `Callouts:\n${candidate.selected_callouts.map((c) => `- ${c}`).join("\n")}`
      : "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function AdCandidateCard({
  candidate,
  angle,
  creativeSet,
  isSaving,
  onPatch,
}: AdCandidateCardProps) {
  const [notes, setNotes] = useState(candidate.notes);

  const imagePrompts: ImagePrompt[] =
    candidate.selected_image_prompts.length > 0
      ? candidate.selected_image_prompts
      : creativeSet?.image_prompts ?? [];

  const title =
    candidate.ad_title || angle?.angle_name || "Untitled ad";
  const number = candidate.ad_number
    ? String(candidate.ad_number).padStart(2, "0")
    : "—";

  return (
    <article className={`ad-card ad-card-status-${candidate.status}`}>
      <header className="ad-card-head">
        <h3 className="ad-card-title">
          <span className="ad-card-number">Ad {number}</span>
          {title}
        </h3>
        <span className={`ad-status-badge ad-status-${candidate.status}`}>
          {STATUS_LABELS[candidate.status]}
        </span>
      </header>

      {candidate.selected_primary_text ? (
        <div className="ad-field">
          <div className="ad-field-head">
            <span className="ad-field-label">Primary text</span>
            <CopyButton text={candidate.selected_primary_text} />
          </div>
          <p className="ad-field-text">{candidate.selected_primary_text}</p>
        </div>
      ) : (
        <p className="ad-field-missing">No primary text selected</p>
      )}

      {candidate.selected_headline ? (
        <div className="ad-field">
          <div className="ad-field-head">
            <span className="ad-field-label">Headline</span>
            <CopyButton text={candidate.selected_headline} />
          </div>
          <p className="ad-field-text">{candidate.selected_headline}</p>
        </div>
      ) : (
        <p className="ad-field-missing">No headline selected</p>
      )}

      {candidate.selected_description ? (
        <div className="ad-field">
          <div className="ad-field-head">
            <span className="ad-field-label">Description</span>
            <CopyButton text={candidate.selected_description} />
          </div>
          <p className="ad-field-text">{candidate.selected_description}</p>
        </div>
      ) : null}

      {candidate.selected_hook ? (
        <div className="ad-field">
          <span className="ad-field-label">Hook</span>
          <p className="ad-field-text">“{candidate.selected_hook}”</p>
        </div>
      ) : null}

      {candidate.selected_callouts.length > 0 ? (
        <div className="ad-field">
          <span className="ad-field-label">Callouts</span>
          <ul className="bullet-list">
            {candidate.selected_callouts.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {imagePrompts.length > 0 ? (
        <div className="ad-field">
          <span className="ad-field-label">
            Image generation prompts ({imagePrompts.length})
          </span>
          {imagePrompts.map((p, i) => (
            <div key={i} className="ad-image-prompt">
              <div className="ad-field-head">
                <span className="meta-chip">
                  {p.concept_name} · {p.aspect_ratio}
                </span>
                <CopyButton
                  text={formatImagePromptForCopy(p)}
                  label="Copy prompt"
                />
              </div>
              <p className="ad-field-text">{p.prompt}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="compliance-placeholder compliance-placeholder-sm">
        <ShieldCheck size={15} strokeWidth={2} />
        <span>
          Compliance status: pending. Run Compliance Check before publishing
          (coming soon).
        </span>
      </div>

      <div className="ad-field">
        <span className="ad-field-label">Publish notes</span>
        <textarea
          className="brief-input"
          rows={2}
          value={notes}
          disabled={isSaving}
          placeholder="Add publish notes…"
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if (notes !== candidate.notes) onPatch({ notes });
          }}
        />
      </div>

      <div className="ad-card-actions">
        <CopyButton text={buildFullAd(candidate)} label="Copy full ad" />
        <button
          type="button"
          className={`btn btn-sm${candidate.status === "ready" ? " btn-primary" : " btn-secondary"}`}
          disabled={isSaving}
          onClick={() => onPatch({ status: "ready" })}
        >
          {isSaving ? (
            <Loader2 size={14} strokeWidth={2.5} className="spin" />
          ) : (
            <CheckCircle2 size={14} strokeWidth={2.5} />
          )}
          Mark ready to publish
        </button>
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          disabled={isSaving}
          onClick={() => onPatch({ status: "needs_revision" })}
        >
          <RotateCcw size={14} strokeWidth={2.5} />
          Mark needs revision
        </button>
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          disabled
          title="Compliance Check is not implemented yet"
        >
          <ShieldCheck size={14} strokeWidth={2.5} />
          Run Compliance Check
        </button>
      </div>
    </article>
  );
}
