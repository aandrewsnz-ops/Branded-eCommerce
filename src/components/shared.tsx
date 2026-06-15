import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, Loader2, Star } from "lucide-react";
import type {
  AdCopySet,
  AngleReviewPatch,
  AngleReviewStatus,
  CreativePromptSet,
  CustomerAvatarContent,
  MarketingAngle,
} from "../types";
import {
  formatImagePromptForCopy,
  formatUgcScriptForCopy,
  quickCopyWordCount,
} from "./workflow";

/* ------------------------------------------------------------------ */
/* Copy helpers                                                        */
/* ------------------------------------------------------------------ */

interface CopyButtonProps {
  text: string;
  label?: string;
  /** Accent style for field-level copy buttons in the Copy Pack modal. */
  variant?: "default" | "primary" | "headline" | "description";
}

const COPY_BUTTON_VARIANT_CLASS: Record<
  NonNullable<CopyButtonProps["variant"]>,
  string
> = {
  default: "btn-copy",
  primary: "btn-copy btn-copy-field btn-copy-primary",
  headline: "btn-copy btn-copy-field btn-copy-headline",
  description: "btn-copy btn-copy-field btn-copy-description",
};

export function CopyButton({
  text,
  label = "Copy",
  variant = "default",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be unavailable; fail silently.
    }
  }

  return (
    <button
      type="button"
      className={`${COPY_BUTTON_VARIANT_CLASS[variant]}${copied ? " is-copied" : ""}`}
      onClick={() => void handleCopy()}
      disabled={!text.trim()}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : label}
    </button>
  );
}

interface CopyBlockProps {
  text: string;
  label?: string;
}

export function CopyBlock({ text, label }: CopyBlockProps) {
  if (!text.trim()) return null;
  return (
    <div className="copy-block">
      <div className="copy-block-head">
        {label ? <span className="copy-block-label">{label}</span> : null}
        <CopyButton text={text} />
      </div>
      <p className="copy-block-text">{text}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Collapsible / static sections                                       */
/* ------------------------------------------------------------------ */

interface InsightSectionProps {
  title: string;
  children: React.ReactNode;
}

export function InsightSection({ title, children }: InsightSectionProps) {
  return (
    <section className="insight-section">
      <h4 className="insight-section-title">{title}</h4>
      <div className="insight-section-body">{children}</div>
    </section>
  );
}

interface CollapsibleInsightSectionProps {
  title: string;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}

export function CollapsibleInsightSection({
  title,
  children,
  defaultCollapsed = false,
}: CollapsibleInsightSectionProps) {
  const [open, setOpen] = useState(!defaultCollapsed);

  return (
    <section className="insight-section collapsible-section">
      <button
        type="button"
        className="collapsible-head"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <h4 className="insight-section-title">{title}</h4>
        <span className="collapsible-toggle">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? <div className="insight-section-body">{children}</div> : null}
    </section>
  );
}

interface DetailFieldProps {
  label: string;
  value: string;
  multiline?: boolean;
  isLink?: boolean;
}

export function DetailField({
  label,
  value,
  multiline,
  isLink,
}: DetailFieldProps) {
  const hasValue = value.trim().length > 0;
  return (
    <div className={`detail-field${multiline ? " is-multiline" : ""}`}>
      <span className="detail-field-label">{label}</span>
      {hasValue ? (
        isLink ? (
          <a
            className="detail-field-value detail-link"
            href={value}
            target="_blank"
            rel="noreferrer"
          >
            {value}
          </a>
        ) : (
          <span className="detail-field-value">{value}</span>
        )
      ) : (
        <span className="detail-field-value is-empty">—</span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Angle review controls + badges                                      */
/* ------------------------------------------------------------------ */

interface AngleReviewBadgesProps {
  angle: MarketingAngle;
}

export function AngleReviewBadges({ angle }: AngleReviewBadgesProps) {
  const badges: { key: string; label: string; className: string }[] = [];

  if (angle.is_shortlisted) {
    badges.push({
      key: "shortlisted",
      label: "Shortlisted",
      className: "review-badge review-badge-shortlisted",
    });
  }

  if (angle.review_status === "rejected") {
    badges.push({
      key: "rejected",
      label: "Rejected",
      className: "review-badge review-badge-rejected",
    });
  } else if (angle.review_status === "needs_copy") {
    badges.push({
      key: "needs_copy",
      label: "Needs copy",
      className: "review-badge review-badge-needs-copy",
    });
  } else if (angle.review_status === "ready_for_creative") {
    badges.push({
      key: "ready_for_creative",
      label: "Ready for creative",
      className: "review-badge review-badge-ready-creative",
    });
  } else if (angle.review_status === "ready_to_publish") {
    badges.push({
      key: "ready_to_publish",
      label: "Ready to publish",
      className: "review-badge review-badge-ready-publish",
    });
  }

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="angle-review-badges">
      {badges.map((badge) => (
        <span key={badge.key} className={badge.className}>
          {badge.label}
        </span>
      ))}
    </div>
  );
}

interface AngleReviewControlsProps {
  angle: MarketingAngle;
  isSaving: boolean;
  onUpdate: (updates: AngleReviewPatch) => void;
}

export function AngleReviewControls({
  angle,
  isSaving,
  onUpdate,
}: AngleReviewControlsProps) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [localNotes, setLocalNotes] = useState(angle.reviewer_notes);
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedNotesRef = useRef(angle.reviewer_notes);

  useEffect(() => {
    return () => {
      if (notesDebounceRef.current) {
        clearTimeout(notesDebounceRef.current);
      }
    };
  }, []);

  function handleNotesChange(value: string) {
    setLocalNotes(value);
    if (notesDebounceRef.current) {
      clearTimeout(notesDebounceRef.current);
    }
    notesDebounceRef.current = setTimeout(() => {
      if (value !== lastSavedNotesRef.current) {
        lastSavedNotesRef.current = value;
        onUpdate({ reviewer_notes: value });
      }
    }, 600);
  }

  return (
    <div className="angle-review-bar">
      <div className="angle-review-row">
        <label
          className="angle-review-label"
          htmlFor={`review-status-${angle.id}`}
        >
          Status
        </label>
        <select
          id={`review-status-${angle.id}`}
          className="angle-review-select"
          value={angle.review_status}
          disabled={isSaving}
          onChange={(event) =>
            onUpdate({
              review_status: event.target.value as AngleReviewStatus,
            })
          }
        >
          <option value="untested">Untested</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="rejected">Rejected</option>
          <option value="needs_copy">Needs copy</option>
          <option value="ready_for_creative">Ready for creative</option>
          <option value="ready_to_publish">Ready to publish</option>
        </select>

        <button
          type="button"
          className={`btn btn-sm angle-shortlist-btn${angle.is_shortlisted ? " is-active" : ""}`}
          disabled={isSaving}
          onClick={() => onUpdate({ is_shortlisted: !angle.is_shortlisted })}
          aria-pressed={angle.is_shortlisted}
        >
          <Star
            size={14}
            strokeWidth={2}
            className={angle.is_shortlisted ? "star-filled" : undefined}
          />
          {angle.is_shortlisted ? "Shortlisted" : "Shortlist"}
        </button>

        {isSaving ? (
          <span className="angle-review-saving">
            <Loader2 size={12} strokeWidth={2.5} className="spin" />
            Saving…
          </span>
        ) : null}
      </div>

      <div className="angle-review-row">
        <span className="angle-review-label">Priority</span>
        <div
          className="priority-score-group"
          role="group"
          aria-label="Priority score"
        >
          {[0, 1, 2, 3, 4, 5].map((score) => (
            <button
              key={score}
              type="button"
              className={`priority-score-btn${angle.priority_score === score ? " is-active" : ""}`}
              disabled={isSaving}
              onClick={() => onUpdate({ priority_score: score })}
              aria-pressed={angle.priority_score === score}
            >
              {score}
            </button>
          ))}
        </div>
      </div>

      <div className="angle-review-notes">
        <button
          type="button"
          className="angle-review-notes-toggle"
          onClick={() => setNotesOpen((open) => !open)}
          aria-expanded={notesOpen}
        >
          <ChevronDown
            size={14}
            className={`angle-notes-chevron${notesOpen ? " is-open" : ""}`}
          />
          Reviewer notes
          {localNotes.trim() ? (
            <span className="angle-notes-indicator" aria-hidden />
          ) : null}
        </button>
        {notesOpen ? (
          <textarea
            className="angle-review-notes-input"
            rows={3}
            placeholder="Add review notes…"
            value={localNotes}
            disabled={isSaving}
            onChange={(event) => handleNotesChange(event.target.value)}
          />
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Quick copy + creative prompt displays                               */
/* ------------------------------------------------------------------ */

interface QuickCopyDisplayProps {
  copySet: AdCopySet;
}

export function QuickCopyDisplay({ copySet }: QuickCopyDisplayProps) {
  const isLegacyLongStory = quickCopyWordCount(copySet.long_form_story) > 120;
  const hasLegacyHookTransitions = copySet.hook_transitions.length > 0;
  const isLegacyLargeHooks = copySet.hooks.length > 5;
  const isLegacyLargeHeadlines = copySet.headlines.length > 5;
  const isLegacyLargeShortTexts = copySet.short_primary_texts.length > 3;
  const isLegacyLargeMediumTexts = copySet.medium_primary_texts.length > 2;

  return (
    <div className="copy-set copy-set-quick">
      <div className="copy-set-head">
        <h6 className="angle-list-title">
          Quick copy pack <span className="raw-draft-badge">Raw draft</span>
        </h6>
        <span className="insight-date">
          {new Date(copySet.created_at).toLocaleString()}
        </span>
      </div>

      <p className="conversion-first-note">
        Conversion first raw draft. Run Compliance Check before publishing.
      </p>

      {copySet.long_form_story.trim() ? (
        <CollapsibleInsightSection
          title="Concept summary"
          defaultCollapsed={isLegacyLongStory}
        >
          <CopyBlock text={copySet.long_form_story} />
        </CollapsibleInsightSection>
      ) : null}

      {copySet.short_primary_texts.length > 0 ? (
        <CollapsibleInsightSection
          title={`Short primary texts (${copySet.short_primary_texts.length})`}
          defaultCollapsed={isLegacyLargeShortTexts}
        >
          {copySet.short_primary_texts.map((item, i) => (
            <div key={i} className="insight-card insight-card-compact">
              <div className="copy-block-head">
                <h5 className="insight-card-title">
                  {item.label || `Short ${i + 1}`}
                </h5>
                <CopyButton text={item.text} />
              </div>
              <p className="copy-block-text copy-block-text-compact">
                {item.text}
              </p>
            </div>
          ))}
        </CollapsibleInsightSection>
      ) : null}

      {copySet.medium_primary_texts.length > 0 ? (
        <CollapsibleInsightSection
          title={`Medium primary texts (${copySet.medium_primary_texts.length})`}
          defaultCollapsed={isLegacyLargeMediumTexts}
        >
          {copySet.medium_primary_texts.map((item, i) => (
            <div key={i} className="insight-card insight-card-compact">
              <div className="copy-block-head">
                <h5 className="insight-card-title">
                  {item.label || `Medium ${i + 1}`}
                </h5>
                <CopyButton text={item.text} />
              </div>
              <p className="copy-block-text copy-block-text-compact">
                {item.text}
              </p>
            </div>
          ))}
        </CollapsibleInsightSection>
      ) : null}

      {copySet.headlines.length > 0 ? (
        <CollapsibleInsightSection
          title={`Headlines (${copySet.headlines.length})`}
          defaultCollapsed={isLegacyLargeHeadlines}
        >
          <ul className="copy-list">
            {copySet.headlines.map((item, i) => (
              <li key={i} className="copy-list-item">
                <span>{item.text}</span>
                <CopyButton text={item.text} label="Copy" />
              </li>
            ))}
          </ul>
        </CollapsibleInsightSection>
      ) : null}

      {copySet.descriptions.length > 0 ? (
        <CollapsibleInsightSection
          title={`Descriptions (${copySet.descriptions.length})`}
        >
          <ul className="copy-list">
            {copySet.descriptions.map((item, i) => (
              <li key={i} className="copy-list-item">
                <span>{item.text}</span>
                <CopyButton text={item.text} label="Copy" />
              </li>
            ))}
          </ul>
        </CollapsibleInsightSection>
      ) : null}

      {copySet.hooks.length > 0 ? (
        <CollapsibleInsightSection
          title={`Hooks (${copySet.hooks.length})`}
          defaultCollapsed={isLegacyLargeHooks}
        >
          <ul className="copy-list">
            {copySet.hooks.map((hook, i) => (
              <li key={i} className="copy-list-item copy-list-item-hook">
                <span>“{hook.text}”</span>
                <CopyButton text={hook.text} label="Copy" />
              </li>
            ))}
          </ul>
        </CollapsibleInsightSection>
      ) : null}

      {hasLegacyHookTransitions ? (
        <CollapsibleInsightSection
          title={`Hook transitions (${copySet.hook_transitions.length})`}
          defaultCollapsed
        >
          {copySet.hook_transitions.map((transition, i) => (
            <div key={i} className="insight-card insight-card-compact">
              <div className="copy-block-head">
                <h5 className="insight-card-title">Hook: {transition.hook}</h5>
                <CopyButton text={transition.transition_paragraph} />
              </div>
              <p className="copy-block-text">
                {transition.transition_paragraph}
              </p>
            </div>
          ))}
        </CollapsibleInsightSection>
      ) : null}

      {copySet.callouts.length > 0 ? (
        <CollapsibleInsightSection
          title={`Callouts (${copySet.callouts.length})`}
        >
          <ul className="copy-list">
            {copySet.callouts.map((callout, i) => (
              <li key={i} className="copy-list-item">
                <span>
                  <span className="meta-chip">{callout.use_case}</span>{" "}
                  {callout.text}
                </span>
                <CopyButton text={callout.text} label="Copy" />
              </li>
            ))}
          </ul>
        </CollapsibleInsightSection>
      ) : null}

      {copySet.compliance_notes.length > 0 ? (
        <CollapsibleInsightSection
          title={`Compliance (${copySet.compliance_notes.length})`}
          defaultCollapsed
        >
          {copySet.compliance_notes.map((note, i) => (
            <div
              key={i}
              className="insight-card insight-card-warning insight-card-compact"
            >
              <h5 className="insight-card-title">{note.risk}</h5>
              <p className="insight-text">
                <strong>Safer:</strong> {note.safer_direction}
              </p>
            </div>
          ))}
        </CollapsibleInsightSection>
      ) : null}
    </div>
  );
}

interface CreativePromptsDisplayProps {
  promptSet: CreativePromptSet;
}

export function CreativePromptsDisplay({
  promptSet,
}: CreativePromptsDisplayProps) {
  return (
    <div className="copy-set creative-prompt-set">
      <div className="copy-set-head">
        <h6 className="angle-list-title">
          Creative prompt pack{" "}
          <span className="raw-draft-badge">Raw draft</span>
        </h6>
        <span className="insight-date">
          {new Date(promptSet.created_at).toLocaleString()}
        </span>
      </div>

      <p className="conversion-first-note">
        Conversion first raw draft. Run Compliance Check before publishing.
      </p>

      {promptSet.creative_concepts.length > 0 ? (
        <CollapsibleInsightSection
          title={`Creative concepts (${promptSet.creative_concepts.length})`}
        >
          {promptSet.creative_concepts.map((concept, i) => (
            <div key={i} className="insight-card insight-card-compact">
              <h5 className="insight-card-title">{concept.concept_name}</h5>
              <p className="insight-text">
                <span className="meta-chip">{concept.format}</span>{" "}
                <span className="meta-chip">{concept.recommended_use}</span>
              </p>
              <p className="insight-text">
                <strong>Core idea:</strong> {concept.core_idea}
              </p>
              <p className="insight-text">
                <strong>Why it matches:</strong>{" "}
                {concept.why_it_matches_the_angle}
              </p>
              <p className="insight-text">
                <strong>Visual hook:</strong> {concept.visual_hook}
              </p>
            </div>
          ))}
        </CollapsibleInsightSection>
      ) : null}

      {promptSet.image_prompts.length > 0 ? (
        <CollapsibleInsightSection
          title={`Image prompts (${promptSet.image_prompts.length})`}
        >
          {promptSet.image_prompts.map((item, i) => (
            <div key={i} className="insight-card insight-card-compact">
              <div className="copy-block-head">
                <h5 className="insight-card-title">
                  {item.concept_name}{" "}
                  <span className="meta-chip">{item.aspect_ratio}</span>
                </h5>
                <CopyButton text={formatImagePromptForCopy(item)} />
              </div>
              <p className="copy-block-text">{item.prompt}</p>
              {item.overlay_text ? (
                <p className="insight-text">
                  <strong>Overlay:</strong> {item.overlay_text}
                </p>
              ) : null}
              {item.style_notes ? (
                <p className="insight-text">
                  <strong>Style:</strong> {item.style_notes}
                </p>
              ) : null}
            </div>
          ))}
        </CollapsibleInsightSection>
      ) : null}

      {promptSet.ugc_scripts.length > 0 ? (
        <CollapsibleInsightSection
          title={`UGC scripts (${promptSet.ugc_scripts.length})`}
        >
          {promptSet.ugc_scripts.map((script, i) => (
            <div key={i} className="insight-card insight-card-compact">
              <div className="copy-block-head">
                <h5 className="insight-card-title">
                  {script.script_name}{" "}
                  <span className="meta-chip">{script.duration}</span>
                </h5>
                <CopyButton text={formatUgcScriptForCopy(script)} />
              </div>
              <p className="insight-text">
                <strong>Hook:</strong> {script.hook}
              </p>
              <p className="copy-block-text">{script.script}</p>
              {script.shot_list.length > 0 ? (
                <ul className="bullet-list">
                  {script.shot_list.map((shot, j) => (
                    <li key={j}>{shot}</li>
                  ))}
                </ul>
              ) : null}
              {script.caption ? (
                <p className="insight-text">
                  <strong>Caption:</strong> {script.caption}
                </p>
              ) : null}
            </div>
          ))}
        </CollapsibleInsightSection>
      ) : null}

      {promptSet.overlay_texts.length > 0 ? (
        <CollapsibleInsightSection
          title={`Overlay texts (${promptSet.overlay_texts.length})`}
        >
          <ul className="copy-list">
            {promptSet.overlay_texts.map((item, i) => (
              <li key={i} className="copy-list-item">
                <span>
                  <span className="meta-chip">{item.use_case}</span> {item.text}
                </span>
                <CopyButton text={item.text} label="Copy" />
              </li>
            ))}
          </ul>
        </CollapsibleInsightSection>
      ) : null}

      {promptSet.negative_prompts.length > 0 ? (
        <CollapsibleInsightSection title="Negative prompts">
          <ul className="bullet-list">
            {promptSet.negative_prompts.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </CollapsibleInsightSection>
      ) : null}

      {promptSet.compliance_notes.length > 0 ? (
        <CollapsibleInsightSection
          title={`Compliance (${promptSet.compliance_notes.length})`}
          defaultCollapsed
        >
          {promptSet.compliance_notes.map((note, i) => (
            <div
              key={i}
              className="insight-card insight-card-warning insight-card-compact"
            >
              <h5 className="insight-card-title">{note.risk}</h5>
              <p className="insight-text">
                <strong>Safer:</strong> {note.safer_direction}
              </p>
            </div>
          ))}
        </CollapsibleInsightSection>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Customer avatar full detail (used in inspector)                     */
/* ------------------------------------------------------------------ */

interface AvatarDetailProps {
  content: CustomerAvatarContent;
}

export function AvatarDetail({ content }: AvatarDetailProps) {
  return (
    <div className="insight-body">
      <InsightSection title="Avatar summary">
        <div className="insight-card">
          <h5 className="insight-card-title">{content.avatar_name}</h5>
          <p className="insight-text">{content.avatar_summary}</p>
        </div>
      </InsightSection>

      <InsightSection title="Demographics">
        <div className="insight-card">
          <p className="insight-text">
            <strong>Age range:</strong> {content.demographics.age_range}
          </p>
          <p className="insight-text">
            <strong>Gender skew:</strong> {content.demographics.gender_skew}
          </p>
          <p className="insight-text">
            <strong>Location:</strong> {content.demographics.location_context}
          </p>
          <p className="insight-text">
            <strong>Income / spending:</strong>{" "}
            {content.demographics.income_or_spending_context}
          </p>
          <p className="insight-text">
            <strong>Life stage:</strong> {content.demographics.life_stage}
          </p>
        </div>
      </InsightSection>

      <InsightSection title="Psychographics">
        <div className="insight-card">
          <AvatarList label="Core beliefs" items={content.psychographics.core_beliefs} />
          <AvatarList label="Attitudes" items={content.psychographics.attitudes} />
          <AvatarList
            label="Identity markers"
            items={content.psychographics.identity_markers}
          />
          <AvatarList label="Values" items={content.psychographics.values} />
          <AvatarList
            label="Prejudices / biases"
            items={content.psychographics.prejudices_or_biases}
          />
        </div>
      </InsightSection>

      <InsightSection title="Hopes and dreams">
        <ul className="bullet-list">
          {content.hopes_and_dreams.map((hope, i) => (
            <li key={i}>{hope}</li>
          ))}
        </ul>
      </InsightSection>

      <div className="insight-columns">
        <InsightSection title="Victories">
          <ul className="bullet-list">
            {content.victories_and_failures.victories.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        </InsightSection>
        <InsightSection title="Failures">
          <ul className="bullet-list">
            {content.victories_and_failures.failures.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </InsightSection>
      </div>

      <InsightSection title="Existing solutions">
        {content.existing_solutions.map((sol, i) => (
          <div key={i} className="insight-card">
            <h5 className="insight-card-title">{sol.solution}</h5>
            <p className="insight-text">
              <strong>Experience:</strong> {sol.experience}
            </p>
            <p className="insight-text">
              <strong>Likes:</strong> {sol.likes}
            </p>
            <p className="insight-text">
              <strong>Dislikes:</strong> {sol.dislikes}
            </p>
            <p className="insight-text">
              <strong>Belief about effectiveness:</strong>{" "}
              {sol.belief_about_effectiveness}
            </p>
          </div>
        ))}
      </InsightSection>

      <InsightSection title="Buying triggers">
        <ul className="bullet-list">
          {content.buying_triggers.map((trigger, i) => (
            <li key={i}>{trigger}</li>
          ))}
        </ul>
      </InsightSection>

      <InsightSection title="Objections">
        <ul className="bullet-list">
          {content.objections.map((objection, i) => (
            <li key={i}>{objection}</li>
          ))}
        </ul>
      </InsightSection>

      <InsightSection title="Language bank">
        <div className="insight-card">
          <p className="insight-text">
            <strong>Phrases they use</strong>
          </p>
          <ul className="phrase-list">
            {content.language_bank.phrases_they_use.map((phrase, i) => (
              <li key={i} className="phrase">
                “{phrase}”
              </li>
            ))}
          </ul>
          <AvatarList
            label="Words to use in copy"
            items={content.language_bank.words_to_use_in_copy}
          />
          <AvatarList
            label="Words to avoid"
            items={content.language_bank.words_to_avoid}
          />
        </div>
      </InsightSection>

      <InsightSection title="Copywriting implications">
        <div className="insight-card">
          <p className="insight-text">
            <strong>Best emotional angle:</strong>{" "}
            {content.copywriting_implications.best_emotional_angle}
          </p>
          <p className="insight-text">
            <strong>Best logical angle:</strong>{" "}
            {content.copywriting_implications.best_logical_angle}
          </p>
          <AvatarList
            label="Trust builders"
            items={content.copywriting_implications.trust_builders}
          />
          <AvatarList
            label="Risk reducers"
            items={content.copywriting_implications.risk_reducers}
          />
        </div>
      </InsightSection>

      <InsightSection title="Compliance notes">
        <ul className="bullet-list">
          {content.compliance_notes.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      </InsightSection>
    </div>
  );
}

function AvatarList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <>
      <p className="insight-text">
        <strong>{label}</strong>
      </p>
      <ul className="bullet-list">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </>
  );
}
