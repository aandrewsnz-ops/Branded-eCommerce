import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResearchSource, ResearchSourceDraft } from "../src/types";

export const RESEARCH_BATCH_SIZE = 5;

export function normalizeResearchUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    parsed.hash = "";
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith("www.")) {
      host = host.slice(4);
    }
    const path = parsed.pathname.replace(/\/$/, "") || "";
    return `${parsed.protocol}//${host}${path}${parsed.search}`.toLowerCase();
  } catch {
    return trimmed.toLowerCase().replace(/\/$/, "");
  }
}

export function normalizeResearchTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildThemeCoverageSummary(sources: ResearchSource[]): string {
  const themes = new Set<string>();
  for (const source of sources) {
    const theme = source.emotional_theme?.trim();
    if (theme) themes.add(theme);
  }

  if (themes.size === 0) {
    return "No themes recorded yet.";
  }

  return [...themes]
    .slice(0, 20)
    .map((theme) => `- ${theme}`)
    .join("\n");
}

export function formatExistingSourcesForPrompt(
  sources: ResearchSource[]
): string {
  if (sources.length === 0) return "";

  return sources
    .map((source, index) => {
      const phrases = (source.useful_phrases ?? []).slice(0, 5);
      return [
        `${index + 1}. url: ${source.url}`,
        `   platform: ${source.platform}`,
        `   title: ${source.title}`,
        `   emotional_theme: ${source.emotional_theme}`,
        phrases.length
          ? `   useful phrases: ${phrases.join("; ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

export interface DedupeResult {
  accepted: ResearchSourceDraft[];
  skippedUrls: number;
  skippedTitles: number;
}

export function dedupeResearchDrafts(
  drafts: ResearchSourceDraft[],
  existing: ResearchSource[]
): DedupeResult {
  const seenUrls = new Set(
    existing.map((source) => normalizeResearchUrl(source.url)).filter(Boolean)
  );
  const seenTitles = new Set(
    existing
      .map((source) => normalizeResearchTitle(source.title))
      .filter(Boolean)
  );

  const accepted: ResearchSourceDraft[] = [];
  let skippedUrls = 0;
  let skippedTitles = 0;

  for (const draft of drafts) {
    const normalizedUrl = normalizeResearchUrl(draft.url);
    if (!normalizedUrl) continue;

    if (seenUrls.has(normalizedUrl)) {
      skippedUrls += 1;
      continue;
    }

    const normalizedTitle = normalizeResearchTitle(draft.title);
    if (normalizedTitle && seenTitles.has(normalizedTitle)) {
      skippedTitles += 1;
      continue;
    }

    seenUrls.add(normalizedUrl);
    if (normalizedTitle) seenTitles.add(normalizedTitle);
    accepted.push(draft);
  }

  return { accepted, skippedUrls, skippedTitles };
}

export async function loadProjectResearchSources(
  supabase: SupabaseClient,
  projectId: string
): Promise<ResearchSource[]> {
  const { data, error } = await supabase
    .from("research_sources")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ResearchSource[];
}
