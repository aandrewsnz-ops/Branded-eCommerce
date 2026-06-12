import {
  ExternalLink,
  Inbox,
  Loader2,
  PenLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type {
  AdCopySet,
  AngleReviewPatch,
  CreativePromptSet,
  CustomerAvatarOutput,
  MarketingAngle,
  MassDesire,
  ProductProject,
  ResearchInsight,
  ResearchSource,
} from "../types";
import type { InsightSectionKey, SelectedItem } from "./workflow";
import { copySetForAngle, creativeSetForAngle } from "./workflow";
import {
  AngleReviewControls,
  AvatarDetail,
  CreativePromptsDisplay,
  DetailField,
  QuickCopyDisplay,
} from "./shared";

interface InspectorPanelProps {
  selectedItem: SelectedItem | null;
  project: ProductProject | null;
  sources: ResearchSource[];
  insight: ResearchInsight | null;
  avatar: CustomerAvatarOutput | null;
  desires: MassDesire[];
  angles: MarketingAngle[];
  copySets: AdCopySet[];
  creativePromptSets: CreativePromptSet[];

  generatingCopyAngleId: string | null;
  generatingCreativePromptAngleId: string | null;
  savingReviewAngleId: string | null;

  onGenerateCopy: (angleId: string) => void;
  onGenerateCreativePrompts: (angleId: string, adCopySetId: string) => void;
  onUpdateAngleReview: (angleId: string, updates: AngleReviewPatch) => void;
}

const INSIGHT_SECTION_TITLES: Record<InsightSectionKey, string> = {
  pain_clusters: "Pain cluster",
  language_patterns: "Language pattern",
  emotional_states: "Emotional state",
  failed_solutions: "Failed solution",
  hopes: "Hope",
  fears: "Fear",
  copywriting_notes: "Copywriting notes",
  compliance_warnings: "Compliance warning",
};

export function InspectorPanel(props: InspectorPanelProps) {
  const { selectedItem } = props;

  const { title, body } = renderInspector(props);

  return (
    <aside className="inspector">
      <div className="inspector-head">
        <h2 className="inspector-title">{title}</h2>
      </div>
      <div className="inspector-body">
        {selectedItem ? (
          body
        ) : (
          <div className="inspector-empty">
            <Inbox size={28} strokeWidth={1.5} />
            <p>
              Select a source, insight, desire, angle, copy set, or creative
              prompt to inspect details.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

function renderInspector(props: InspectorPanelProps): {
  title: string;
  body: React.ReactNode;
} {
  const {
    selectedItem,
    project,
    sources,
    insight,
    avatar,
    desires,
    angles,
    copySets,
    creativePromptSets,
  } = props;

  if (!selectedItem) {
    return { title: "Inspector", body: null };
  }

  if (selectedItem.type === "project") {
    if (!project) return { title: "Project", body: <Missing /> };
    return {
      title: project.our_product_name || "Project",
      body: (
        <div className="brief-grid">
          <DetailField
            label="Supplier product URL"
            value={project.supplier_product_url}
            isLink
          />
          <DetailField
            label="Supplier product description"
            value={project.supplier_product_description}
            multiline
          />
          <DetailField
            label="Primary competitor URL"
            value={project.primary_competitor_url}
            isLink
          />
          <DetailField
            label="Additional competitor URLs"
            value={project.additional_competitor_urls}
            multiline
          />
          <DetailField
            label="Closest competitor product description"
            value={project.closest_competitor_product_description}
            multiline
          />
          <DetailField label="Target country" value={project.target_country} />
          <DetailField
            label="Cost price including shipping"
            value={project.cost_price_including_shipping}
          />
          <DetailField
            label="Planned sale price"
            value={project.planned_sale_price}
          />
          <DetailField label="Current offer" value={project.current_offer} />
          <DetailField
            label="Initial problem hypothesis"
            value={project.initial_problem_hypothesis}
            multiline
          />
          <DetailField
            label="Initial customer hypothesis"
            value={project.initial_customer_hypothesis}
            multiline
          />
          <DetailField label="Preferred tone" value={project.preferred_tone} />
        </div>
      ),
    };
  }

  if (selectedItem.type === "source") {
    const source = sources.find((s) => s.id === selectedItem.id);
    if (!source) return { title: "Source", body: <Missing /> };
    return {
      title: source.title || "Research source",
      body: (
        <div className="inspector-stack">
          <div className="inspector-meta-row">
            {source.platform ? (
              <span className="meta-chip">{source.platform}</span>
            ) : null}
            {source.emotional_theme ? (
              <span className="meta-chip meta-chip-theme">
                {source.emotional_theme}
              </span>
            ) : null}
            <span className="score-pill">{source.relevance_score}</span>
          </div>

          {source.url ? (
            <a
              className="btn btn-secondary btn-sm"
              href={source.url}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={14} /> Open source URL
            </a>
          ) : null}

          {source.summary ? (
            <div className="inspector-section">
              <h3 className="inspector-section-title">Summary</h3>
              <p className="insight-text">{source.summary}</p>
            </div>
          ) : null}

          {source.useful_phrases.length > 0 ? (
            <div className="inspector-section">
              <h3 className="inspector-section-title">Useful phrases</h3>
              <ul className="phrase-list">
                {source.useful_phrases.map((phrase, i) => (
                  <li key={i} className="phrase">
                    “{phrase}”
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ),
    };
  }

  if (selectedItem.type === "insight") {
    if (!insight) return { title: "Insight", body: <Missing /> };
    return {
      title: INSIGHT_SECTION_TITLES[selectedItem.section],
      body: renderInsightDetail(insight, selectedItem.section, selectedItem.index),
    };
  }

  if (selectedItem.type === "avatar") {
    if (!avatar?.content_json) return { title: "Customer avatar", body: <Missing /> };
    return {
      title: avatar.content_json.avatar_name || "Customer avatar",
      body: <AvatarDetail content={avatar.content_json} />,
    };
  }

  if (selectedItem.type === "desire") {
    const desire = desires.find((d) => d.id === selectedItem.id);
    if (!desire) return { title: "Mass desire", body: <Missing /> };
    return {
      title: "Mass desire",
      body: (
        <div className="inspector-stack">
          <h3 className="inspector-lead">{desire.desire_statement}</h3>
          {desire.audience_segment ? (
            <span className="meta-chip meta-chip-theme">
              {desire.audience_segment}
            </span>
          ) : null}
          <Field label="Emotional driver" value={desire.emotional_driver} />
          <Field
            label="What they are really buying"
            value={desire.what_they_are_really_buying}
          />
          <Field label="Life context" value={desire.life_context} />
          <Field
            label="Pain it moves away from"
            value={desire.pain_it_moves_away_from}
          />
          <Field
            label="Positive outcome it moves toward"
            value={desire.positive_outcome_it_moves_toward}
          />
          <Field
            label="Why this desire is distinct"
            value={desire.why_this_desire_is_distinct}
          />
          <Field label="Copy direction" value={desire.copy_direction} />
          <Field label="Messaging to avoid" value={desire.messaging_to_avoid} />
        </div>
      ),
    };
  }

  if (selectedItem.type === "angle") {
    const angle = angles.find((a) => a.id === selectedItem.id);
    if (!angle) return { title: "Marketing angle", body: <Missing /> };
    return {
      title: angle.angle_name || "Marketing angle",
      body: <AngleInspector angle={angle} {...props} />,
    };
  }

  if (selectedItem.type === "copy") {
    const copySet = copySets.find((c) => c.id === selectedItem.id);
    if (!copySet) return { title: "Quick copy", body: <Missing /> };
    return { title: "Quick copy", body: <QuickCopyDisplay copySet={copySet} /> };
  }

  if (selectedItem.type === "creative") {
    const promptSet = creativePromptSets.find((c) => c.id === selectedItem.id);
    if (!promptSet) return { title: "Creative prompts", body: <Missing /> };
    return {
      title: "Creative prompts",
      body: <CreativePromptsDisplay promptSet={promptSet} />,
    };
  }

  return { title: "Inspector", body: null };
}

function AngleInspector({
  angle,
  copySets,
  creativePromptSets,
  generatingCopyAngleId,
  generatingCreativePromptAngleId,
  savingReviewAngleId,
  onGenerateCopy,
  onGenerateCreativePrompts,
  onUpdateAngleReview,
}: { angle: MarketingAngle } & InspectorPanelProps) {
  const copySet = copySetForAngle(angle.id, copySets);
  const creative = creativeSetForAngle(angle.id, copySets, creativePromptSets);
  const isGeneratingCopy = generatingCopyAngleId === angle.id;
  const isGeneratingCreative = generatingCreativePromptAngleId === angle.id;

  return (
    <div className="inspector-stack">
      <div className="inspector-actions">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => onGenerateCopy(angle.id)}
          disabled={isGeneratingCopy}
        >
          {isGeneratingCopy ? (
            <Loader2 size={14} strokeWidth={2.5} className="spin" />
          ) : (
            <PenLine size={14} strokeWidth={2.5} />
          )}
          {isGeneratingCopy ? "Generating…" : "Generate Quick Copy"}
        </button>

        {copySet ? (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onGenerateCreativePrompts(angle.id, copySet.id)}
            disabled={isGeneratingCreative}
          >
            {isGeneratingCreative ? (
              <Loader2 size={14} strokeWidth={2.5} className="spin" />
            ) : (
              <Sparkles size={14} strokeWidth={2.5} />
            )}
            {isGeneratingCreative ? "Generating…" : "Generate Creative Prompts"}
          </button>
        ) : (
          <span className="inspector-hint">Generate Quick Copy first</span>
        )}
      </div>

      <div className="compliance-placeholder compliance-placeholder-sm">
        <ShieldCheck size={15} strokeWidth={2} />
        <span>Run Compliance Check before publishing (coming soon).</span>
      </div>

      <AngleReviewControls
        key={angle.id}
        angle={angle}
        isSaving={savingReviewAngleId === angle.id}
        onUpdate={(updates) => onUpdateAngleReview(angle.id, updates)}
      />

      <div className="inspector-section">
        <h3 className="inspector-section-title">Angle details</h3>
        <Field label="Target audience" value={angle.target_audience} />
        <Field label="Story arc" value={angle.story_arc} />
        <Field label="Beginning situation" value={angle.beginning_situation} />
        <Field
          label="Crisis / realization"
          value={angle.crisis_or_realization_moment}
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
        <Field
          label="Key emotional moment"
          value={angle.key_emotional_moment}
        />
        <Field label="Copy direction" value={angle.copy_direction} />
        <Field label="Creative direction" value={angle.creative_direction} />
      </div>

      {angle.real_language_patterns.length > 0 ? (
        <div className="inspector-section">
          <h3 className="inspector-section-title">Real language patterns</h3>
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
        <div className="inspector-section">
          <h3 className="inspector-section-title">Compliance notes</h3>
          <ul className="bullet-list">
            {angle.compliance_notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {copySet ? <QuickCopyDisplay copySet={copySet} /> : null}
      {creative ? <CreativePromptsDisplay promptSet={creative} /> : null}
    </div>
  );
}

function renderInsightDetail(
  insight: ResearchInsight,
  section: InsightSectionKey,
  index: number
): React.ReactNode {
  if (section === "pain_clusters") {
    const item = insight.pain_clusters[index];
    if (!item) return <Missing />;
    return (
      <div className="inspector-stack">
        <span className={`intensity intensity-${item.emotional_intensity}`}>
          {item.emotional_intensity}
        </span>
        <Field label="Description" value={item.description} />
        {item.evidence_from_sources.length > 0 ? (
          <div className="inspector-section">
            <h3 className="inspector-section-title">Evidence</h3>
            <ul className="phrase-list">
              {item.evidence_from_sources.map((ev, i) => (
                <li key={i} className="phrase">
                  {ev}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  if (section === "language_patterns") {
    const item = insight.language_patterns[index];
    if (!item) return <Missing />;
    return (
      <div className="inspector-stack">
        <h3 className="inspector-lead">“{item.pattern}”</h3>
        <Field label="Meaning" value={item.meaning} />
        <Field label="Copywriting use" value={item.copywriting_use} />
      </div>
    );
  }

  if (section === "emotional_states") {
    const item = insight.emotional_states[index];
    if (!item) return <Missing />;
    return (
      <div className="inspector-stack">
        <h3 className="inspector-lead">{item.state}</h3>
        <Field label="Description" value={item.description} />
        {item.trigger_moments.length > 0 ? (
          <div className="inspector-section">
            <h3 className="inspector-section-title">Trigger moments</h3>
            <ul className="phrase-list">
              {item.trigger_moments.map((tm, i) => (
                <li key={i} className="phrase">
                  {tm}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  if (section === "failed_solutions") {
    const item = insight.failed_solutions[index];
    if (!item) return <Missing />;
    return (
      <div className="inspector-stack">
        <h3 className="inspector-lead">{item.solution}</h3>
        <Field label="Why it failed" value={item.why_it_failed} />
        <Field label="Market belief" value={item.market_belief} />
      </div>
    );
  }

  if (section === "hopes") {
    const item = insight.hopes[index];
    if (!item) return <Missing />;
    return <p className="insight-text">{item}</p>;
  }

  if (section === "fears") {
    const item = insight.fears[index];
    if (!item) return <Missing />;
    return <p className="insight-text">{item}</p>;
  }

  if (section === "copywriting_notes") {
    return (
      <p className="insight-text">{insight.copywriting_notes || "—"}</p>
    );
  }

  if (section === "compliance_warnings") {
    const item = insight.compliance_warnings[index];
    if (!item) return <Missing />;
    return (
      <div className="inspector-stack">
        <h3 className="inspector-lead">{item.risk}</h3>
        <Field label="Why it matters" value={item.why_it_matters} />
        <Field label="Safer direction" value={item.safer_direction} />
      </div>
    );
  }

  return <Missing />;
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value?.trim()) return null;
  return (
    <p className="insight-text">
      <strong>{label}:</strong> {value}
    </p>
  );
}

function Missing() {
  return (
    <p className="inspector-hint">
      This item is no longer available. It may have been regenerated.
    </p>
  );
}
