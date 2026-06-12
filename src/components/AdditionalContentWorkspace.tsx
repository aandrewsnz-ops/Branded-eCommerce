import { Archive } from "lucide-react";
import type {
  AdCandidate,
  AdCopySet,
  CreativePromptSet,
  MarketingAngle,
  ResearchInsight,
  ResearchSource,
} from "../types";
import {
  CollapsibleInsightSection,
  CopyButton,
  CreativePromptsDisplay,
} from "./shared";
import { copySetForAngle, creativeSetForAngle } from "./workflow";

interface AdditionalContentWorkspaceProps {
  angles: MarketingAngle[];
  copySets: AdCopySet[];
  creativePromptSets: CreativePromptSet[];
  adCandidates: AdCandidate[];
  sources: ResearchSource[];
  insight: ResearchInsight | null;
}

function UnusedList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="archive-unused">
      <span className="select-group-title">
        {title} ({items.length})
      </span>
      <ul className="copy-list">
        {items.map((text, i) => (
          <li key={i} className="copy-list-item">
            <span>{text}</span>
            <CopyButton text={text} label="" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AdditionalContentWorkspace({
  angles,
  copySets,
  creativePromptSets,
  adCandidates,
  sources,
  insight,
}: AdditionalContentWorkspaceProps) {
  const candidateByAngle = new Map(
    adCandidates.map((c) => [c.marketing_angle_id, c])
  );

  const anglesWithContent = [...angles]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((angle) => ({
      angle,
      copySet: copySetForAngle(angle.id, copySets),
      creativeSet: creativeSetForAngle(angle.id, copySets, creativePromptSets),
    }))
    .filter((entry) => entry.copySet || entry.creativeSet);

  const hasAny =
    anglesWithContent.length > 0 || sources.length > 0 || Boolean(insight);

  return (
    <div className="workspace workspace-full">
      <div className="workspace-head">
        <div>
          <h2 className="workspace-title">Additional Content</h2>
          <p className="workspace-sub">
            Reference archive of generated material. Copy is created and reviewed
            on the Strategy page.
          </p>
        </div>
      </div>

      {!hasAny ? (
        <div className="empty-state">
          <Archive size={32} strokeWidth={1.5} />
          <p>
            Nothing archived yet. Generated copy, creative prompts, research, and
            insights will collect here.
          </p>
        </div>
      ) : null}

      {/* ---- Generated material per angle ---- */}
      {anglesWithContent.map(({ angle, copySet, creativeSet }) => {
        const candidate = candidateByAngle.get(angle.id);
        const allPrimaries = copySet
          ? [
              ...copySet.short_primary_texts.map((p) => p.text),
              ...copySet.medium_primary_texts.map((p) => p.text),
            ]
          : [];
        const unusedPrimaries = allPrimaries.filter(
          (t) => t !== candidate?.selected_primary_text
        );
        const unusedHeadlines = (copySet?.headlines ?? [])
          .map((h) => h.text)
          .filter((t) => t !== candidate?.selected_headline);
        const unusedDescriptions = (copySet?.descriptions ?? [])
          .map((d) => d.text)
          .filter((t) => t !== candidate?.selected_description);
        const unusedHooks = (copySet?.hooks ?? [])
          .map((h) => h.text)
          .filter((t) => t !== candidate?.selected_hook);
        const unusedCallouts = (copySet?.callouts ?? [])
          .map((c) => c.text)
          .filter((t) => !candidate?.selected_callouts.includes(t));

        return (
          <CollapsibleInsightSection
            key={angle.id}
            title={angle.angle_name}
            defaultCollapsed
          >
            <div className="archive-block">
              {copySet?.long_form_story.trim() ? (
                <div className="archive-unused">
                  <span className="select-group-title">
                    Long-form / concept story
                  </span>
                  <div className="copy-block">
                    <div className="copy-block-head">
                      <CopyButton text={copySet.long_form_story} />
                    </div>
                    <p className="copy-block-text">{copySet.long_form_story}</p>
                  </div>
                </div>
              ) : null}

              <UnusedList
                title="Unused primary text variants"
                items={unusedPrimaries}
              />
              <UnusedList title="Unused headlines" items={unusedHeadlines} />
              <UnusedList
                title="Unused descriptions"
                items={unusedDescriptions}
              />
              <UnusedList title="Unused hooks" items={unusedHooks} />
              <UnusedList title="Unused callouts" items={unusedCallouts} />

              {creativeSet ? (
                <CreativePromptsDisplay promptSet={creativeSet} />
              ) : null}

              {/* Full marketing angle details */}
              <div className="archive-unused">
                <span className="select-group-title">Full angle details</span>
                <ArchiveField label="Target audience" value={angle.target_audience} />
                <ArchiveField label="Story arc" value={angle.story_arc} />
                <ArchiveField
                  label="Unique problem mechanism"
                  value={angle.unique_problem_mechanism}
                />
                <ArchiveField
                  label="Unique solution mechanism"
                  value={angle.unique_solution_mechanism}
                />
                {angle.real_language_patterns.length > 0 ? (
                  <ul className="phrase-list">
                    {angle.real_language_patterns.map((p, i) => (
                      <li key={i} className="phrase">
                        “{p}”
                      </li>
                    ))}
                  </ul>
                ) : null}
                {angle.compliance_notes.length > 0 ? (
                  <ul className="bullet-list">
                    {angle.compliance_notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </CollapsibleInsightSection>
        );
      })}

      {/* ---- Research references ---- */}
      {sources.length > 0 ? (
        <CollapsibleInsightSection
          title={`Research references (${sources.length})`}
          defaultCollapsed
        >
          <ul className="copy-list">
            {sources.map((source) => (
              <li key={source.id} className="copy-list-item">
                <span>
                  {source.platform ? (
                    <span className="meta-chip">{source.platform}</span>
                  ) : null}{" "}
                  {source.title}
                </span>
                {source.url ? (
                  <a
                    className="research-card-link"
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </CollapsibleInsightSection>
      ) : null}

      {/* ---- Insight notes + compliance warnings ---- */}
      {insight ? (
        <CollapsibleInsightSection title="Insight notes & warnings" defaultCollapsed>
          <div className="archive-block">
            {insight.copywriting_notes ? (
              <div className="archive-unused">
                <span className="select-group-title">Copywriting notes</span>
                <p className="insight-text insight-text-pre">
                  {insight.copywriting_notes}
                </p>
              </div>
            ) : null}
            {insight.compliance_warnings.length > 0 ? (
              <div className="archive-unused">
                <span className="select-group-title">
                  Compliance warnings from research
                </span>
                {insight.compliance_warnings.map((cw, i) => (
                  <div key={i} className="dash-card dash-card-warning">
                    <h4 className="dash-card-title">{cw.risk}</h4>
                    <p className="dash-card-text">{cw.safer_direction}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </CollapsibleInsightSection>
      ) : null}
    </div>
  );
}

function ArchiveField({ label, value }: { label: string; value: string }) {
  if (!value?.trim()) return null;
  return (
    <p className="angle-field">
      <span className="angle-field-label">{label}</span>
      <span className="angle-field-value">{value}</span>
    </p>
  );
}
