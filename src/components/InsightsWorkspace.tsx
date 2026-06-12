import { AlertTriangle, FileText, Loader2, UserRound } from "lucide-react";
import type { CustomerAvatarOutput, ResearchInsight } from "../types";
import type { InsightSectionKey, SelectedItem } from "./workflow";

interface InsightsWorkspaceProps {
  insight: ResearchInsight | null;
  isGeneratingInsight: boolean;
  isInsightLoading: boolean;
  insightError: string | null;
  onGenerateInsight: () => void;

  avatar: CustomerAvatarOutput | null;
  isGeneratingAvatar: boolean;
  isAvatarLoading: boolean;
  avatarError: string | null;
  onGenerateAvatar: () => void;

  selectedItem: SelectedItem | null;
  onSelectInsight: (section: InsightSectionKey, index: number) => void;
  onSelectAvatar: () => void;
}

function isSelected(
  item: SelectedItem | null,
  section: InsightSectionKey,
  index: number
): boolean {
  return (
    item?.type === "insight" &&
    item.section === section &&
    item.index === index
  );
}

export function InsightsWorkspace({
  insight,
  isGeneratingInsight,
  isInsightLoading,
  insightError,
  onGenerateInsight,
  avatar,
  isGeneratingAvatar,
  isAvatarLoading,
  avatarError,
  onGenerateAvatar,
  selectedItem,
  onSelectInsight,
  onSelectAvatar,
}: InsightsWorkspaceProps) {
  const avatarSelected = selectedItem?.type === "avatar";

  return (
    <div className="workspace">
      <div className="workspace-head">
        <div>
          <h2 className="workspace-title">Insights</h2>
          <p className="workspace-sub">
            Research analysis and customer avatar
          </p>
        </div>
        <div className="workspace-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onGenerateInsight}
            disabled={isGeneratingInsight}
          >
            {isGeneratingInsight ? (
              <Loader2 size={14} strokeWidth={2.5} className="spin" />
            ) : (
              <FileText size={14} strokeWidth={2.5} />
            )}
            {isGeneratingInsight ? "Generating…" : "Generate Insight Report"}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onGenerateAvatar}
            disabled={isGeneratingAvatar}
          >
            {isGeneratingAvatar ? (
              <Loader2 size={14} strokeWidth={2.5} className="spin" />
            ) : (
              <UserRound size={14} strokeWidth={2.5} />
            )}
            {isGeneratingAvatar ? "Generating…" : "Generate Customer Avatar"}
          </button>
        </div>
      </div>

      {insightError ? (
        <div className="banner banner-error" role="alert">
          <AlertTriangle size={16} />
          <span>{insightError}</span>
        </div>
      ) : null}
      {avatarError ? (
        <div className="banner banner-error" role="alert">
          <AlertTriangle size={16} />
          <span>{avatarError}</span>
        </div>
      ) : null}

      {isGeneratingInsight || isInsightLoading ? (
        <div className="list-state">
          <Loader2 size={16} strokeWidth={2} className="spin" />
          <span>
            {isGeneratingInsight
              ? "Generating insight report… this can take a minute."
              : "Loading insight report…"}
          </span>
        </div>
      ) : null}

      {!insight && !isGeneratingInsight && !isInsightLoading ? (
        <div className="empty-state">
          <FileText size={32} strokeWidth={1.5} />
          <p>No insight report yet. Generate one to populate this view.</p>
        </div>
      ) : null}

      {insight ? (
        <>
          {/* Customer avatar summary card */}
          {avatar?.content_json ? (
            <section className="insight-block">
              <h3 className="insight-block-title">Customer avatar</h3>
              <div className="card-grid">
                <button
                  type="button"
                  className={`mini-card${avatarSelected ? " is-active" : ""}`}
                  onClick={onSelectAvatar}
                >
                  <h4 className="mini-card-title">
                    {avatar.content_json.avatar_name}
                  </h4>
                  <p className="mini-card-text">
                    {avatar.content_json.avatar_summary}
                  </p>
                </button>
              </div>
            </section>
          ) : isAvatarLoading || isGeneratingAvatar ? (
            <div className="list-state">
              <Loader2 size={16} strokeWidth={2} className="spin" />
              <span>Loading customer avatar…</span>
            </div>
          ) : null}

          <section className="insight-block">
            <h3 className="insight-block-title">
              Pain clusters ({insight.pain_clusters.length})
            </h3>
            <div className="card-grid">
              {insight.pain_clusters.map((cluster, i) => (
                <button
                  key={i}
                  type="button"
                  className={`mini-card${isSelected(selectedItem, "pain_clusters", i) ? " is-active" : ""}`}
                  onClick={() => onSelectInsight("pain_clusters", i)}
                >
                  <div className="mini-card-head">
                    <h4 className="mini-card-title">{cluster.name}</h4>
                    <span
                      className={`intensity intensity-${cluster.emotional_intensity}`}
                    >
                      {cluster.emotional_intensity}
                    </span>
                  </div>
                  <p className="mini-card-text">{cluster.description}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="insight-block">
            <h3 className="insight-block-title">
              Language patterns ({insight.language_patterns.length})
            </h3>
            <div className="card-grid">
              {insight.language_patterns.map((lp, i) => (
                <button
                  key={i}
                  type="button"
                  className={`mini-card${isSelected(selectedItem, "language_patterns", i) ? " is-active" : ""}`}
                  onClick={() => onSelectInsight("language_patterns", i)}
                >
                  <h4 className="mini-card-title">“{lp.pattern}”</h4>
                  <p className="mini-card-text">{lp.meaning}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="insight-block">
            <h3 className="insight-block-title">
              Emotional states ({insight.emotional_states.length})
            </h3>
            <div className="card-grid">
              {insight.emotional_states.map((es, i) => (
                <button
                  key={i}
                  type="button"
                  className={`mini-card${isSelected(selectedItem, "emotional_states", i) ? " is-active" : ""}`}
                  onClick={() => onSelectInsight("emotional_states", i)}
                >
                  <h4 className="mini-card-title">{es.state}</h4>
                  <p className="mini-card-text">{es.description}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="insight-block">
            <h3 className="insight-block-title">
              Failed solutions ({insight.failed_solutions.length})
            </h3>
            <div className="card-grid">
              {insight.failed_solutions.map((fs, i) => (
                <button
                  key={i}
                  type="button"
                  className={`mini-card${isSelected(selectedItem, "failed_solutions", i) ? " is-active" : ""}`}
                  onClick={() => onSelectInsight("failed_solutions", i)}
                >
                  <h4 className="mini-card-title">{fs.solution}</h4>
                  <p className="mini-card-text">{fs.why_it_failed}</p>
                </button>
              ))}
            </div>
          </section>

          <div className="insight-twocol">
            <section className="insight-block">
              <h3 className="insight-block-title">Hopes ({insight.hopes.length})</h3>
              <div className="chip-grid">
                {insight.hopes.map((hope, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`hope-fear-chip hope-chip${isSelected(selectedItem, "hopes", i) ? " is-active" : ""}`}
                    onClick={() => onSelectInsight("hopes", i)}
                  >
                    {hope}
                  </button>
                ))}
              </div>
            </section>
            <section className="insight-block">
              <h3 className="insight-block-title">Fears ({insight.fears.length})</h3>
              <div className="chip-grid">
                {insight.fears.map((fear, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`hope-fear-chip fear-chip${isSelected(selectedItem, "fears", i) ? " is-active" : ""}`}
                    onClick={() => onSelectInsight("fears", i)}
                  >
                    {fear}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="insight-twocol">
            <section className="insight-block">
              <h3 className="insight-block-title">Copywriting notes</h3>
              <button
                type="button"
                className={`mini-card${isSelected(selectedItem, "copywriting_notes", 0) ? " is-active" : ""}`}
                onClick={() => onSelectInsight("copywriting_notes", 0)}
              >
                <p className="mini-card-text">
                  {insight.copywriting_notes
                    ? insight.copywriting_notes.slice(0, 220) +
                      (insight.copywriting_notes.length > 220 ? "…" : "")
                    : "—"}
                </p>
              </button>
            </section>

            <section className="insight-block">
              <h3 className="insight-block-title">
                Compliance warnings ({insight.compliance_warnings.length})
              </h3>
              <div className="card-grid">
                {insight.compliance_warnings.map((cw, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`mini-card mini-card-warning${isSelected(selectedItem, "compliance_warnings", i) ? " is-active" : ""}`}
                    onClick={() => onSelectInsight("compliance_warnings", i)}
                  >
                    <h4 className="mini-card-title">{cw.risk}</h4>
                    <p className="mini-card-text">{cw.safer_direction}</p>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
