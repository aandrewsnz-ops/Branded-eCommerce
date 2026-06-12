import { useState } from "react";
import { AlertTriangle, Loader2, UserRound } from "lucide-react";
import type {
  CustomerAvatarContent,
  CustomerAvatarExistingSolution,
  CustomerAvatarOutput,
} from "../types";

interface CustomerAvatarWorkspaceProps {
  avatar: CustomerAvatarOutput | null;
  hasInsight: boolean;
  isGeneratingAvatar: boolean;
  isAvatarLoading: boolean;
  avatarError: string | null;
  onGenerateAvatar: () => void;
}

/* ------------------------------------------------------------------ */
/* Normalization — defend against older/partial saved avatars         */
/* ------------------------------------------------------------------ */

function arr(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v : v == null ? "" : String(v)))
    .filter((v) => v.trim().length > 0);
}

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

/* ------------------------------------------------------------------ */
/* Section + shared primitives                                         */
/* ------------------------------------------------------------------ */

interface AvatarSectionProps {
  title: string;
  count?: number;
  gridClass: string;
  children: React.ReactNode;
}

function AvatarSection({ title, count, gridClass, children }: AvatarSectionProps) {
  return (
    <section className="avatar-section">
      <div className="avatar-section-header">
        <h3 className="avatar-section-title">{title}</h3>
        {typeof count === "number" ? (
          <span className="avatar-section-count">{count}</span>
        ) : null}
      </div>
      <div className={`avatar-card-grid ${gridClass}`}>{children}</div>
    </section>
  );
}

/** Long text with a collapsed preview + Show more toggle. */
function ExpandableText({
  text,
  clampClass = "avatar-clamp-5",
}: {
  text: string;
  clampClass?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!text.trim()) return <p className="avatar-card-value">—</p>;
  const long = text.length > 170;
  return (
    <>
      <p className={`avatar-card-value${open || !long ? "" : ` ${clampClass}`}`}>
        {text}
      </p>
      {long ? (
        <button
          type="button"
          className="avatar-showmore"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Show less" : "Show more"}
        </button>
      ) : null}
    </>
  );
}

/** Bullet list with a previewed item count + Show more toggle. */
function BulletList({
  items,
  previewCount = 6,
}: {
  items: string[];
  previewCount?: number;
}) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return <p className="avatar-card-value">—</p>;
  const visible = open ? items : items.slice(0, previewCount);
  return (
    <>
      <ul className="avatar-bullets">
        {visible.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
      {items.length > previewCount ? (
        <button
          type="button"
          className="avatar-showmore"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Show less" : `+ ${items.length - previewCount} more`}
        </button>
      ) : null}
    </>
  );
}

function DefCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="avatar-card">
      <div className="avatar-card-top">
        <span className="avatar-card-label">{label}</span>
      </div>
      <div className="avatar-card-body">
        <ExpandableText text={value} clampClass="avatar-clamp-4" />
      </div>
    </article>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="avatar-card">
      <div className="avatar-card-top">
        <h4 className="avatar-card-title">{title}</h4>
      </div>
      <div className="avatar-card-body">
        <BulletList items={items} />
      </div>
    </article>
  );
}

function TextCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="avatar-card">
      <div className="avatar-card-top">
        <h4 className="avatar-card-title">{title}</h4>
      </div>
      <div className="avatar-card-body">
        <ExpandableText text={text} />
      </div>
    </article>
  );
}

function StatementCard({ text }: { text: string }) {
  return <article className="avatar-statement-card accent-left">{text}</article>;
}

function ExistingSolutionCard({
  solution,
}: {
  solution: CustomerAvatarExistingSolution;
}) {
  const [open, setOpen] = useState(false);
  const clampClass = open ? "" : "avatar-clamp-4";
  const fields: { label: string; value: string }[] = [
    { label: "Experience", value: str(solution.experience) },
    { label: "Likes", value: str(solution.likes) },
    { label: "Dislikes", value: str(solution.dislikes) },
    {
      label: "Belief about effectiveness",
      value: str(solution.belief_about_effectiveness),
    },
  ];
  const hasLong = fields.some((f) => f.value.length > 150);
  return (
    <article className="avatar-card avatar-solution-card">
      <header className="avatar-card-top">
        <h4 className="avatar-card-title">
          {str(solution.solution) || "Solution"}
        </h4>
      </header>
      {fields.map((field) => (
        <div key={field.label} className="avatar-card-field">
          <span className="avatar-card-flabel">{field.label}</span>
          <p className={`avatar-card-fvalue ${clampClass}`}>
            {field.value || "—"}
          </p>
        </div>
      ))}
      <div className="avatar-solution-foot">
        {hasLong ? (
          <button
            type="button"
            className="avatar-showmore"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Show less" : "Show more"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

function AvatarDashboard({ content }: { content: CustomerAvatarContent }) {
  const demographics = content.demographics ?? ({} as never);
  const psychographics = content.psychographics ?? ({} as never);
  const victoriesFailures =
    content.victories_and_failures ?? ({ victories: [], failures: [] } as never);
  const languageBank =
    content.language_bank ??
    ({
      phrases_they_use: [],
      words_to_use_in_copy: [],
      words_to_avoid: [],
    } as never);
  const copy = content.copywriting_implications ?? ({} as never);

  const demoCards = [
    { label: "Age range", value: str(demographics.age_range) },
    { label: "Gender skew", value: str(demographics.gender_skew) },
    { label: "Location", value: str(demographics.location_context) },
    {
      label: "Income / spending",
      value: str(demographics.income_or_spending_context),
    },
    { label: "Life stage", value: str(demographics.life_stage) },
  ].filter((c) => c.value.trim().length > 0);

  const psychoCards = [
    { title: "Core beliefs", items: arr(psychographics.core_beliefs) },
    { title: "Attitudes", items: arr(psychographics.attitudes) },
    { title: "Identity markers", items: arr(psychographics.identity_markers) },
    { title: "Values", items: arr(psychographics.values) },
    {
      title: "Prejudices / biases",
      items: arr(psychographics.prejudices_or_biases),
    },
  ].filter((c) => c.items.length > 0);

  const hopes = arr(content.hopes_and_dreams);
  const victories = arr(victoriesFailures.victories);
  const failures = arr(victoriesFailures.failures);
  const outsideForces = arr(content.outside_forces_they_blame);
  const horrorStories = arr(content.horror_stories_or_bad_experiences);
  const solutions = Array.isArray(content.existing_solutions)
    ? content.existing_solutions
    : [];
  const triggers = arr(content.buying_triggers);
  const objections = arr(content.objections);
  const phrases = arr(languageBank.phrases_they_use);
  const wordsUse = arr(languageBank.words_to_use_in_copy);
  const wordsAvoid = arr(languageBank.words_to_avoid);
  const trustBuilders = arr(copy.trust_builders);
  const riskReducers = arr(copy.risk_reducers);
  const bestEmotional = str(copy.best_emotional_angle);
  const bestLogical = str(copy.best_logical_angle);
  const compliance = arr(content.compliance_notes);

  const hasCopyImplications =
    bestEmotional.trim().length > 0 ||
    bestLogical.trim().length > 0 ||
    trustBuilders.length > 0 ||
    riskReducers.length > 0;
  const hasLanguageBank =
    phrases.length > 0 || wordsUse.length > 0 || wordsAvoid.length > 0;

  return (
    <div className="avatar-dashboard">
      {/* 1. Hero */}
      <section className="avatar-hero">
        <h2 className="avatar-hero-name">
          {str(content.avatar_name) || "Customer avatar"}
        </h2>
        <p className="avatar-hero-summary">
          {str(content.avatar_summary) || "—"}
        </p>
      </section>

      {/* 2. Demographics */}
      {demoCards.length > 0 ? (
        <AvatarSection title="Demographics" gridClass="cols-3">
          {demoCards.map((card) => (
            <DefCard key={card.label} label={card.label} value={card.value} />
          ))}
        </AvatarSection>
      ) : null}

      {/* 3. Psychographics */}
      {psychoCards.length > 0 ? (
        <AvatarSection title="Psychographics" gridClass="cols-3">
          {psychoCards.map((card) => (
            <ListCard key={card.title} title={card.title} items={card.items} />
          ))}
        </AvatarSection>
      ) : null}

      {/* 4. Hopes and Dreams */}
      {hopes.length > 0 ? (
        <AvatarSection
          title="Hopes and Dreams"
          count={hopes.length}
          gridClass="cols-auto"
        >
          {hopes.map((hope, i) => (
            <StatementCard key={i} text={hope} />
          ))}
        </AvatarSection>
      ) : null}

      {/* 5. Victories and Failures */}
      {victories.length > 0 || failures.length > 0 ? (
        <section className="avatar-section">
          <div className="avatar-section-header">
            <h3 className="avatar-section-title">Victories and Failures</h3>
          </div>
          <div className="avatar-vf">
            <div className="avatar-vf-col col-victory">
              <span className="avatar-vf-head">Victories ({victories.length})</span>
              {victories.map((v, i) => (
                <article key={i} className="avatar-statement-card">
                  {v}
                </article>
              ))}
            </div>
            <div className="avatar-vf-col col-failure">
              <span className="avatar-vf-head">Failures ({failures.length})</span>
              {failures.map((f, i) => (
                <article key={i} className="avatar-statement-card">
                  {f}
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* 6. Existing Solutions */}
      {solutions.length > 0 ? (
        <AvatarSection
          title="Existing Solutions"
          count={solutions.length}
          gridClass="cols-4"
        >
          {solutions.map((solution, i) => (
            <ExistingSolutionCard key={i} solution={solution} />
          ))}
        </AvatarSection>
      ) : null}

      {/* 7. Buying Triggers */}
      {triggers.length > 0 ? (
        <AvatarSection
          title="Buying Triggers"
          count={triggers.length}
          gridClass="cols-auto"
        >
          {triggers.map((trigger, i) => (
            <StatementCard key={i} text={trigger} />
          ))}
        </AvatarSection>
      ) : null}

      {/* 8. Objections */}
      {objections.length > 0 ? (
        <AvatarSection
          title="Objections"
          count={objections.length}
          gridClass="cols-auto"
        >
          {objections.map((objection, i) => (
            <StatementCard key={i} text={objection} />
          ))}
        </AvatarSection>
      ) : null}

      {/* Outside forces they blame (extra avatar content) */}
      {outsideForces.length > 0 ? (
        <AvatarSection
          title="Outside Forces They Blame"
          count={outsideForces.length}
          gridClass="cols-auto"
        >
          {outsideForces.map((force, i) => (
            <StatementCard key={i} text={force} />
          ))}
        </AvatarSection>
      ) : null}

      {/* Horror stories / bad experiences (extra avatar content) */}
      {horrorStories.length > 0 ? (
        <AvatarSection
          title="Horror Stories & Bad Experiences"
          count={horrorStories.length}
          gridClass="cols-auto"
        >
          {horrorStories.map((story, i) => (
            <StatementCard key={i} text={story} />
          ))}
        </AvatarSection>
      ) : null}

      {/* 9. Language Bank */}
      {hasLanguageBank ? (
        <section className="avatar-section">
          <div className="avatar-section-header">
            <h3 className="avatar-section-title">Language Bank</h3>
          </div>
          <div className="avatar-lang-grid">
            <div className="avatar-lang-card">
              <h4 className="avatar-card-title">Phrases they use</h4>
              {phrases.length > 0 ? (
                phrases.map((phrase, i) => (
                  <p key={i} className="avatar-quote-chip">
                    “{phrase}”
                  </p>
                ))
              ) : (
                <p className="avatar-card-value">—</p>
              )}
            </div>
            <div className="avatar-lang-card">
              <h4 className="avatar-card-title">Words to use in copy</h4>
              {wordsUse.length > 0 ? (
                <div className="avatar-chip-grid">
                  {wordsUse.map((word, i) => (
                    <span key={i} className="avatar-chip chip-use">
                      {word}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="avatar-card-value">—</p>
              )}
            </div>
            <div className="avatar-lang-card">
              <h4 className="avatar-card-title">Words to avoid</h4>
              {wordsAvoid.length > 0 ? (
                <div className="avatar-chip-grid">
                  {wordsAvoid.map((word, i) => (
                    <span key={i} className="avatar-chip chip-avoid">
                      {word}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="avatar-card-value">—</p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* 10. Copywriting Implications */}
      {hasCopyImplications ? (
        <AvatarSection title="Copywriting Implications" gridClass="cols-4">
          {bestEmotional.trim() ? (
            <TextCard title="Best emotional angle" text={bestEmotional} />
          ) : null}
          {bestLogical.trim() ? (
            <TextCard title="Best logical angle" text={bestLogical} />
          ) : null}
          {trustBuilders.length > 0 ? (
            <ListCard title="Trust builders" items={trustBuilders} />
          ) : null}
          {riskReducers.length > 0 ? (
            <ListCard title="Risk reducers" items={riskReducers} />
          ) : null}
        </AvatarSection>
      ) : null}

      {/* 11. Compliance Notes */}
      {compliance.length > 0 ? (
        <AvatarSection
          title="Compliance Notes"
          count={compliance.length}
          gridClass="cols-3"
        >
          {compliance.map((note, i) => (
            <article key={i} className="avatar-warning-card">
              {note}
            </article>
          ))}
        </AvatarSection>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Workspace shell                                                     */
/* ------------------------------------------------------------------ */

export function CustomerAvatarWorkspace({
  avatar,
  hasInsight,
  isGeneratingAvatar,
  isAvatarLoading,
  avatarError,
  onGenerateAvatar,
}: CustomerAvatarWorkspaceProps) {
  const generateDisabled = isGeneratingAvatar || !hasInsight;

  return (
    <div className="workspace workspace-full">
      <div className="workspace-head">
        <div>
          <h2 className="workspace-title">Customer Avatar</h2>
          <p className="workspace-sub">
            The buyer profile that follows from the insight report
          </p>
        </div>
        <div className="workspace-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onGenerateAvatar}
            disabled={generateDisabled}
            title={
              hasInsight
                ? undefined
                : "Generate the Insight Report before creating the Customer Avatar."
            }
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

      {!hasInsight ? (
        <div className="banner banner-info" role="note">
          <AlertTriangle size={16} />
          <span>
            Generate the Insight Report before creating the Customer Avatar.
          </span>
        </div>
      ) : null}

      {avatarError ? (
        <div className="banner banner-error" role="alert">
          <AlertTriangle size={16} />
          <span>{avatarError}</span>
        </div>
      ) : null}

      {avatar?.content_json ? (
        <AvatarDashboard content={avatar.content_json} />
      ) : isAvatarLoading || isGeneratingAvatar ? (
        <div className="list-state">
          <Loader2 size={16} strokeWidth={2} className="spin" />
          <span>
            {isGeneratingAvatar
              ? "Generating customer avatar… this can take a minute."
              : "Loading customer avatar…"}
          </span>
        </div>
      ) : (
        <div className="empty-state empty-state-sm">
          <UserRound size={26} strokeWidth={1.5} />
          <p>
            No customer avatar yet. Generate the Insight Report first, then
            generate the Customer Avatar.
          </p>
        </div>
      )}
    </div>
  );
}
