import { ExternalLink } from "lucide-react";
import type { ResearchSource } from "../types";
import { CopyButton } from "./shared";
import { RESEARCH_TAGS, type ResearchTagId } from "./workflow";

interface ResearchSourceCardProps {
  source: ResearchSource;
  tags: ResearchTagId[];
  onToggleTag: (tag: ResearchTagId) => void;
  isNew?: boolean;
}

const MAX_VISIBLE_PHRASES = 8;

export function ResearchSourceCard({
  source,
  tags,
  onToggleTag,
  isNew = false,
}: ResearchSourceCardProps) {
  const phrases = source.useful_phrases.slice(0, MAX_VISIBLE_PHRASES);
  const extraPhrases = source.useful_phrases.length - phrases.length;
  const isIgnored = tags.includes("ignore");

  // Every section wrapper is always rendered (even when empty) so each card
  // spans exactly 7 subgrid rows and stays aligned with its neighbours.
  return (
    <article className={`research-card${isIgnored ? " is-ignored" : ""}`}>
      <header className="research-card-head">
        <h4 className="research-card-title">
          {source.title || "Untitled source"}
        </h4>
        {isNew ? <span className="meta-chip meta-chip-ai">New</span> : null}
      </header>

      <div className="research-card-meta">
        {source.platform ? (
          <span className="meta-chip">{source.platform}</span>
        ) : (
          <span />
        )}
        <span className="score-pill">{source.relevance_score}</span>
      </div>

      <div className="research-card-theme">
        {source.emotional_theme ? (
          <span className="meta-chip meta-chip-theme">
            {source.emotional_theme}
          </span>
        ) : null}
      </div>

      <div className="research-card-summary">
        {source.summary ? (
          <p className="research-card-summary-text">{source.summary}</p>
        ) : null}
      </div>

      <div className="research-card-phrases">
        <span className="research-card-label">Useful phrases</span>
        {phrases.length > 0 ? (
          <ul className="phrase-list">
            {phrases.map((phrase, i) => (
              <li key={i} className="phrase">
                <span>“{phrase}”</span>
                <CopyButton text={phrase} label="" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="research-card-empty">No phrases captured.</p>
        )}
        {extraPhrases > 0 ? (
          <span className="research-card-more">+ {extraPhrases} more</span>
        ) : null}
      </div>

      <div className="research-card-tags" role="group" aria-label="Tag source">
        {RESEARCH_TAGS.map((tag) => (
          <button
            key={tag.id}
            type="button"
            className={`tag-btn${tags.includes(tag.id) ? " is-active" : ""}${
              tag.id === "ignore" ? " tag-btn-ignore" : ""
            }`}
            onClick={() => onToggleTag(tag.id)}
            aria-pressed={tags.includes(tag.id)}
          >
            {tag.label}
          </button>
        ))}
      </div>

      <div className="research-card-footer">
        {source.url ? (
          <a
            className="research-card-link"
            href={source.url}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={12} /> Open source
          </a>
        ) : null}
      </div>
    </article>
  );
}
