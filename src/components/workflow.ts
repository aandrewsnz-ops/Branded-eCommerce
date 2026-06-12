import type {
  AdCopySet,
  CreativePromptSet,
  ImagePrompt,
  MarketingAngle,
  ResearchSource,
  UgcScript,
} from "../types";

export type WorkflowMode =
  | "setup"
  | "research"
  | "insights"
  | "strategy"
  | "creative"
  | "review";

export interface WorkflowModeDef {
  id: WorkflowMode;
  label: string;
}

export const WORKFLOW_MODES: readonly WorkflowModeDef[] = [
  { id: "setup", label: "Setup" },
  { id: "research", label: "Research" },
  { id: "insights", label: "Insights" },
  { id: "strategy", label: "Strategy" },
  { id: "creative", label: "Creative" },
  { id: "review", label: "Review" },
] as const;

export type ModeStatus = "missing" | "ready" | "done";

/** Discriminated union describing the item shown in the right inspector. */
export type SelectedItem =
  | { type: "project" }
  | { type: "source"; id: string }
  | { type: "insight"; section: InsightSectionKey; index: number }
  | { type: "avatar" }
  | { type: "desire"; id: string }
  | { type: "angle"; id: string }
  | { type: "copy"; id: string }
  | { type: "creative"; id: string };

export type InsightSectionKey =
  | "pain_clusters"
  | "language_patterns"
  | "emotional_states"
  | "failed_solutions"
  | "hopes"
  | "fears"
  | "copywriting_notes"
  | "compliance_warnings";

/* ------------------------------------------------------------------ */
/* Research filters                                                    */
/* ------------------------------------------------------------------ */

export type ResearchFilterId =
  | "all"
  | "highest_relevance"
  | "strongest_pain"
  | "best_quotes"
  | "failed_solutions"
  | "creative_inspiration";

export const RESEARCH_FILTERS: readonly { id: ResearchFilterId; label: string }[] =
  [
    { id: "all", label: "All" },
    { id: "highest_relevance", label: "Highest relevance" },
    { id: "strongest_pain", label: "Strongest pain" },
    { id: "best_quotes", label: "Best quotes" },
    { id: "failed_solutions", label: "Failed solutions" },
    { id: "creative_inspiration", label: "Creative inspiration" },
  ] as const;

const PAIN_KEYWORDS = [
  "pain",
  "hurt",
  "ache",
  "frustrat",
  "embarrass",
  "anxiet",
  "anxious",
  "insecure",
  "worry",
  "fear",
  "regret",
  "ashamed",
  "self-conscious",
  "struggle",
];

const FAILED_KEYWORDS = [
  "fail",
  "didn't work",
  "didnt work",
  "waste",
  "wasted",
  "scam",
  "useless",
  "disappoint",
  "gave up",
  "stopped using",
  "returned",
  "refund",
];

const CREATIVE_KEYWORDS = [
  "before",
  "after",
  "photo",
  "mirror",
  "video",
  "routine",
  "transformation",
  "look",
  "visible",
  "show",
  "compare",
  "comparison",
];

function textBlob(source: ResearchSource): string {
  return [
    source.title,
    source.summary,
    source.emotional_theme,
    source.useful_phrases.join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

function matchesAny(blob: string, keywords: string[]): boolean {
  return keywords.some((kw) => blob.includes(kw));
}

/**
 * Apply a research filter to the source list. "all" returns the input order.
 * The other filters use client-side heuristics over available fields
 * (relevance score, emotional theme, title, summary, useful phrases).
 */
export function applyResearchFilter(
  sources: ResearchSource[],
  filter: ResearchFilterId
): ResearchSource[] {
  if (filter === "all") {
    return sources;
  }

  if (filter === "highest_relevance") {
    return [...sources].sort(
      (a, b) => b.relevance_score - a.relevance_score
    );
  }

  if (filter === "best_quotes") {
    return [...sources]
      .filter((s) => s.useful_phrases.length > 0)
      .sort((a, b) => b.useful_phrases.length - a.useful_phrases.length);
  }

  if (filter === "strongest_pain") {
    return sources.filter((s) => matchesAny(textBlob(s), PAIN_KEYWORDS));
  }

  if (filter === "failed_solutions") {
    return sources.filter((s) => matchesAny(textBlob(s), FAILED_KEYWORDS));
  }

  if (filter === "creative_inspiration") {
    return sources.filter((s) => matchesAny(textBlob(s), CREATIVE_KEYWORDS));
  }

  return sources;
}

/* ------------------------------------------------------------------ */
/* Angle review filters (shared by Strategy / Review modes)            */
/* ------------------------------------------------------------------ */

export type AngleFilterId =
  | "all"
  | "shortlisted"
  | "rejected"
  | "needs_copy"
  | "ready_for_creative"
  | "ready_to_publish";

export const ANGLE_FILTERS: readonly { id: AngleFilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "shortlisted", label: "Shortlisted" },
  { id: "rejected", label: "Rejected" },
  { id: "needs_copy", label: "Needs copy" },
  { id: "ready_for_creative", label: "Ready for creative" },
  { id: "ready_to_publish", label: "Ready to publish" },
] as const;

export function angleMatchesFilter(
  angle: MarketingAngle,
  filter: AngleFilterId
): boolean {
  if (filter === "all") {
    return true;
  }
  if (filter === "shortlisted") {
    return angle.is_shortlisted || angle.review_status === "shortlisted";
  }
  return angle.review_status === filter;
}

/* ------------------------------------------------------------------ */
/* Creative-mode filters                                               */
/* ------------------------------------------------------------------ */

export type CreativeFilterId =
  | "all"
  | "shortlisted"
  | "needs_copy"
  | "has_copy"
  | "needs_creative"
  | "has_creative"
  | "ready_for_review";

export const CREATIVE_FILTERS: readonly {
  id: CreativeFilterId;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "shortlisted", label: "Shortlisted" },
  { id: "needs_copy", label: "Needs quick copy" },
  { id: "has_copy", label: "Has quick copy" },
  { id: "needs_creative", label: "Needs creative prompts" },
  { id: "has_creative", label: "Has creative prompts" },
  { id: "ready_for_review", label: "Ready for review" },
] as const;

/* ------------------------------------------------------------------ */
/* Copy-to-clipboard formatters (shared with inspector)                */
/* ------------------------------------------------------------------ */

export function quickCopyWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function formatImagePromptForCopy(prompt: ImagePrompt): string {
  return [
    `${prompt.concept_name} (${prompt.aspect_ratio})`,
    "",
    prompt.prompt,
    "",
    prompt.overlay_text ? `Overlay: ${prompt.overlay_text}` : "",
    prompt.style_notes ? `Style: ${prompt.style_notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatUgcScriptForCopy(script: UgcScript): string {
  return [
    `${script.script_name} (${script.duration})`,
    "",
    `Hook: ${script.hook}`,
    "",
    script.script,
    "",
    script.shot_list.length > 0
      ? `Shot list:\n${script.shot_list.map((shot) => `- ${shot}`).join("\n")}`
      : "",
    "",
    script.caption ? `Caption: ${script.caption}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/* ------------------------------------------------------------------ */
/* Per-angle asset helpers                                             */
/* ------------------------------------------------------------------ */

export function copySetForAngle(
  angleId: string,
  copySets: AdCopySet[]
): AdCopySet | undefined {
  return copySets.find((set) => set.marketing_angle_id === angleId);
}

export function creativeSetForAngle(
  angleId: string,
  copySets: AdCopySet[],
  creativePromptSets: CreativePromptSet[]
): CreativePromptSet | undefined {
  const copySet = copySetForAngle(angleId, copySets);
  if (!copySet) return undefined;
  return creativePromptSets.find((set) => set.ad_copy_set_id === copySet.id);
}
