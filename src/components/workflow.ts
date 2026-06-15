import type {
  AdCopySet,
  CreativePromptSet,
  DesireConceptSet,
  ImagePrompt,
  MarketingAngle,
  ResearchSource,
  UgcScript,
} from "../types";

export type WorkflowMode =
  | "setup"
  | "research"
  | "insight_report"
  | "avatar"
  | "strategy"
  | "ads"
  | "view_ads"
  | "publish_ads"
  | "additional";

export interface WorkflowModeDef {
  id: WorkflowMode;
  label: string;
}

export const WORKFLOW_MODES: readonly WorkflowModeDef[] = [
  { id: "setup", label: "Setup" },
  { id: "research", label: "Research" },
  { id: "insight_report", label: "Insight Report" },
  { id: "avatar", label: "Customer Avatar" },
  { id: "strategy", label: "Strategy" },
  { id: "ads", label: "Review Ads" },
  { id: "view_ads", label: "View Ads" },
  { id: "publish_ads", label: "Publish Ads" },
  { id: "additional", label: "Additional Content" },
] as const;

export type ModeStatus = "missing" | "ready" | "done";

/* ------------------------------------------------------------------ */
/* Research filters                                                    */
/* ------------------------------------------------------------------ */

export type ResearchFilterId =
  | "all"
  | "highest_relevance"
  | "strongest_pain"
  | "best_quotes"
  | "failed_solutions"
  | "creative_inspiration"
  | "ignored";

export const RESEARCH_FILTERS: readonly { id: ResearchFilterId; label: string }[] =
  [
    { id: "all", label: "All" },
    { id: "highest_relevance", label: "Highest relevance" },
    { id: "strongest_pain", label: "Strongest pain" },
    { id: "best_quotes", label: "Best quotes" },
    { id: "failed_solutions", label: "Failed solutions" },
    { id: "creative_inspiration", label: "Creative inspiration" },
    { id: "ignored", label: "Ignored" },
  ] as const;

/* ------------------------------------------------------------------ */
/* Local research selection model (UI-only, not persisted)            */
/* ------------------------------------------------------------------ */

export type ResearchTagId =
  | "top_pain"
  | "best_quote"
  | "use_for_angle"
  | "use_for_creative"
  | "ignore";

export const RESEARCH_TAGS: readonly { id: ResearchTagId; label: string }[] = [
  { id: "top_pain", label: "Top pain" },
  { id: "best_quote", label: "Best quote" },
  { id: "use_for_angle", label: "Use for angles" },
  { id: "use_for_creative", label: "Creative inspiration" },
  { id: "ignore", label: "Ignore" },
] as const;

export type ResearchSelectionMap = Record<string, ResearchTagId[]>;

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

export function conceptSetForDesire(
  desireId: string,
  conceptSets: DesireConceptSet[]
): DesireConceptSet | undefined {
  return conceptSets.find((set) => set.mass_desire_id === desireId);
}

/** Count TOF ads with an uploaded image URL. */
export function conceptSetUploadedImageCount(
  conceptSet: DesireConceptSet | undefined
): number {
  if (!conceptSet?.concepts?.length) return 0;
  return conceptSet.concepts.filter((concept) =>
    Boolean(concept.image_url?.trim())
  ).length;
}

/** Badge label for Strategy mass desire cards when TOF images exist. */
export function conceptSetImageBadgeLabel(
  conceptSet: DesireConceptSet | undefined
): string | null {
  const count = conceptSetUploadedImageCount(conceptSet);
  if (count === 0) return null;
  const total = conceptSet?.concepts?.length ?? 0;
  if (total > 0 && count >= total) {
    return `${total} Images Added`;
  }
  return "Images Added";
}

/** True when a saved TOF copy pack exists for the mass desire. */
export function conceptSetHasCopy(
  conceptSet: DesireConceptSet | undefined
): boolean {
  return Boolean(conceptSet?.concepts?.length);
}

/** True when at least one ad in the copy pack is marked as a winner. */
export function copySetHasWinners(copySet: AdCopySet | undefined): boolean {
  if (!copySet?.ad_variations?.length) return false;
  return copySet.ad_variations.some((ad) => Boolean(ad.is_winner));
}

/** Count ads with an uploaded image URL. */
export function copySetUploadedImageCount(
  copySet: AdCopySet | undefined
): number {
  if (!copySet?.ad_variations?.length) return 0;
  return copySet.ad_variations.filter((ad) => Boolean(ad.image_url?.trim()))
    .length;
}

/** Badge label for Strategy cards when images have been uploaded. */
export function copySetImageBadgeLabel(
  copySet: AdCopySet | undefined
): string | null {
  const count = copySetUploadedImageCount(copySet);
  if (count === 0) return null;
  if (count >= 5) return "5 Images Added";
  return "Images Added";
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

export function creativeSetForAngleDirect(
  angleId: string,
  creativePromptSets: CreativePromptSet[]
): CreativePromptSet | undefined {
  return creativePromptSets.find((set) => set.marketing_angle_id === angleId);
}

/* ------------------------------------------------------------------ */
/* Creatives First Cut filters                                         */
/* ------------------------------------------------------------------ */

export type FirstCutFilterId =
  | "all"
  | "shortlisted"
  | "rejected"
  | "maybe"
  | "needs_copy"
  | "has_copy"
  | "needs_creative"
  | "has_creative";

export const FIRST_CUT_FILTERS: readonly {
  id: FirstCutFilterId;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "shortlisted", label: "Shortlisted" },
  { id: "rejected", label: "Rejected" },
  { id: "maybe", label: "Maybe" },
  { id: "needs_copy", label: "Needs quick copy" },
  { id: "has_copy", label: "Has quick copy" },
  { id: "needs_creative", label: "Needs creative prompts" },
  { id: "has_creative", label: "Has creative prompts" },
] as const;

export function firstCutMatchesFilter(
  filter: FirstCutFilterId,
  angle: MarketingAngle,
  hasCopy: boolean,
  hasCreative: boolean
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "shortlisted":
      return angle.is_shortlisted || angle.review_status === "shortlisted";
    case "rejected":
      return angle.review_status === "rejected";
    case "maybe":
      // "Maybe" is represented by the untested-but-noted middle ground.
      return angle.review_status === "untested" && !angle.is_shortlisted;
    case "needs_copy":
      return !hasCopy;
    case "has_copy":
      return hasCopy;
    case "needs_creative":
      return hasCopy && !hasCreative;
    case "has_creative":
      return hasCreative;
    default:
      return true;
  }
}

/* ------------------------------------------------------------------ */
/* Competitor URL → clean label                                        */
/* ------------------------------------------------------------------ */

const DOMAIN_LABELS: Record<string, string> = {
  "amazon.com": "Amazon",
  "amazon.co.uk": "Amazon UK",
  "aliexpress.com": "AliExpress",
  "alibaba.com": "Alibaba",
  "tiktok.com": "TikTok Shop",
  "shop.tiktok.com": "TikTok Shop",
  "etsy.com": "Etsy",
  "ebay.com": "eBay",
  "walmart.com": "Walmart",
  "shopify.com": "Shopify",
  "temu.com": "Temu",
  "youtube.com": "YouTube",
  "instagram.com": "Instagram",
};

export interface CompetitorLink {
  href: string;
  label: string;
}

function titleCaseFromSlug(slug: string): string {
  const cleaned = slug
    .replace(/\.(html?|php|aspx)$/i, "")
    .replace(/[-_+]+/g, " ")
    .replace(/%[0-9a-f]{2}/gi, " ")
    .trim();
  if (!cleaned) return "";
  // Drop obvious id-only segments (all digits or very short).
  if (/^\d+$/.test(cleaned)) return "";
  return cleaned
    .split(/\s+/)
    .filter((word) => word.length > 1 && !/^\d+$/.test(word))
    .slice(0, 7)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Build a clean "Domain - Product title" label for a competitor URL so the UI
 * never shows a long raw URL. Falls back to the domain only when no sensible
 * title can be inferred. Always returns a clickable href (the full URL).
 */
export function formatCompetitorLink(rawUrl: string): CompetitorLink | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return { href: trimmed, label: trimmed };
  }

  const host = url.hostname.replace(/^www\./, "");
  const fallbackDomain =
    host
      .split(".")
      .slice(0, -1)
      .join(".")
      .replace(/^./, (c) => c.toUpperCase()) || host;
  const domainLabel = DOMAIN_LABELS[host] ?? fallbackDomain;

  const segments = url.pathname.split("/").filter(Boolean);
  let title = "";
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const candidate = titleCaseFromSlug(decodeURIComponent(segments[i]));
    if (candidate.length >= 3) {
      title = candidate;
      break;
    }
  }

  return {
    href: url.toString(),
    label: title ? `${domainLabel} - ${title}` : domainLabel,
  };
}

/** Split a multi-URL string (newline or comma separated) into clean links. */
export function parseCompetitorLinks(raw: string): CompetitorLink[] {
  if (!raw.trim()) return [];
  return raw
    .split(/[\n,]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(formatCompetitorLink)
    .filter((link): link is CompetitorLink => link !== null);
}
