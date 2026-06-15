import { useState } from "react";
import { AlertTriangle, Loader2, Search } from "lucide-react";
import type { ResearchSource } from "../types";
import {
  RESEARCH_FILTERS,
  applyResearchFilter,
  type ResearchFilterId,
  type ResearchSelectionMap,
  type ResearchTagId,
} from "./workflow";
import { ResearchSourceCard } from "./ResearchSourceCard";

interface ResearchWorkspaceProps {
  sources: ResearchSource[];
  isResearching: boolean;
  isLoading: boolean;
  error: string | null;
  newSourceIds?: ReadonlySet<string>;
  onRunResearch: () => void;
}

export function ResearchWorkspace({
  sources,
  isResearching,
  isLoading,
  error,
  newSourceIds,
  onRunResearch,
}: ResearchWorkspaceProps) {
  const [filter, setFilter] = useState<ResearchFilterId>("all");
  const [selection, setSelection] = useState<ResearchSelectionMap>({});

  const hasSources = sources.length > 0;
  const buttonLabel = hasSources ? "Fetch another 5" : "Run Research";
  const loadingLabel = hasSources
    ? "Fetching another 5…"
    : "Running research…";

  function toggleTag(sourceId: string, tag: ResearchTagId) {
    setSelection((prev) => {
      const current = prev[sourceId] ?? [];
      const next = current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag];
      return { ...prev, [sourceId]: next };
    });
  }

  const ignoredIds = new Set(
    Object.entries(selection)
      .filter(([, tags]) => tags.includes("ignore"))
      .map(([id]) => id)
  );

  let visible: ResearchSource[];
  if (filter === "ignored") {
    visible = sources.filter((s) => ignoredIds.has(s.id));
  } else {
    visible = applyResearchFilter(sources, filter).filter(
      (s) => !ignoredIds.has(s.id)
    );
  }

  return (
    <div className="workspace workspace-full">
      <div className="workspace-head">
        <div>
          <h2 className="workspace-title">Research sources</h2>
          <p className="workspace-sub">
            {hasSources ? (
              <>
                {sources.length} saved{" "}
                {sources.length === 1 ? "source" : "sources"}. Fetch another 5
                to expand the research base.
              </>
            ) : (
              <>
                No research sources yet. Run Research to gather the first 5
                sources.
              </>
            )}
            {ignoredIds.size > 0 ? ` · ${ignoredIds.size} ignored` : ""}
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
          {isResearching ? loadingLabel : buttonLabel}
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
          <span>
            {hasSources
              ? "Searching for additional discussions… this can take a few minutes."
              : "Searching public discussions… this can take a few minutes."}
          </span>
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
          <p>
            No research sources yet. Run Research to gather the first 5 sources.
          </p>
        </div>
      ) : null}

      {visible.length > 0 ? (
        <div className="research-card-grid">
          {visible.map((source) => (
            <ResearchSourceCard
              key={source.id}
              source={source}
              tags={selection[source.id] ?? []}
              onToggleTag={(tag) => toggleTag(source.id, tag)}
              isNew={newSourceIds?.has(source.id)}
            />
          ))}
        </div>
      ) : sources.length > 0 ? (
        <div className="list-state">No sources match this filter.</div>
      ) : null}
    </div>
  );
}
