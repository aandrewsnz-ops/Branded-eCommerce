import { useState } from "react";
import { AlertTriangle, ExternalLink, Loader2, Search } from "lucide-react";
import type { ResearchSource } from "../types";
import type { ResearchFilterId } from "./workflow";
import { RESEARCH_FILTERS, applyResearchFilter } from "./workflow";

interface ResearchGridProps {
  sources: ResearchSource[];
  isResearching: boolean;
  isLoading: boolean;
  error: string | null;
  onRunResearch: () => void;
  selectedSourceId: string | null;
  onSelectSource: (id: string) => void;
}

export function ResearchGrid({
  sources,
  isResearching,
  isLoading,
  error,
  onRunResearch,
  selectedSourceId,
  onSelectSource,
}: ResearchGridProps) {
  const [filter, setFilter] = useState<ResearchFilterId>("all");
  const filtered = applyResearchFilter(sources, filter);

  return (
    <div className="workspace">
      <div className="workspace-head">
        <div>
          <h2 className="workspace-title">Research sources</h2>
          <p className="workspace-sub">
            {sources.length} saved {sources.length === 1 ? "source" : "sources"}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onRunResearch}
          disabled={isResearching}
        >
          {isResearching ? (
            <Loader2 size={14} strokeWidth={2.5} className="spin" />
          ) : (
            <Search size={14} strokeWidth={2.5} />
          )}
          {isResearching ? "Running research…" : "Run Research"}
        </button>
      </div>

      {error ? (
        <div className="banner banner-error" role="alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      ) : null}

      {sources.length > 0 ? (
        <div className="filter-bar" role="group" aria-label="Filter sources">
          {RESEARCH_FILTERS.map((f) => (
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

      {isResearching ? (
        <div className="list-state">
          <Loader2 size={16} strokeWidth={2} className="spin" />
          <span>Searching public discussions… this can take a minute.</span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="list-state">
          <Loader2 size={16} strokeWidth={2} className="spin" />
          <span>Loading saved research sources…</span>
        </div>
      ) : null}

      {!isResearching && !isLoading && sources.length === 0 ? (
        <div className="empty-state">
          <Search size={32} strokeWidth={1.5} />
          <p>No research sources yet. Run Research to gather them.</p>
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <div className="research-grid">
          {filtered.map((source) => {
            const strongestPhrase = source.useful_phrases[0];
            return (
              <button
                key={source.id}
                type="button"
                className={`source-tile${selectedSourceId === source.id ? " is-active" : ""}`}
                onClick={() => onSelectSource(source.id)}
              >
                <div className="source-tile-head">
                  <h4 className="source-tile-title">
                    {source.title || "Untitled source"}
                  </h4>
                  <span className="score-pill">{source.relevance_score}</span>
                </div>
                <div className="source-tile-meta">
                  {source.platform ? (
                    <span className="meta-chip">{source.platform}</span>
                  ) : null}
                  {source.emotional_theme ? (
                    <span className="meta-chip meta-chip-theme">
                      {source.emotional_theme}
                    </span>
                  ) : null}
                </div>
                {strongestPhrase ? (
                  <p className="source-tile-quote">“{strongestPhrase}”</p>
                ) : null}
                {source.summary ? (
                  <p className="source-tile-summary">{source.summary}</p>
                ) : null}
                {source.url ? (
                  <span className="source-tile-link">
                    <ExternalLink size={12} /> Source link
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : sources.length > 0 ? (
        <div className="list-state">No sources match this filter.</div>
      ) : null}
    </div>
  );
}
