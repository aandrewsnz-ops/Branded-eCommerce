import { useState } from "react";
import { AlertTriangle, FileText, Loader2 } from "lucide-react";
import type {
  ComplianceWarning,
  EmotionalState,
  FailedSolution,
  LanguagePattern,
  PainCluster,
  ResearchInsight,
} from "../types";

interface InsightReportWorkspaceProps {
  insight: ResearchInsight | null;
  hasResearch: boolean;
  isGeneratingInsight: boolean;
  isInsightLoading: boolean;
  insightError: string | null;
  onGenerateInsight: () => void;
}

/* ------------------------------------------------------------------ */
/* Section + card primitives                                           */
/* ------------------------------------------------------------------ */

interface InsightSectionProps {
  title: string;
  count?: number;
  description?: string;
  gridClass: string;
  children: React.ReactNode;
}

function InsightSection({
  title,
  count,
  description,
  gridClass,
  children,
}: InsightSectionProps) {
  return (
    <section className="ir-section">
      <div className="ir-section-header">
        <h3 className="ir-section-title">{title}</h3>
        {typeof count === "number" ? (
          <span className="ir-section-count">{count}</span>
        ) : null}
        {description ? <p className="ir-section-desc">{description}</p> : null}
      </div>
      <div className={`ir-card-grid ${gridClass}`}>{children}</div>
    </section>
  );
}

/** A labelled body field used inside structured cards. */
function CardField({ label, value }: { label: string; value: string }) {
  return (
    <div className="ir-card-field">
      <span className="ir-card-field-label">{label}</span>
      <p className="ir-card-field-value">{value || "—"}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card types (each renders exactly 3 stacked zones for subgrid)       */
/* ------------------------------------------------------------------ */

const MAX_EVIDENCE = 3;

function PainClusterCard({ cluster }: { cluster: PainCluster }) {
  const evidence = cluster.evidence_from_sources;
  const shown = evidence.slice(0, MAX_EVIDENCE);
  const extra = evidence.length - shown.length;
  return (
    <article className="ir-card">
      <header className="ir-card-header">
        <h4 className="ir-card-title">{cluster.name}</h4>
        <span
          className={`ir-card-badge intensity-${cluster.emotional_intensity}`}
        >
          {cluster.emotional_intensity}
        </span>
      </header>
      <div className="ir-card-body">
        <p className="ir-card-text ir-clamp-5">{cluster.description}</p>
      </div>
      <div className="ir-card-evidence">
        {shown.length > 0 ? (
          <>
            <span className="ir-card-field-label">Evidence</span>
            <ul className="ir-quote-list">
              {shown.map((ev, i) => (
                <li key={i} className="ir-quote-item">
                  “{ev}”
                </li>
              ))}
            </ul>
            {extra > 0 ? (
              <span className="ir-card-more">+ {extra} more</span>
            ) : null}
          </>
        ) : null}
      </div>
    </article>
  );
}

function LanguagePatternCard({ pattern }: { pattern: LanguagePattern }) {
  return (
    <article className="ir-card">
      <header className="ir-card-header">
        <h4 className="ir-card-title">“{pattern.pattern}”</h4>
      </header>
      <div className="ir-card-body">
        <CardField label="Meaning" value={pattern.meaning} />
      </div>
      <div className="ir-card-footer">
        <CardField label="Copy use" value={pattern.copywriting_use} />
      </div>
    </article>
  );
}

function EmotionalStateCard({ state }: { state: EmotionalState }) {
  return (
    <article className="ir-card">
      <header className="ir-card-header">
        <h4 className="ir-card-title">{state.state}</h4>
      </header>
      <div className="ir-card-body">
        <p className="ir-card-text ir-clamp-5">{state.description}</p>
      </div>
      <div className="ir-card-footer">
        {state.trigger_moments.length > 0 ? (
          <>
            <span className="ir-card-field-label">Triggers</span>
            <div className="ir-trigger-chips">
              {state.trigger_moments.map((trigger, i) => (
                <span key={i} className="ir-trigger-chip">
                  {trigger}
                </span>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </article>
  );
}

function FailedSolutionCard({ solution }: { solution: FailedSolution }) {
  return (
    <article className="ir-card">
      <header className="ir-card-header">
        <h4 className="ir-card-title">{solution.solution}</h4>
      </header>
      <div className="ir-card-body">
        <CardField label="Why it failed" value={solution.why_it_failed} />
      </div>
      <div className="ir-card-footer">
        <CardField label="Market belief" value={solution.market_belief} />
      </div>
    </article>
  );
}

function ComplianceWarningCard({ warning }: { warning: ComplianceWarning }) {
  return (
    <article className="ir-card ir-card-warning">
      <header className="ir-card-header">
        <h4 className="ir-card-title">{warning.risk}</h4>
        <span className="ir-card-badge badge-risk">Risk</span>
      </header>
      <div className="ir-card-body">
        <CardField label="Why it matters" value={warning.why_it_matters} />
      </div>
      <div className="ir-card-footer">
        <CardField label="Safer direction" value={warning.safer_direction} />
      </div>
    </article>
  );
}

function StatementCard({ text, tone }: { text: string; tone: "hope" | "fear" }) {
  return (
    <article className={`ir-statement-card tone-${tone}`}>
      <p className="ir-statement-text">{text}</p>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Copywriting notes panel                                             */
/* ------------------------------------------------------------------ */

function CopywritingNotesPanel({ notes }: { notes: string }) {
  return (
    <section className="ir-section">
      <div className="ir-section-header">
        <h3 className="ir-section-title">Copywriting Notes</h3>
      </div>
      <div className="ir-notes-panel">
        <p className="ir-notes-text">{notes || "—"}</p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Workspace                                                           */
/* ------------------------------------------------------------------ */

export function InsightReportWorkspace({
  insight,
  hasResearch,
  isGeneratingInsight,
  isInsightLoading,
  insightError,
  onGenerateInsight,
}: InsightReportWorkspaceProps) {
  const [showAllHopes, setShowAllHopes] = useState(false);
  const [showAllFears, setShowAllFears] = useState(false);
  const generateDisabled = isGeneratingInsight || !hasResearch;

  const HOPE_FEAR_PREVIEW = 8;
  const hopes = insight?.hopes ?? [];
  const fears = insight?.fears ?? [];
  const visibleHopes = showAllHopes ? hopes : hopes.slice(0, HOPE_FEAR_PREVIEW);
  const visibleFears = showAllFears ? fears : fears.slice(0, HOPE_FEAR_PREVIEW);

  return (
    <div className="workspace workspace-full insight-report-workspace">
      <div className="workspace-head">
        <div>
          <h2 className="workspace-title">Insight Report</h2>
          <p className="workspace-sub">
            Market intelligence distilled from your research sources
          </p>
        </div>
        <div className="workspace-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onGenerateInsight}
            disabled={generateDisabled}
            title={
              hasResearch
                ? undefined
                : "Run Research before generating the Insight Report."
            }
          >
            {isGeneratingInsight ? (
              <Loader2 size={14} strokeWidth={2.5} className="spin" />
            ) : (
              <FileText size={14} strokeWidth={2.5} />
            )}
            {isGeneratingInsight ? "Generating…" : "Generate Insight Report"}
          </button>
        </div>
      </div>

      {!hasResearch ? (
        <div className="banner banner-info" role="note">
          <AlertTriangle size={16} />
          <span>Run Research before generating the Insight Report.</span>
        </div>
      ) : null}

      {insightError ? (
        <div className="banner banner-error" role="alert">
          <AlertTriangle size={16} />
          <span>{insightError}</span>
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
        <div className="empty-state empty-state-sm">
          <FileText size={26} strokeWidth={1.5} />
          <p>
            No insight report yet. Run Research first, then generate the Insight
            Report.
          </p>
        </div>
      ) : null}

      {insight ? (
        <div className="ir-sections">
          {insight.pain_clusters.length > 0 ? (
            <InsightSection
              title="Pain Clusters"
              count={insight.pain_clusters.length}
              description="The strongest emotional pain themes found in research."
              gridClass="cols-4"
            >
              {insight.pain_clusters.map((cluster, i) => (
                <PainClusterCard key={i} cluster={cluster} />
              ))}
            </InsightSection>
          ) : null}

          {insight.language_patterns.length > 0 ? (
            <InsightSection
              title="Language Patterns"
              count={insight.language_patterns.length}
              description="Verbatim phrasing and how to use it in copy."
              gridClass="cols-4"
            >
              {insight.language_patterns.map((pattern, i) => (
                <LanguagePatternCard key={i} pattern={pattern} />
              ))}
            </InsightSection>
          ) : null}

          {insight.emotional_states.length > 0 ? (
            <InsightSection
              title="Emotional States"
              count={insight.emotional_states.length}
              description="What buyers feel and what triggers it."
              gridClass="cols-4"
            >
              {insight.emotional_states.map((state, i) => (
                <EmotionalStateCard key={i} state={state} />
              ))}
            </InsightSection>
          ) : null}

          {insight.failed_solutions.length > 0 ? (
            <InsightSection
              title="Failed Solutions"
              count={insight.failed_solutions.length}
              description="What buyers tried before and why it let them down."
              gridClass="cols-4"
            >
              {insight.failed_solutions.map((solution, i) => (
                <FailedSolutionCard key={i} solution={solution} />
              ))}
            </InsightSection>
          ) : null}

          {hopes.length > 0 ? (
            <InsightSection title="Hopes" count={hopes.length} gridClass="cols-auto">
              {visibleHopes.map((hope, i) => (
                <StatementCard key={i} text={hope} tone="hope" />
              ))}
              {hopes.length > HOPE_FEAR_PREVIEW ? (
                <button
                  type="button"
                  className="ir-showmore"
                  onClick={() => setShowAllHopes((v) => !v)}
                >
                  {showAllHopes
                    ? "Show less"
                    : `+ ${hopes.length - HOPE_FEAR_PREVIEW} more`}
                </button>
              ) : null}
            </InsightSection>
          ) : null}

          {fears.length > 0 ? (
            <InsightSection title="Fears" count={fears.length} gridClass="cols-auto">
              {visibleFears.map((fear, i) => (
                <StatementCard key={i} text={fear} tone="fear" />
              ))}
              {fears.length > HOPE_FEAR_PREVIEW ? (
                <button
                  type="button"
                  className="ir-showmore"
                  onClick={() => setShowAllFears((v) => !v)}
                >
                  {showAllFears
                    ? "Show less"
                    : `+ ${fears.length - HOPE_FEAR_PREVIEW} more`}
                </button>
              ) : null}
            </InsightSection>
          ) : null}

          <CopywritingNotesPanel notes={insight.copywriting_notes} />

          {insight.compliance_warnings.length > 0 ? (
            <InsightSection
              title="Compliance Warnings"
              count={insight.compliance_warnings.length}
              description="Risky claims from research and safer directions."
              gridClass="cols-3"
            >
              {insight.compliance_warnings.map((warning, i) => (
                <ComplianceWarningCard key={i} warning={warning} />
              ))}
            </InsightSection>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
