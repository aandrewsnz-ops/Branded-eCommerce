import { Check, Loader2, Plus, Sparkles } from "lucide-react";
import type {
  AdCandidate,
  AdCandidatePatch,
  AdCopySet,
  CreativePromptSet,
  MarketingAngle,
} from "../types";
import { CopyButton } from "./shared";

interface QuickCopySelectorProps {
  angle: MarketingAngle;
  copySet: AdCopySet;
  candidate?: AdCandidate;
  creativeSet?: CreativePromptSet;
  isSavingCandidate: boolean;
  isGeneratingCreative: boolean;
  onUpsert: (patch: AdCandidatePatch) => void;
  onGenerateCreative: (adCopySetId: string) => void;
}

interface SelectableRowProps {
  text: string;
  meta?: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  selectLabel?: string;
}

function SelectableRow({
  text,
  meta,
  selected,
  disabled,
  onSelect,
  selectLabel = "Use this",
}: SelectableRowProps) {
  return (
    <div className={`select-row${selected ? " is-selected" : ""}`}>
      <div className="select-row-body">
        {meta ? <span className="meta-chip">{meta}</span> : null}
        <span className="select-row-text">{text}</span>
      </div>
      <div className="select-row-actions">
        <CopyButton text={text} label="" />
        <button
          type="button"
          className={`btn btn-sm select-btn${selected ? " is-selected" : ""}`}
          disabled={disabled}
          onClick={onSelect}
        >
          {selected ? <Check size={13} /> : <Plus size={13} />}
          {selected ? "Selected" : selectLabel}
        </button>
      </div>
    </div>
  );
}

export function QuickCopySelector({
  angle,
  copySet,
  candidate,
  creativeSet,
  isSavingCandidate,
  isGeneratingCreative,
  onUpsert,
  onGenerateCreative,
}: QuickCopySelectorProps) {
  const selectedPrimary = candidate?.selected_primary_text ?? "";
  const selectedHeadline = candidate?.selected_headline ?? "";
  const selectedDescription = candidate?.selected_description ?? "";
  const selectedHook = candidate?.selected_hook ?? "";
  const selectedCallouts = candidate?.selected_callouts ?? [];

  function toggleCallout(text: string) {
    const next = selectedCallouts.includes(text)
      ? selectedCallouts.filter((c) => c !== text)
      : [...selectedCallouts, text];
    onUpsert({ selected_callouts: next });
  }

  const primaries = [
    ...copySet.short_primary_texts.map((p) => ({ ...p, kind: "Short" })),
    ...copySet.medium_primary_texts.map((p) => ({ ...p, kind: "Medium" })),
  ];

  return (
    <article className="second-cut-card">
      <header className="second-cut-head">
        <div>
          <h3 className="second-cut-title">{angle.angle_name}</h3>
        </div>
        <div className="second-cut-head-right">
          {isSavingCandidate ? (
            <span className="angle-review-saving">
              <Loader2 size={12} strokeWidth={2.5} className="spin" />
              Saving…
            </span>
          ) : null}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onGenerateCreative(copySet.id)}
            disabled={isGeneratingCreative}
          >
            {isGeneratingCreative ? (
              <Loader2 size={14} strokeWidth={2.5} className="spin" />
            ) : (
              <Sparkles size={14} strokeWidth={2.5} />
            )}
            {creativeSet ? "Regenerate Creative Prompts" : "Generate Creative Prompts"}
          </button>
        </div>
      </header>

      {copySet.long_form_story.trim() ? (
        <div className="select-group">
          <h4 className="select-group-title">Concept summary</h4>
          <div className="copy-block">
            <div className="copy-block-head">
              <CopyButton text={copySet.long_form_story} />
            </div>
            <p className="copy-block-text">{copySet.long_form_story}</p>
          </div>
        </div>
      ) : null}

      {primaries.length > 0 ? (
        <div className="select-group">
          <h4 className="select-group-title">Primary text</h4>
          {primaries.map((p, i) => (
            <SelectableRow
              key={i}
              text={p.text}
              meta={p.label || p.kind}
              selected={selectedPrimary === p.text}
              disabled={isSavingCandidate}
              onSelect={() => onUpsert({ selected_primary_text: p.text })}
            />
          ))}
        </div>
      ) : null}

      {copySet.headlines.length > 0 ? (
        <div className="select-group">
          <h4 className="select-group-title">Headlines</h4>
          {copySet.headlines.map((h, i) => (
            <SelectableRow
              key={i}
              text={h.text}
              selected={selectedHeadline === h.text}
              disabled={isSavingCandidate}
              onSelect={() => onUpsert({ selected_headline: h.text })}
            />
          ))}
        </div>
      ) : null}

      {copySet.descriptions.length > 0 ? (
        <div className="select-group">
          <h4 className="select-group-title">Descriptions</h4>
          {copySet.descriptions.map((d, i) => (
            <SelectableRow
              key={i}
              text={d.text}
              selected={selectedDescription === d.text}
              disabled={isSavingCandidate}
              onSelect={() => onUpsert({ selected_description: d.text })}
            />
          ))}
        </div>
      ) : null}

      {copySet.hooks.length > 0 ? (
        <div className="select-group">
          <h4 className="select-group-title">Hooks</h4>
          {copySet.hooks.map((h, i) => (
            <SelectableRow
              key={i}
              text={h.text}
              selected={selectedHook === h.text}
              disabled={isSavingCandidate}
              onSelect={() => onUpsert({ selected_hook: h.text })}
            />
          ))}
        </div>
      ) : null}

      {copySet.callouts.length > 0 ? (
        <div className="select-group">
          <h4 className="select-group-title">Callouts (multi-select)</h4>
          {copySet.callouts.map((c, i) => (
            <SelectableRow
              key={i}
              text={c.text}
              meta={c.use_case}
              selected={selectedCallouts.includes(c.text)}
              disabled={isSavingCandidate}
              onSelect={() => toggleCallout(c.text)}
              selectLabel="Add"
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}
