import dotenv from "dotenv";
// Load .env.local first (where OPENAI_API_KEY and Supabase vars live), then .env.
dotenv.config({ path: ".env.local" });
dotenv.config();

import express from "express";
import cors from "cors";
import { getSupabase } from "./supabase";
import {
  runResearchForProject,
  ResearchParseError,
  OPENAI_MODEL,
} from "./openai";
import type {
  ProductProject,
  ResearchRun,
  ResearchSource,
  ResearchSourceDraft,
} from "../src/types";

const PORT = 3001;

const app = express();
app.use(cors());
app.use(express.json());

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    model: OPENAI_MODEL,
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    supabaseConfigured: Boolean(
      process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY
    ),
  });
});

app.post("/api/research/run", async (req, res) => {
  const projectId = (req.body as { projectId?: unknown })?.projectId;

  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    return res.status(400).json({ error: "Missing or invalid 'projectId'." });
  }

  // Fail fast on missing config with clear messages.
  if (!process.env.OPENAI_API_KEY) {
    return res
      .status(500)
      .json({ error: "OPENAI_API_KEY is not set on the backend (.env.local)." });
  }

  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (error: unknown) {
    return res.status(500).json({ error: errorMessage(error) });
  }

  // 1. Load the selected project.
  const { data: projectData, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (projectError || !projectData) {
    return res.status(404).json({
      error: `Project not found: ${projectError?.message ?? projectId}`,
    });
  }

  const project = projectData as ProductProject;

  // 2. Create a research_runs row (status: running, stage: research).
  const { data: runData, error: runError } = await supabase
    .from("research_runs")
    .insert({ project_id: project.id, stage: "research", status: "running" })
    .select()
    .single();

  if (runError || !runData) {
    return res.status(500).json({
      error: `Failed to create research run: ${runError?.message ?? "unknown error"}`,
    });
  }

  const run = runData as ResearchRun;

  const markRunFailed = async (message: string) => {
    try {
      await supabase
        .from("research_runs")
        .update({ status: "failed", error: message })
        .eq("id", run.id);
    } catch {
      // Don't mask the original error if the status update itself fails.
    }
  };

  // 3-7. Call OpenAI with web_search and gather sources.
  let drafts: ResearchSourceDraft[];
  try {
    drafts = await runResearchForProject(project);
  } catch (error: unknown) {
    const message = errorMessage(error);
    await markRunFailed(message);

    if (error instanceof ResearchParseError) {
      return res.status(502).json({
        error: message,
        raw: error.rawText,
        runId: run.id,
      });
    }
    return res.status(502).json({ error: message, runId: run.id });
  }

  // 8. Save each source into research_sources.
  const rows = drafts.map((draft) => ({
    run_id: run.id,
    project_id: project.id,
    url: draft.url,
    platform: draft.platform,
    title: draft.title,
    summary: draft.summary,
    emotional_theme: draft.emotional_theme,
    relevance_score: draft.relevance_score,
    useful_phrases: draft.useful_phrases,
  }));

  const { data: insertedData, error: insertError } = await supabase
    .from("research_sources")
    .insert(rows)
    .select();

  if (insertError) {
    await markRunFailed(insertError.message);
    return res.status(500).json({
      error: `Failed to save research sources: ${insertError.message}`,
      runId: run.id,
    });
  }

  const sources = (insertedData ?? []) as ResearchSource[];

  // 9. Mark the run completed.
  const { data: completedData } = await supabase
    .from("research_runs")
    .update({ status: "completed" })
    .eq("id", run.id)
    .select()
    .single();

  const completedRun = (completedData as ResearchRun) ?? {
    ...run,
    status: "completed",
  };

  // 10. Return the saved sources (and run) to the frontend.
  return res.json({ run: completedRun, sources });
});

app.listen(PORT, () => {
  console.log(`[api] Branded eCommerce backend running on http://localhost:${PORT}`);
});
