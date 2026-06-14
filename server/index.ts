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
  OpenAIUpstreamError,
  OPENAI_MODEL,
} from "./openai";
import { generateInsightReport } from "./insights";
import {
  generateCustomerAvatar,
  avatarToContentText,
} from "./avatar";
import {
  generateMassDesires,
  EXPECTED_DESIRE_COUNT,
} from "./desires";
import {
  generateMarketingAngles,
  EXPECTED_ANGLES_PER_DESIRE,
} from "./angles";
import { generateAdCopy, regenerateAd, regenerateImagePrompt } from "./copy";
import {
  CopyGenerateError,
  sendCopyGenerateError,
} from "./copy-errors";
import {
  buildNamedAdImageStoragePath,
  getAdImagePublicUrl,
  renameAdImageObject,
} from "./ad-image-storage";
import { generateCreativePrompts } from "./creative-prompts";
import { generateTofConcepts } from "./tof-concepts";
import { withAiUsage, withAiUsageSafe } from "./ai-usage";
import {
  getAllProjectAiCostTotals,
  getProjectAiUsageSummary,
} from "./ai-usage-summary";
import { normalizeProject } from "../src/types";
import type {
  AdCopySet,
  AdVariation,
  CreativePromptSet,
  CustomerAvatarOutput,
  DesireConcept,
  DesireConceptSet,
  MassDesire,
  MassDesireWithAngles,
  MarketingAngle,
  ProductProject,
  ResearchInsight,
  ResearchRun,
  ResearchSource,
} from "../src/types";

const PORT = 3001;

const app = express();
app.use(cors());
app.use(express.json());
app.use(
  (
    err: Error & { status?: number; body?: unknown },
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
      return res.status(400).json({ error: "Invalid JSON request body." });
    }
    next(err);
  }
);

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

app.get("/api/ai-usage/summary", async (req, res) => {
  const projectId = req.query.projectId;

  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    return res.status(400).json({ error: "Missing or invalid 'projectId'." });
  }

  try {
    const summary = await getProjectAiUsageSummary(projectId.trim());
    return res.json(summary);
  } catch (error: unknown) {
    return res.status(500).json({ error: errorMessage(error) });
  }
});

app.get("/api/ai-usage/project-totals", async (_req, res) => {
  try {
    const projects = await getAllProjectAiCostTotals();
    return res.json({ projects });
  } catch (error: unknown) {
    return res.status(500).json({ error: errorMessage(error) });
  }
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

  const project = normalizeProject(projectData as ProductProject);

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
  let drafts;
  let researchAiUsage;
  try {
    ({ drafts, aiUsage: researchAiUsage } = await runResearchForProject(
      project,
      run.id
    ));
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
  return res.json(
    withAiUsage({ run: completedRun, sources }, researchAiUsage)
  );
});

app.post("/api/insights/generate", async (req, res) => {
  const projectId = (req.body as { projectId?: unknown })?.projectId;

  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    return res.status(400).json({ error: "Missing or invalid 'projectId'." });
  }

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

  // 2. Load the selected project.
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

  const project = normalizeProject(projectData as ProductProject);

  // 3. Load the latest completed research run for the "research" stage.
  const { data: runData, error: runError } = await supabase
    .from("research_runs")
    .select("*")
    .eq("project_id", project.id)
    .eq("stage", "research")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (runError) {
    return res.status(500).json({
      error: `Failed to load research run: ${runError.message}`,
    });
  }

  if (!runData) {
    return res.status(400).json({
      error: "No completed research found. Please run research first.",
    });
  }

  const run = runData as ResearchRun;

  // 4. Load the sources attached to that run.
  const { data: sourcesData, error: sourcesError } = await supabase
    .from("research_sources")
    .select("*")
    .eq("run_id", run.id)
    .order("relevance_score", { ascending: false });

  if (sourcesError) {
    return res.status(500).json({
      error: `Failed to load research sources: ${sourcesError.message}`,
    });
  }

  const sources = (sourcesData ?? []) as ResearchSource[];

  // 5. No sources -> tell the user to run research first.
  if (sources.length === 0) {
    return res.status(400).json({
      error: "No research sources found. Please run research first.",
    });
  }

  // 6-7. Analyse the sources with OpenAI.
  let report;
  let insightAiUsage;
  try {
    ({ report, aiUsage: insightAiUsage } = await generateInsightReport(
      project,
      sources,
      run.id
    ));
  } catch (error: unknown) {
    const message = errorMessage(error);
    if (error instanceof ResearchParseError) {
      return res.status(502).json({ error: message, raw: error.rawText });
    }
    return res.status(502).json({ error: message });
  }

  // 8. Save the insight report.
  const { data: insertedData, error: insertError } = await supabase
    .from("research_insights")
    .insert({
      project_id: project.id,
      run_id: run.id,
      pain_clusters: report.pain_clusters,
      language_patterns: report.language_patterns,
      emotional_states: report.emotional_states,
      failed_solutions: report.failed_solutions,
      hopes: report.hopes,
      fears: report.fears,
      copywriting_notes: report.copywriting_notes,
      compliance_warnings: report.compliance_warnings,
    })
    .select()
    .single();

  if (insertError || !insertedData) {
    return res.status(500).json({
      error: `Failed to save insight report: ${insertError?.message ?? "unknown error"}`,
    });
  }

  const insight = insertedData as ResearchInsight;

  // 9. Return the saved insight report.
  return res.json(withAiUsage({ insight }, insightAiUsage));
});

app.post("/api/avatar/generate", async (req, res) => {
  const projectId = (req.body as { projectId?: unknown })?.projectId;

  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    return res.status(400).json({ error: "Missing or invalid 'projectId'." });
  }

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

  const project = normalizeProject(projectData as ProductProject);

  const { data: insightData, error: insightError } = await supabase
    .from("research_insights")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (insightError) {
    return res.status(500).json({
      error: `Failed to load insight report: ${insightError.message}`,
    });
  }

  if (!insightData) {
    return res.status(400).json({
      error:
        "No insight report found. Please run Generate Insight Report first.",
    });
  }

  const insight = insightData as ResearchInsight;

  let sources: ResearchSource[] = [];
  if (insight.run_id) {
    const { data: sourcesData, error: sourcesError } = await supabase
      .from("research_sources")
      .select("*")
      .eq("run_id", insight.run_id)
      .order("relevance_score", { ascending: false });

    if (sourcesError) {
      return res.status(500).json({
        error: `Failed to load research sources: ${sourcesError.message}`,
      });
    }

    sources = (sourcesData ?? []) as ResearchSource[];
  }

  let avatarContent;
  let avatarAiUsage;
  try {
    ({ avatar: avatarContent, aiUsage: avatarAiUsage } =
      await generateCustomerAvatar(project, insight, sources));
  } catch (error: unknown) {
    const message = errorMessage(error);
    if (error instanceof ResearchParseError) {
      return res.status(502).json({ error: message, raw: error.rawText });
    }
    return res.status(502).json({ error: message });
  }

  const { data: insertedData, error: insertError } = await supabase
    .from("generated_outputs")
    .insert({
      project_id: project.id,
      run_id: insight.run_id ?? null,
      output_type: "customer_avatar",
      parent_type: "research_insight",
      parent_id: insight.id,
      content_json: avatarContent,
      content_text: avatarToContentText(avatarContent),
    })
    .select()
    .single();

  if (insertError || !insertedData) {
    return res.status(500).json({
      error: `Failed to save customer avatar: ${insertError?.message ?? "unknown error"}`,
    });
  }

  const avatar = insertedData as CustomerAvatarOutput;

  return res.json(withAiUsage({ avatar }, avatarAiUsage));
});

app.post("/api/desires/generate", async (req, res) => {
  const projectId = (req.body as { projectId?: unknown })?.projectId;

  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    return res.status(400).json({ error: "Missing or invalid 'projectId'." });
  }

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

  const project = normalizeProject(projectData as ProductProject);

  const { data: insightData, error: insightError } = await supabase
    .from("research_insights")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (insightError) {
    return res.status(500).json({
      error: `Failed to load insight report: ${insightError.message}`,
    });
  }

  if (!insightData) {
    return res.status(400).json({
      error:
        "No insight report found. Please run Generate Insight Report first.",
    });
  }

  const insight = insightData as ResearchInsight;

  const { data: avatarData, error: avatarError } = await supabase
    .from("generated_outputs")
    .select("*")
    .eq("project_id", project.id)
    .eq("output_type", "customer_avatar")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (avatarError) {
    return res.status(500).json({
      error: `Failed to load customer avatar: ${avatarError.message}`,
    });
  }

  if (!avatarData) {
    return res.status(400).json({
      error:
        "No customer avatar found. Please run Generate Customer Avatar first.",
    });
  }

  const avatarOutput = avatarData as CustomerAvatarOutput;

  let desiresContent;
  try {
    desiresContent = await generateMassDesires(
      project,
      insight,
      avatarOutput.content_json
    );
  } catch (error: unknown) {
    const message = errorMessage(error);
    if (error instanceof ResearchParseError) {
      return res.status(502).json({ error: message, raw: error.rawText });
    }
    return res.status(502).json({ error: message });
  }

  if (desiresContent.mass_desires.length !== EXPECTED_DESIRE_COUNT) {
    return res.status(502).json({
      error: `Expected exactly ${EXPECTED_DESIRE_COUNT} mass desires, got ${desiresContent.mass_desires.length}.`,
    });
  }

  const { error: deleteAnglesError } = await supabase
    .from("marketing_angles")
    .delete()
    .eq("project_id", project.id);

  if (deleteAnglesError) {
    return res.status(500).json({
      error: `Failed to clear old marketing angles: ${deleteAnglesError.message}`,
    });
  }

  const { error: deleteDesiresError } = await supabase
    .from("mass_desires")
    .delete()
    .eq("project_id", project.id);

  if (deleteDesiresError) {
    return res.status(500).json({
      error: `Failed to clear old mass desires: ${deleteDesiresError.message}`,
    });
  }

  const desireRows = desiresContent.mass_desires.map((draft, index) => ({
    project_id: project.id,
    run_id: insight.run_id ?? null,
    sort_order: index,
    desire_statement: draft.desire_statement,
    audience_segment: draft.audience_segment,
    what_they_are_really_buying: draft.what_they_are_really_buying,
    emotional_driver: draft.emotional_driver,
    life_context: draft.life_context,
    pain_it_moves_away_from: draft.pain_it_moves_away_from,
    positive_outcome_it_moves_toward: draft.positive_outcome_it_moves_toward,
    why_this_desire_is_distinct: draft.why_this_desire_is_distinct,
    copy_direction: draft.copy_direction,
    messaging_to_avoid: draft.messaging_to_avoid,
    compliance_notes: draft.compliance_notes,
  }));

  const { data: insertedDesires, error: insertDesiresError } = await supabase
    .from("mass_desires")
    .insert(desireRows)
    .select()
    .order("sort_order", { ascending: true });

  if (insertDesiresError || !insertedDesires) {
    return res.status(500).json({
      error: `Failed to save mass desires: ${insertDesiresError?.message ?? "unknown error"}`,
    });
  }

  return res.json({ desires: insertedDesires as MassDesire[] });
});

app.post("/api/angles/generate", async (req, res) => {
  const projectId = (req.body as { projectId?: unknown })?.projectId;

  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    return res.status(400).json({ error: "Missing or invalid 'projectId'." });
  }

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

  const project = normalizeProject(projectData as ProductProject);

  const { data: insightData, error: insightError } = await supabase
    .from("research_insights")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (insightError) {
    return res.status(500).json({
      error: `Failed to load insight report: ${insightError.message}`,
    });
  }

  if (!insightData) {
    return res.status(400).json({
      error:
        "No insight report found. Please run Generate Insight Report first.",
    });
  }

  const insight = insightData as ResearchInsight;

  const { data: avatarData, error: avatarError } = await supabase
    .from("generated_outputs")
    .select("*")
    .eq("project_id", project.id)
    .eq("output_type", "customer_avatar")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (avatarError) {
    return res.status(500).json({
      error: `Failed to load customer avatar: ${avatarError.message}`,
    });
  }

  if (!avatarData) {
    return res.status(400).json({
      error:
        "No customer avatar found. Please run Generate Customer Avatar first.",
    });
  }

  const avatarOutput = avatarData as CustomerAvatarOutput;

  const { data: massDesiresData, error: massDesiresError } = await supabase
    .from("mass_desires")
    .select("*")
    .eq("project_id", project.id)
    .order("sort_order", { ascending: true });

  if (massDesiresError) {
    return res.status(500).json({
      error: `Failed to load mass desires: ${massDesiresError.message}`,
    });
  }

  const massDesires = (massDesiresData ?? []) as MassDesire[];

  if (massDesires.length === 0) {
    return res.status(400).json({
      error: "No mass desires found. Please run Generate Mass Desires first.",
    });
  }

  let anglesContent;
  let anglesAiUsage;
  try {
    ({ content: anglesContent, aiUsage: anglesAiUsage } =
      await generateMarketingAngles(
      project,
      insight,
      avatarOutput.content_json,
      massDesires
    ));
  } catch (error: unknown) {
    const message = errorMessage(error);
    if (error instanceof ResearchParseError) {
      return res.status(502).json({ error: message, raw: error.rawText });
    }
    return res.status(502).json({ error: message });
  }

  const expectedTotal =
    massDesires.length * EXPECTED_ANGLES_PER_DESIRE;
  const actualTotal = anglesContent.angle_groups.reduce(
    (sum, group) => sum + group.angles.length,
    0
  );

  if (actualTotal !== expectedTotal) {
    return res.status(502).json({
      error: `Expected ${expectedTotal} marketing angles (${massDesires.length} desires × ${EXPECTED_ANGLES_PER_DESIRE}), got ${actualTotal}.`,
    });
  }

  const { error: deleteAnglesError } = await supabase
    .from("marketing_angles")
    .delete()
    .eq("project_id", project.id);

  if (deleteAnglesError) {
    return res.status(500).json({
      error: `Failed to clear old marketing angles: ${deleteAnglesError.message}`,
    });
  }

  const angleRows: Record<string, unknown>[] = [];
  for (const group of anglesContent.angle_groups) {
    group.angles.forEach((angle, index) => {
      angleRows.push({
        project_id: project.id,
        mass_desire_id: group.mass_desire_id,
        sort_order: index,
        angle_name: angle.angle_name,
        target_audience: angle.target_audience,
        story_arc: angle.story_arc,
        beginning_situation: angle.beginning_situation,
        crisis_or_realization_moment: angle.crisis_or_realization_moment,
        discovery_moment: angle.discovery_moment,
        resolution: angle.resolution,
        unique_problem_mechanism: angle.unique_problem_mechanism,
        unique_solution_mechanism: angle.unique_solution_mechanism,
        key_emotional_moment: angle.key_emotional_moment,
        real_language_patterns: angle.real_language_patterns,
        copy_direction: angle.copy_direction,
        creative_direction: angle.creative_direction,
        compliance_notes: angle.compliance_notes,
      });
    });
  }

  const { data: insertedAngles, error: insertAnglesError } = await supabase
    .from("marketing_angles")
    .insert(angleRows)
    .select();

  if (insertAnglesError || !insertedAngles) {
    return res.status(500).json({
      error: `Failed to save marketing angles: ${insertAnglesError?.message ?? "unknown error"}`,
    });
  }

  const savedAngles = insertedAngles as MarketingAngle[];

  const grouped: MassDesireWithAngles[] = massDesires.map((desire) => ({
    desire,
    angles: savedAngles
      .filter((angle) => angle.mass_desire_id === desire.id)
      .sort((a, b) => a.sort_order - b.sort_order),
  }));

  return res.json(withAiUsage({ desires: grouped }, anglesAiUsage));
});

const VALID_REVIEW_STATUSES = new Set([
  "untested",
  "shortlisted",
  "rejected",
  "published",
  "needs_copy",
  "ready_for_creative",
  "ready_to_publish",
]);

app.patch("/api/angles/:angleId/review", async (req, res) => {
  const angleId = req.params.angleId;

  if (typeof angleId !== "string" || angleId.trim().length === 0) {
    return res.status(400).json({ error: "Missing or invalid angle id." });
  }

  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (error: unknown) {
    return res.status(500).json({ error: errorMessage(error) });
  }

  const body = req.body as {
    review_status?: unknown;
    is_shortlisted?: unknown;
    priority_score?: unknown;
    reviewer_notes?: unknown;
  };

  const updates: Record<string, unknown> = {};

  if (body.review_status !== undefined) {
    if (
      typeof body.review_status !== "string" ||
      !VALID_REVIEW_STATUSES.has(body.review_status)
    ) {
      return res.status(400).json({
        error:
          "Invalid 'review_status'. Must be one of: untested, shortlisted, rejected, published, needs_copy, ready_for_creative, ready_to_publish.",
      });
    }
    updates.review_status = body.review_status;
  }

  if (body.is_shortlisted !== undefined) {
    if (typeof body.is_shortlisted !== "boolean") {
      return res.status(400).json({
        error: "Invalid 'is_shortlisted'. Must be a boolean.",
      });
    }
    updates.is_shortlisted = body.is_shortlisted;
  }

  if (body.priority_score !== undefined) {
    if (
      typeof body.priority_score !== "number" ||
      !Number.isInteger(body.priority_score) ||
      body.priority_score < 0 ||
      body.priority_score > 5
    ) {
      return res.status(400).json({
        error: "Invalid 'priority_score'. Must be an integer from 0 to 5.",
      });
    }
    updates.priority_score = body.priority_score;
  }

  if (body.reviewer_notes !== undefined) {
    if (typeof body.reviewer_notes !== "string") {
      return res.status(400).json({
        error: "Invalid 'reviewer_notes'. Must be a string.",
      });
    }
    updates.reviewer_notes = body.reviewer_notes;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      error:
        "No valid fields to update. Provide review_status, is_shortlisted, priority_score, and/or reviewer_notes.",
    });
  }

  const { data, error } = await supabase
    .from("marketing_angles")
    .update(updates)
    .eq("id", angleId)
    .select()
    .single();

  if (error || !data) {
    return res.status(500).json({
      error: `Failed to update angle review: ${error?.message ?? "unknown error"}`,
    });
  }

  const angle = data as MarketingAngle;
  return res.json({
    angle: {
      ...angle,
      review_status: angle.review_status ?? "untested",
      is_shortlisted: angle.is_shortlisted ?? false,
      priority_score: angle.priority_score ?? 0,
      reviewer_notes: angle.reviewer_notes ?? "",
    },
  });
});

app.post("/api/copy/generate", async (req, res) => {
  const routeStartedAt = Date.now();
  const body = req.body as {
    projectId?: unknown;
    marketingAngleId?: unknown;
  };
  const projectId = body.projectId;
  const marketingAngleId = body.marketingAngleId;

  console.log("[COPY] route request received", {
    project_id: projectId,
    marketing_angle_id: marketingAngleId,
    operation: "generate-copy",
  });

  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    return res.status(400).json({ error: "Missing or invalid 'projectId'." });
  }

  if (
    typeof marketingAngleId !== "string" ||
    marketingAngleId.trim().length === 0
  ) {
    return res
      .status(400)
      .json({ error: "Missing or invalid 'marketingAngleId'." });
  }

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

  const project = normalizeProject(projectData as ProductProject);

  const { data: angleData, error: angleError } = await supabase
    .from("marketing_angles")
    .select("*")
    .eq("id", marketingAngleId)
    .single();

  if (angleError || !angleData) {
    return res.status(404).json({
      error: `Marketing angle not found: ${angleError?.message ?? marketingAngleId}`,
    });
  }

  const angle = angleData as MarketingAngle;

  if (angle.project_id !== project.id) {
    return res.status(400).json({
      error: "Marketing angle does not belong to this project.",
    });
  }

  const { data: desireData, error: desireError } = await supabase
    .from("mass_desires")
    .select("*")
    .eq("id", angle.mass_desire_id)
    .single();

  if (desireError || !desireData) {
    return res.status(404).json({
      error: `Related mass desire not found: ${desireError?.message ?? angle.mass_desire_id}`,
    });
  }

  const massDesire = desireData as MassDesire;

  const { data: insightData, error: insightError } = await supabase
    .from("research_insights")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (insightError) {
    return res.status(500).json({
      error: `Failed to load insight report: ${insightError.message}`,
    });
  }

  if (!insightData) {
    return res.status(400).json({
      error:
        "No insight report found. Please run Generate Insight Report first.",
    });
  }

  const insight = insightData as ResearchInsight;

  const { data: avatarData, error: avatarError } = await supabase
    .from("generated_outputs")
    .select("*")
    .eq("project_id", project.id)
    .eq("output_type", "customer_avatar")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (avatarError) {
    return res.status(500).json({
      error: `Failed to load customer avatar: ${avatarError.message}`,
    });
  }

  if (!avatarData) {
    return res.status(400).json({
      error:
        "No customer avatar found. Please run Generate Customer Avatar first.",
    });
  }

  const avatarOutput = avatarData as CustomerAvatarOutput;

  let copyContent;
  let copyAiUsage;
  try {
    ({ content: copyContent, aiUsage: copyAiUsage } = await generateAdCopy(
      project,
      insight,
      avatarOutput.content_json,
      massDesire,
      angle
    ));
  } catch (error: unknown) {
    console.error("[COPY] generation failed before save", {
      project_id: project.id,
      marketing_angle_id: angle.id,
      mass_desire_id: massDesire.id,
      duration_ms: Date.now() - routeStartedAt,
      error: errorMessage(error),
    });
    return sendCopyGenerateError(res, error);
  }

  console.log("[COPY] saving copy set starting", {
    project_id: project.id,
    marketing_angle_id: angle.id,
    mass_desire_id: massDesire.id,
    duration_ms: Date.now() - routeStartedAt,
  });

  const { error: deleteCopyError } = await supabase
    .from("ad_copy_sets")
    .delete()
    .eq("marketing_angle_id", marketingAngleId);

  if (deleteCopyError) {
    console.error("[COPY] failed to clear old copy set", deleteCopyError.message);
    return sendCopyGenerateError(
      res,
      new CopyGenerateError({
        stage: "save",
        details: `Failed to clear old ad copy: ${deleteCopyError.message}`,
        httpStatus: 500,
        aiUsageSummaries: copyAiUsage,
      })
    );
  }

  const { data: insertedData, error: insertError } = await supabase
    .from("ad_copy_sets")
    .insert({
      project_id: project.id,
      mass_desire_id: massDesire.id,
      marketing_angle_id: angle.id,
      run_id: insight.run_id ?? null,
      long_form_story: copyContent.long_form_story,
      short_primary_texts: copyContent.short_primary_texts,
      medium_primary_texts: copyContent.medium_primary_texts,
      headlines: copyContent.headlines,
      descriptions: copyContent.descriptions,
      hooks: copyContent.hooks,
      hook_transitions: copyContent.hook_transitions,
      callouts: copyContent.callouts,
      compliance_notes: copyContent.compliance_notes,
      ad_variations: copyContent.ad_variations ?? [],
      image_prompts: copyContent.image_prompts ?? [],
    })
    .select()
    .single();

  if (insertError || !insertedData) {
    const details = `Failed to save ad copy set: ${insertError?.message ?? "unknown error"}`;
    console.error("[COPY] saving copy set failed", {
      project_id: project.id,
      marketing_angle_id: angle.id,
      details,
    });
    return sendCopyGenerateError(
      res,
      new CopyGenerateError({
        stage: "save",
        details,
        httpStatus: 500,
        aiUsageSummaries: copyAiUsage,
      })
    );
  }

  console.log("[COPY] saving copy set success", {
    project_id: project.id,
    marketing_angle_id: angle.id,
    copy_set_id: insertedData.id,
    duration_ms: Date.now() - routeStartedAt,
  });

  try {
    const payload = withAiUsageSafe(
      { copySet: insertedData as AdCopySet },
      copyAiUsage
    );
    console.log("[COPY] response returned to frontend", {
      project_id: project.id,
      marketing_angle_id: angle.id,
      duration_ms: Date.now() - routeStartedAt,
      has_ai_usage: Boolean(payload.ai_usage),
    });
    return res.json(payload);
  } catch (error: unknown) {
    console.error("[COPY] response serialization failed", errorMessage(error));
    return sendCopyGenerateError(
      res,
      new CopyGenerateError({
        stage: "response",
        details: "Copy pack saved but the response could not be sent.",
        httpStatus: 500,
        aiUsageSummaries: copyAiUsage,
      })
    );
  }
});

const AD_VARIATION_FIELDS = [
  "primary",
  "headline",
  "description",
  "visual_strategy",
  "image_prompt",
] as const;

app.patch("/api/copy/:copySetId", async (req, res) => {
  const copySetId = req.params.copySetId;

  if (typeof copySetId !== "string" || copySetId.trim().length === 0) {
    return res.status(400).json({ error: "Missing or invalid copy set id." });
  }

  const body = req.body as { ad_variations?: unknown };
  const rawVariations = body.ad_variations;

  if (!Array.isArray(rawVariations)) {
    return res
      .status(400)
      .json({ error: "'ad_variations' must be an array." });
  }

  if (rawVariations.length !== 5) {
    return res.status(400).json({
      error: `'ad_variations' must contain exactly 5 items (got ${rawVariations.length}).`,
    });
  }

  const adVariations: AdVariation[] = [];
  for (let i = 0; i < rawVariations.length; i += 1) {
    const item = rawVariations[i];
    if (!item || typeof item !== "object") {
      return res
        .status(400)
        .json({ error: `Ad ${i + 1} must be an object.` });
    }
    const record = item as Record<string, unknown>;
    const cleaned = {} as AdVariation;
    for (const field of AD_VARIATION_FIELDS) {
      const value = record[field];
      if (typeof value !== "string") {
        return res.status(400).json({
          error: `Ad ${i + 1} is missing a valid '${field}'.`,
        });
      }
      cleaned[field] = value;
    }
    // Preserve per-ad metadata (lock / revision tracking) when present.
    if (typeof record.locked === "boolean") cleaned.locked = record.locked;
    if (typeof record.last_regenerated_at === "string") {
      cleaned.last_regenerated_at = record.last_regenerated_at;
    }
    if (typeof record.revision_count === "number") {
      cleaned.revision_count = record.revision_count;
    }
    if (typeof record.is_winner === "boolean") {
      cleaned.is_winner = record.is_winner;
    }
    for (const field of [
      "image_url",
      "image_path",
      "image_filename",
      "image_uploaded_at",
      "image_file_type",
    ] as const) {
      if (typeof record[field] === "string") {
        cleaned[field] = record[field];
      }
    }
    adVariations.push(cleaned);
  }

  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (error: unknown) {
    return res.status(500).json({ error: errorMessage(error) });
  }

  const { data: existing, error: existingError } = await supabase
    .from("ad_copy_sets")
    .select("id")
    .eq("id", copySetId)
    .maybeSingle();

  if (existingError) {
    return res.status(500).json({
      error: `Failed to load ad copy set: ${existingError.message}`,
    });
  }

  if (!existing) {
    return res
      .status(404)
      .json({ error: `Ad copy set not found: ${copySetId}` });
  }

  const { data: updated, error: updateError } = await supabase
    .from("ad_copy_sets")
    .update(buildCopySetUpdate(adVariations))
    .eq("id", copySetId)
    .select()
    .single();

  if (updateError || !updated) {
    return res.status(500).json({
      error: `Failed to update ad copy set: ${updateError?.message ?? "unknown error"}`,
    });
  }

  return res.json({ copySet: updated as AdCopySet });
});

app.post("/api/copy/:copySetId/fix-image-filename", async (req, res) => {
  const copySetId = req.params.copySetId;

  if (typeof copySetId !== "string" || copySetId.trim().length === 0) {
    return res.status(400).json({ error: "Missing or invalid copy set id." });
  }

  const body = req.body as {
    adIndex?: unknown;
    safeFilename?: unknown;
  };
  const adIndex = body.adIndex;
  const safeFilename = body.safeFilename;

  if (typeof adIndex !== "number" || !Number.isInteger(adIndex) || adIndex < 0 || adIndex > 4) {
    return res.status(400).json({
      error: "'adIndex' must be an integer from 0 to 4.",
    });
  }

  if (typeof safeFilename !== "string" || safeFilename.trim().length === 0) {
    return res.status(400).json({
      error: "Missing or invalid 'safeFilename'.",
    });
  }

  const cleanFilename = safeFilename.trim().replace(/^.*[/\\]/, "");
  if (!/^[a-z0-9][a-z0-9.-]*\.(png|jpe?g|webp)$/i.test(cleanFilename)) {
    return res.status(400).json({
      error: "Invalid safeFilename format.",
    });
  }

  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (error: unknown) {
    return res.status(500).json({ error: errorMessage(error) });
  }

  const { data: copySetRow, error: loadError } = await supabase
    .from("ad_copy_sets")
    .select("*")
    .eq("id", copySetId)
    .single();

  if (loadError || !copySetRow) {
    return res.status(404).json({
      error: `Ad copy set not found: ${loadError?.message ?? copySetId}`,
    });
  }

  const copySet = copySetRow as AdCopySet;
  const adVariations = readStoredAdVariations(copySet);
  const ad = adVariations[adIndex];

  if (!ad?.image_path?.trim() || !ad.image_url?.trim()) {
    return res.status(400).json({
      error: "This ad does not have an uploaded image to rename.",
    });
  }

  const oldPath = ad.image_path.trim();
  let newPath = buildNamedAdImageStoragePath(copySet.project_id, cleanFilename);

  if (oldPath === newPath) {
    const basename = newPath.split("/").pop() ?? cleanFilename;
    adVariations[adIndex] = {
      ...ad,
      image_filename: basename,
    };
    const { data: updatedSame, error: updateSameError } = await supabase
      .from("ad_copy_sets")
      .update(buildCopySetUpdate(adVariations))
      .eq("id", copySetId)
      .select()
      .single();

    if (updateSameError || !updatedSame) {
      return res.status(500).json({
        error: `Failed to update ad copy set: ${updateSameError?.message ?? "unknown error"}`,
      });
    }

    return res.json({ copySet: updatedSame as AdCopySet });
  }

  try {
    await renameAdImageObject(oldPath, newPath);
  } catch (firstError: unknown) {
    const message = errorMessage(firstError);
    if (/already exists|duplicate|exists/i.test(message)) {
      newPath = buildNamedAdImageStoragePath(
        copySet.project_id,
        cleanFilename,
        true
      );
      try {
        await renameAdImageObject(oldPath, newPath);
      } catch (retryError: unknown) {
        return res.status(502).json({
          error:
            "Could not update filename. The image is still available.",
          detail: errorMessage(retryError),
        });
      }
    } else {
      return res.status(502).json({
        error: "Could not update filename. The image is still available.",
        detail: message,
      });
    }
  }

  const newBasename = newPath.split("/").pop() ?? cleanFilename;
  adVariations[adIndex] = {
    ...ad,
    image_path: newPath,
    image_url: getAdImagePublicUrl(newPath),
    image_filename: newBasename,
  };

  const { data: updated, error: updateError } = await supabase
    .from("ad_copy_sets")
    .update(buildCopySetUpdate(adVariations))
    .eq("id", copySetId)
    .select()
    .single();

  if (updateError || !updated) {
    return res.status(500).json({
      error: `Renamed file but failed to save metadata: ${updateError?.message ?? "unknown error"}`,
    });
  }

  return res.json({ copySet: updated as AdCopySet });
});

/** Build the ad_copy_sets update payload, refreshing compatibility fields. */
function buildCopySetUpdate(adVariations: AdVariation[]) {
  return {
    ad_variations: adVariations,
    image_prompts: adVariations.map((ad) => ad.image_prompt),
    short_primary_texts: adVariations.map((ad, i) => ({
      label: `Ad ${i + 1}`,
      text: ad.primary,
      strategy: "",
    })),
    headlines: adVariations.map((ad) => ({ text: ad.headline, angle: "" })),
    descriptions: adVariations.map((ad) => ({
      text: ad.description,
      angle: "",
    })),
    is_edited: true,
    updated_at: new Date().toISOString(),
  };
}

/** Read up to 5 ad variations from a copy set row, padding/reconstructing. */
function readStoredAdVariations(copySet: AdCopySet): AdVariation[] {
  const raw = Array.isArray(copySet.ad_variations) ? copySet.ad_variations : [];
  let ads: AdVariation[] = raw.map((ad) => {
    const r = (ad ?? {}) as Record<string, unknown>;
    return {
      primary: typeof r.primary === "string" ? r.primary : "",
      headline: typeof r.headline === "string" ? r.headline : "",
      description: typeof r.description === "string" ? r.description : "",
      visual_strategy:
        typeof r.visual_strategy === "string" ? r.visual_strategy : "",
      image_prompt: typeof r.image_prompt === "string" ? r.image_prompt : "",
      locked: typeof r.locked === "boolean" ? r.locked : false,
      last_regenerated_at:
        typeof r.last_regenerated_at === "string"
          ? r.last_regenerated_at
          : undefined,
      revision_count:
        typeof r.revision_count === "number" ? r.revision_count : 0,
      is_winner: typeof r.is_winner === "boolean" ? r.is_winner : false,
      ...(typeof r.image_url === "string" && r.image_url.trim()
        ? { image_url: r.image_url }
        : {}),
      ...(typeof r.image_path === "string" && r.image_path.trim()
        ? { image_path: r.image_path }
        : {}),
      ...(typeof r.image_filename === "string" && r.image_filename.trim()
        ? { image_filename: r.image_filename }
        : {}),
      ...(typeof r.image_uploaded_at === "string" && r.image_uploaded_at.trim()
        ? { image_uploaded_at: r.image_uploaded_at }
        : {}),
      ...(typeof r.image_file_type === "string" && r.image_file_type.trim()
        ? { image_file_type: r.image_file_type }
        : {}),
    };
  });

  // Reconstruct from legacy fields if ad_variations is empty (old copy packs).
  if (ads.length === 0) {
    const primaries = copySet.short_primary_texts ?? [];
    const headlines = copySet.headlines ?? [];
    const descriptions = copySet.descriptions ?? [];
    const prompts = copySet.image_prompts ?? [];
    const count = Math.max(
      primaries.length,
      headlines.length,
      descriptions.length,
      prompts.length
    );
    ads = Array.from({ length: count }, (_, i) => ({
      primary: primaries[i]?.text ?? "",
      headline: headlines[i]?.text ?? "",
      description: descriptions[i]?.text ?? "",
      visual_strategy: "",
      image_prompt: prompts[i] ?? "",
      locked: false,
      revision_count: 0,
      is_winner: false,
    }));
  }

  return ads.slice(0, 5);
}

app.post("/api/copy/:copySetId/regenerate", async (req, res) => {
  const copySetId = req.params.copySetId;
  const body = req.body as { ad_index?: unknown; mode?: unknown };

  if (typeof copySetId !== "string" || copySetId.trim().length === 0) {
    return res.status(400).json({ error: "Missing or invalid copy set id." });
  }

  const adIndex = body.ad_index;
  if (
    typeof adIndex !== "number" ||
    !Number.isInteger(adIndex) ||
    adIndex < 0 ||
    adIndex > 4
  ) {
    return res
      .status(400)
      .json({ error: "'ad_index' must be an integer from 0 to 4." });
  }

  const mode = body.mode;
  if (mode !== "full_ad" && mode !== "image_prompt_only") {
    return res.status(400).json({
      error: "'mode' must be 'full_ad' or 'image_prompt_only'.",
    });
  }

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

  const { data: copyData, error: copyError } = await supabase
    .from("ad_copy_sets")
    .select("*")
    .eq("id", copySetId)
    .maybeSingle();

  if (copyError) {
    return res
      .status(500)
      .json({ error: `Failed to load ad copy set: ${copyError.message}` });
  }
  if (!copyData) {
    return res
      .status(404)
      .json({ error: `Ad copy set not found: ${copySetId}` });
  }

  const copySet = copyData as AdCopySet;
  const ads = readStoredAdVariations(copySet);

  if (adIndex >= ads.length) {
    return res
      .status(400)
      .json({ error: `This copy pack has no ad at index ${adIndex}.` });
  }

  if (ads[adIndex].locked) {
    return res.status(409).json({
      error: "This ad is locked. Unlock it before regenerating.",
    });
  }

  const { data: projectData, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", copySet.project_id)
    .single();

  if (projectError || !projectData) {
    return res.status(404).json({
      error: `Project not found: ${projectError?.message ?? copySet.project_id}`,
    });
  }

  const project = normalizeProject(projectData as ProductProject);

  const { data: angleData, error: angleError } = await supabase
    .from("marketing_angles")
    .select("*")
    .eq("id", copySet.marketing_angle_id)
    .single();

  if (angleError || !angleData) {
    return res.status(404).json({
      error: `Marketing angle not found: ${angleError?.message ?? copySet.marketing_angle_id}`,
    });
  }

  const angle = angleData as MarketingAngle;

  const { data: desireData, error: desireError } = await supabase
    .from("mass_desires")
    .select("*")
    .eq("id", copySet.mass_desire_id)
    .single();

  if (desireError || !desireData) {
    return res.status(404).json({
      error: `Related mass desire not found: ${desireError?.message ?? copySet.mass_desire_id}`,
    });
  }

  const massDesire = desireData as MassDesire;

  const { data: insightData, error: insightError } = await supabase
    .from("research_insights")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (insightError) {
    return res.status(500).json({
      error: `Failed to load insight report: ${insightError.message}`,
    });
  }
  if (!insightData) {
    return res.status(400).json({
      error: "No insight report found for this project.",
    });
  }
  const insight = insightData as ResearchInsight;

  const { data: avatarData, error: avatarError } = await supabase
    .from("generated_outputs")
    .select("*")
    .eq("project_id", project.id)
    .eq("output_type", "customer_avatar")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (avatarError) {
    return res.status(500).json({
      error: `Failed to load customer avatar: ${avatarError.message}`,
    });
  }
  if (!avatarData) {
    return res.status(400).json({
      error: "No customer avatar found for this project.",
    });
  }
  const avatarOutput = avatarData as CustomerAvatarOutput;

  const existing = ads[adIndex];
  let nextAd: AdVariation;
  let regenerateAiUsage;
  try {
    if (mode === "full_ad") {
      const { ad: regenerated, aiUsage } = await regenerateAd(
        project,
        insight,
        avatarOutput.content_json,
        massDesire,
        angle,
        ads,
        adIndex,
        copySetId
      );
      regenerateAiUsage = aiUsage;
      nextAd = {
        ...regenerated,
        locked: existing.locked ?? false,
        is_winner: existing.is_winner ?? false,
        ...(existing.image_url ? { image_url: existing.image_url } : {}),
        ...(existing.image_path ? { image_path: existing.image_path } : {}),
        ...(existing.image_filename
          ? { image_filename: existing.image_filename }
          : {}),
        ...(existing.image_uploaded_at
          ? { image_uploaded_at: existing.image_uploaded_at }
          : {}),
        ...(existing.image_file_type
          ? { image_file_type: existing.image_file_type }
          : {}),
        revision_count: (existing.revision_count ?? 0) + 1,
        last_regenerated_at: new Date().toISOString(),
      };
    } else {
      const { visual: regenerated, aiUsage } = await regenerateImagePrompt(
        project,
        insight,
        avatarOutput.content_json,
        massDesire,
        angle,
        existing,
        copySetId,
        adIndex
      );
      regenerateAiUsage = aiUsage;
      nextAd = {
        ...existing,
        visual_strategy: regenerated.visual_strategy,
        image_prompt: regenerated.image_prompt,
        revision_count: (existing.revision_count ?? 0) + 1,
        last_regenerated_at: new Date().toISOString(),
      };
    }
  } catch (error: unknown) {
    const message = errorMessage(error);
    if (error instanceof ResearchParseError) {
      return res.status(502).json({ error: message, raw: error.rawText });
    }
    return res.status(502).json({ error: message });
  }

  const nextAds = ads.map((ad, i) => (i === adIndex ? nextAd : ad));

  const { data: updated, error: updateError } = await supabase
    .from("ad_copy_sets")
    .update(buildCopySetUpdate(nextAds))
    .eq("id", copySetId)
    .select()
    .single();

  if (updateError || !updated) {
    return res.status(500).json({
      error: `Failed to save regenerated ad: ${updateError?.message ?? "unknown error"}`,
    });
  }

  return res.json(
    withAiUsage({ copySet: updated as AdCopySet }, regenerateAiUsage)
  );
});

app.post("/api/creative-prompts/generate", async (req, res) => {
  const body = req.body as {
    projectId?: unknown;
    marketingAngleId?: unknown;
    adCopySetId?: unknown;
  };
  const projectId = body.projectId;
  const marketingAngleId = body.marketingAngleId;
  const adCopySetId = body.adCopySetId;

  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    return res.status(400).json({ error: "Missing or invalid 'projectId'." });
  }

  if (
    typeof marketingAngleId !== "string" ||
    marketingAngleId.trim().length === 0
  ) {
    return res
      .status(400)
      .json({ error: "Missing or invalid 'marketingAngleId'." });
  }

  if (typeof adCopySetId !== "string" || adCopySetId.trim().length === 0) {
    return res.status(400).json({ error: "Missing or invalid 'adCopySetId'." });
  }

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

  const project = normalizeProject(projectData as ProductProject);

  const { data: angleData, error: angleError } = await supabase
    .from("marketing_angles")
    .select("*")
    .eq("id", marketingAngleId)
    .single();

  if (angleError || !angleData) {
    return res.status(404).json({
      error: `Marketing angle not found: ${angleError?.message ?? marketingAngleId}`,
    });
  }

  const angle = angleData as MarketingAngle;

  if (angle.project_id !== project.id) {
    return res.status(400).json({
      error: "Marketing angle does not belong to this project.",
    });
  }

  const { data: desireData, error: desireError } = await supabase
    .from("mass_desires")
    .select("*")
    .eq("id", angle.mass_desire_id)
    .single();

  if (desireError || !desireData) {
    return res.status(404).json({
      error: `Related mass desire not found: ${desireError?.message ?? angle.mass_desire_id}`,
    });
  }

  const massDesire = desireData as MassDesire;

  const { data: copySetData, error: copySetError } = await supabase
    .from("ad_copy_sets")
    .select("*")
    .eq("id", adCopySetId)
    .single();

  if (copySetError || !copySetData) {
    return res.status(404).json({
      error: `Ad copy set not found: ${copySetError?.message ?? adCopySetId}. Generate Quick Copy first.`,
    });
  }

  const copySet = copySetData as AdCopySet;

  if (copySet.project_id !== project.id) {
    return res.status(400).json({
      error: "Ad copy set does not belong to this project.",
    });
  }

  if (copySet.marketing_angle_id !== angle.id) {
    return res.status(400).json({
      error: "Ad copy set does not belong to this marketing angle.",
    });
  }

  const { data: insightData, error: insightError } = await supabase
    .from("research_insights")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (insightError) {
    return res.status(500).json({
      error: `Failed to load insight report: ${insightError.message}`,
    });
  }

  if (!insightData) {
    return res.status(400).json({
      error:
        "No insight report found. Please run Generate Insight Report first.",
    });
  }

  const insight = insightData as ResearchInsight;

  const { data: avatarData, error: avatarError } = await supabase
    .from("generated_outputs")
    .select("*")
    .eq("project_id", project.id)
    .eq("output_type", "customer_avatar")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (avatarError) {
    return res.status(500).json({
      error: `Failed to load customer avatar: ${avatarError.message}`,
    });
  }

  if (!avatarData) {
    return res.status(400).json({
      error:
        "No customer avatar found. Please run Generate Customer Avatar first.",
    });
  }

  const avatarOutput = avatarData as CustomerAvatarOutput;

  let promptContent;
  try {
    promptContent = await generateCreativePrompts(
      project,
      insight,
      avatarOutput.content_json,
      massDesire,
      angle,
      copySet
    );
  } catch (error: unknown) {
    const message = errorMessage(error);
    if (error instanceof ResearchParseError) {
      return res.status(502).json({ error: message, raw: error.rawText });
    }
    return res.status(502).json({ error: message });
  }

  const { error: deletePromptError } = await supabase
    .from("creative_prompt_sets")
    .delete()
    .eq("ad_copy_set_id", adCopySetId);

  if (deletePromptError) {
    return res.status(500).json({
      error: `Failed to clear old creative prompts: ${deletePromptError.message}`,
    });
  }

  const { data: insertedData, error: insertError } = await supabase
    .from("creative_prompt_sets")
    .insert({
      project_id: project.id,
      mass_desire_id: massDesire.id,
      marketing_angle_id: angle.id,
      ad_copy_set_id: copySet.id,
      creative_concepts: promptContent.creative_concepts,
      image_prompts: promptContent.image_prompts,
      ugc_scripts: promptContent.ugc_scripts,
      overlay_texts: promptContent.overlay_texts,
      negative_prompts: promptContent.negative_prompts,
      compliance_notes: promptContent.compliance_notes,
    })
    .select()
    .single();

  if (insertError || !insertedData) {
    return res.status(500).json({
      error: `Failed to save creative prompt set: ${insertError?.message ?? "unknown error"}`,
    });
  }

  return res.json({ promptSet: insertedData as CreativePromptSet });
});

/* ==================================================================== */
/* Top-of-funnel desire concepts (mass desire level)                    */
/* ==================================================================== */

const DESIRE_CONCEPTS_SQL_HINT =
  "desire_concept_sets table not found. Run supabase/desire_concept_sets.sql in Supabase SQL editor, then notify pgrst, 'reload schema';";

function isMissingTableError(message: string, code?: string): boolean {
  const msg = message.toLowerCase();
  return (
    code === "42P01" ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    msg.includes("schema cache")
  );
}

async function loadDesireConceptSet(
  supabase: ReturnType<typeof getSupabase>,
  projectId: string,
  massDesireId: string
): Promise<DesireConceptSet | null> {
  const { data: setRow, error: setError } = await supabase
    .from("desire_concept_sets")
    .select("*")
    .eq("project_id", projectId)
    .eq("mass_desire_id", massDesireId)
    .maybeSingle();

  if (setError) {
    if (isMissingTableError(setError.message, setError.code)) {
      throw new Error(DESIRE_CONCEPTS_SQL_HINT);
    }
    throw new Error(`Failed to load TOF concept set: ${setError.message}`);
  }

  if (!setRow) return null;

  const { data: conceptRows, error: conceptsError } = await supabase
    .from("desire_concepts")
    .select("*")
    .eq("concept_set_id", setRow.id)
    .order("concept_number", { ascending: true });

  if (conceptsError) {
    if (isMissingTableError(conceptsError.message, conceptsError.code)) {
      throw new Error(DESIRE_CONCEPTS_SQL_HINT);
    }
    throw new Error(`Failed to load TOF concepts: ${conceptsError.message}`);
  }

  return {
    ...(setRow as Omit<DesireConceptSet, "concepts">),
    concepts: (conceptRows ?? []) as DesireConcept[],
  };
}

async function handleGenerateTofConcepts(
  req: express.Request,
  res: express.Response
): Promise<void> {
  try {
    const body = req.body as {
      projectId?: unknown;
      massDesireId?: unknown;
      massDesireIndex?: unknown;
    };
    const projectId = body.projectId;
    const massDesireId = body.massDesireId;

    if (typeof projectId !== "string" || projectId.trim().length === 0) {
      res.status(400).json({ error: "Missing or invalid 'projectId'." });
      return;
    }

    if (typeof massDesireId !== "string" || massDesireId.trim().length === 0) {
      res.status(400).json({ error: "Missing or invalid 'massDesireId'." });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      res.status(500).json({
        error: "OPENAI_API_KEY is not set on the backend (.env.local).",
      });
      return;
    }

    let supabase: ReturnType<typeof getSupabase>;
    try {
      supabase = getSupabase();
    } catch (error: unknown) {
      res.status(500).json({ error: errorMessage(error) });
      return;
    }

    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !projectData) {
      res.status(404).json({
        error: `Project not found: ${projectError?.message ?? projectId}`,
      });
      return;
    }

    const project = normalizeProject(projectData as ProductProject);

    const { data: desireData, error: desireError } = await supabase
      .from("mass_desires")
      .select("*")
      .eq("id", massDesireId)
      .single();

    if (desireError || !desireData) {
      res.status(404).json({
        error: `Mass desire not found: ${desireError?.message ?? massDesireId}`,
      });
      return;
    }

    const massDesire = desireData as MassDesire;

    if (massDesire.project_id !== project.id) {
      res.status(400).json({
        error: "Mass desire does not belong to this project.",
      });
      return;
    }

    const { data: insightData, error: insightError } = await supabase
      .from("research_insights")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (insightError) {
      res.status(500).json({
        error: `Failed to load insight report: ${insightError.message}`,
      });
      return;
    }

    if (!insightData) {
      res.status(400).json({
        error:
          "No insight report found. Please run Generate Insight Report first.",
      });
      return;
    }

    const insight = insightData as ResearchInsight;

    const { data: avatarData, error: avatarError } = await supabase
      .from("generated_outputs")
      .select("*")
      .eq("project_id", project.id)
      .eq("output_type", "customer_avatar")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (avatarError) {
      res.status(500).json({
        error: `Failed to load customer avatar: ${avatarError.message}`,
      });
      return;
    }

    if (!avatarData) {
      res.status(400).json({
        error:
          "No customer avatar found. Please run Generate Customer Avatar first.",
      });
      return;
    }

    const avatarOutput = avatarData as CustomerAvatarOutput;

    let generated;
    try {
      generated = await generateTofConcepts(
        project,
        insight,
        avatarOutput.content_json,
        massDesire
      );
    } catch (error: unknown) {
      if (error instanceof OpenAIUpstreamError) {
        res.status(502).json({
          error: error.message,
          status: error.status ?? 520,
          details: error.details,
        });
        return;
      }
      const message = errorMessage(error);
      if (error instanceof ResearchParseError) {
        res.status(502).json({ error: message, raw: error.rawText });
        return;
      }
      res.status(502).json({ error: message });
      return;
    }

    const now = new Date().toISOString();

    const { error: deleteSetError } = await supabase
      .from("desire_concept_sets")
      .delete()
      .eq("mass_desire_id", massDesireId);

    if (deleteSetError && !isMissingTableError(deleteSetError.message, deleteSetError.code)) {
      res.status(500).json({
        error: `Failed to clear old TOF concepts: ${deleteSetError.message}`,
      });
      return;
    }

    const { data: insertedSet, error: insertSetError } = await supabase
      .from("desire_concept_sets")
      .insert({
        project_id: project.id,
        mass_desire_id: massDesire.id,
        source_desire_title: massDesire.desire_statement,
        source_desire_summary: generated.sourceSummary,
        status: "generated",
        updated_at: now,
      })
      .select()
      .single();

    if (insertSetError || !insertedSet) {
      const msg = insertSetError?.message ?? "unknown error";
      if (isMissingTableError(msg, insertSetError?.code)) {
        res.status(500).json({ error: DESIRE_CONCEPTS_SQL_HINT });
        return;
      }
      res.status(500).json({
        error: `Failed to save TOF concept set: ${msg}`,
      });
      return;
    }

    const conceptRows = generated.concepts.map((concept, index) => ({
      concept_set_id: insertedSet.id,
      project_id: project.id,
      mass_desire_id: massDesire.id,
      concept_number: index + 1,
      concept_title: concept.concept_title,
      headline: concept.headline,
      support_line: concept.support_line,
      overlay_recommendation: concept.overlay_recommendation,
      visual_strategy: concept.visual_strategy,
      rationale: concept.rationale,
      image_prompt: concept.image_prompt,
      updated_at: now,
    }));

    const { data: insertedConcepts, error: insertConceptsError } = await supabase
      .from("desire_concepts")
      .insert(conceptRows)
      .select();

    if (insertConceptsError || !insertedConcepts) {
      const msg = insertConceptsError?.message ?? "unknown error";
      if (isMissingTableError(msg, insertConceptsError?.code)) {
        res.status(500).json({ error: DESIRE_CONCEPTS_SQL_HINT });
        return;
      }
      res.status(500).json({
        error: `Failed to save TOF concepts: ${msg}`,
      });
      return;
    }

    const conceptSet: DesireConceptSet = {
      ...(insertedSet as Omit<DesireConceptSet, "concepts">),
      concepts: (insertedConcepts as DesireConcept[]).sort(
        (a, b) => a.concept_number - b.concept_number
      ),
    };

    res.json(withAiUsage({ conceptSet }, generated.aiUsage));
  } catch (error: unknown) {
    console.error("[api] TOF concept generation failed:", error);
    res.status(500).json({
      error: errorMessage(error) || "Unexpected server error during TOF generation.",
    });
  }
}

async function handleGetDesireConcepts(
  req: express.Request,
  res: express.Response
): Promise<void> {
  try {
    const projectId = req.query.projectId;
    const massDesireId = req.query.massDesireId;

    if (typeof projectId !== "string" || projectId.trim().length === 0) {
      res.status(400).json({ error: "Missing or invalid 'projectId' query param." });
      return;
    }

    if (typeof massDesireId !== "string" || massDesireId.trim().length === 0) {
      res.status(400).json({ error: "Missing or invalid 'massDesireId' query param." });
      return;
    }

    let supabase: ReturnType<typeof getSupabase>;
    try {
      supabase = getSupabase();
    } catch (error: unknown) {
      res.status(500).json({ error: errorMessage(error) });
      return;
    }

    const conceptSet = await loadDesireConceptSet(
      supabase,
      projectId,
      massDesireId
    );

    if (!conceptSet) {
      res.status(404).json({ error: "No saved TOF concepts for this mass desire." });
      return;
    }

    res.json({ conceptSet });
  } catch (error: unknown) {
    console.error("[api] Load TOF concepts failed:", error);
    res.status(500).json({ error: errorMessage(error) });
  }
}

app.post("/api/tof-concepts/generate", handleGenerateTofConcepts);
app.post("/api/desire-concepts/generate", handleGenerateTofConcepts);
app.get("/api/tof-concepts", handleGetDesireConcepts);
app.get("/api/desire-concepts", handleGetDesireConcepts);

/* ==================================================================== */
/* Ad candidates (selected, publishable ad units)                       */
/* ==================================================================== */

const VALID_AD_CANDIDATE_STATUSES = new Set(["draft", "ready", "needs_revision"]);

/** Pull only the allowed, validated candidate fields out of a request body. */
function extractAdCandidateFields(
  body: Record<string, unknown>
): { fields: Record<string, unknown>; error?: string } {
  const fields: Record<string, unknown> = {};

  const stringFields = [
    "ad_title",
    "selected_primary_text",
    "selected_headline",
    "selected_description",
    "selected_hook",
    "notes",
  ] as const;

  for (const key of stringFields) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== "string") {
        return { fields, error: `Invalid '${key}'. Must be a string.` };
      }
      fields[key] = body[key];
    }
  }

  if (body.selected_callouts !== undefined) {
    if (
      !Array.isArray(body.selected_callouts) ||
      body.selected_callouts.some((c) => typeof c !== "string")
    ) {
      return {
        fields,
        error: "Invalid 'selected_callouts'. Must be an array of strings.",
      };
    }
    fields.selected_callouts = body.selected_callouts;
  }

  if (body.selected_image_prompts !== undefined) {
    if (!Array.isArray(body.selected_image_prompts)) {
      return {
        fields,
        error: "Invalid 'selected_image_prompts'. Must be an array.",
      };
    }
    fields.selected_image_prompts = body.selected_image_prompts;
  }

  if (body.status !== undefined) {
    if (
      typeof body.status !== "string" ||
      !VALID_AD_CANDIDATE_STATUSES.has(body.status)
    ) {
      return {
        fields,
        error: "Invalid 'status'. Must be draft, ready, or needs_revision.",
      };
    }
    fields.status = body.status;
  }

  return { fields };
}

// Create or update the single active ad candidate for a marketing angle.
app.post("/api/ad-candidates/upsert", async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const projectId = body.projectId;
  const marketingAngleId = body.marketingAngleId;

  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    return res.status(400).json({ error: "Missing or invalid 'projectId'." });
  }
  if (
    typeof marketingAngleId !== "string" ||
    marketingAngleId.trim().length === 0
  ) {
    return res
      .status(400)
      .json({ error: "Missing or invalid 'marketingAngleId'." });
  }

  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (error: unknown) {
    return res.status(500).json({ error: errorMessage(error) });
  }

  const { fields, error: fieldError } = extractAdCandidateFields(body);
  if (fieldError) {
    return res.status(400).json({ error: fieldError });
  }

  // Load the angle to derive the mass desire and confirm ownership.
  const { data: angleData, error: angleError } = await supabase
    .from("marketing_angles")
    .select("*")
    .eq("id", marketingAngleId)
    .single();

  if (angleError || !angleData) {
    return res.status(404).json({
      error: `Marketing angle not found: ${angleError?.message ?? marketingAngleId}`,
    });
  }

  const angle = angleData as MarketingAngle;
  if (angle.project_id !== projectId) {
    return res
      .status(400)
      .json({ error: "Marketing angle does not belong to this project." });
  }

  // Link the latest copy set + creative prompt set for this angle if present.
  const { data: copySetRow } = await supabase
    .from("ad_copy_sets")
    .select("id")
    .eq("marketing_angle_id", marketingAngleId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const adCopySetId = (copySetRow as { id: string } | null)?.id ?? null;

  const { data: promptSetRow } = await supabase
    .from("creative_prompt_sets")
    .select("id")
    .eq("marketing_angle_id", marketingAngleId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const creativePromptSetId = (promptSetRow as { id: string } | null)?.id ?? null;

  // Find an existing active candidate for this angle.
  const { data: existingRow, error: existingError } = await supabase
    .from("ad_candidates")
    .select("*")
    .eq("project_id", projectId)
    .eq("marketing_angle_id", marketingAngleId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return res.status(500).json({
      error: `Failed to load ad candidate: ${existingError.message}`,
    });
  }

  if (existingRow) {
    const updates: Record<string, unknown> = {
      ...fields,
      ad_copy_set_id: adCopySetId,
      creative_prompt_set_id: creativePromptSetId,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("ad_candidates")
      .update(updates)
      .eq("id", (existingRow as { id: string }).id)
      .select()
      .single();

    if (error || !data) {
      return res.status(500).json({
        error: `Failed to update ad candidate: ${error?.message ?? "unknown error"}`,
      });
    }
    return res.json({ candidate: data });
  }

  // No candidate yet → assign the next ad number for this project.
  const { data: maxRow } = await supabase
    .from("ad_candidates")
    .select("ad_number")
    .eq("project_id", projectId)
    .order("ad_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextNumber =
    ((maxRow as { ad_number: number | null } | null)?.ad_number ?? 0) + 1;

  const insertPayload: Record<string, unknown> = {
    project_id: projectId,
    mass_desire_id: angle.mass_desire_id,
    marketing_angle_id: marketingAngleId,
    ad_copy_set_id: adCopySetId,
    creative_prompt_set_id: creativePromptSetId,
    ad_number: nextNumber,
    ad_title:
      typeof fields.ad_title === "string" && fields.ad_title.trim()
        ? fields.ad_title
        : angle.angle_name,
    selected_primary_text: fields.selected_primary_text ?? "",
    selected_headline: fields.selected_headline ?? "",
    selected_description: fields.selected_description ?? "",
    selected_hook: fields.selected_hook ?? "",
    selected_callouts: fields.selected_callouts ?? [],
    selected_image_prompts: fields.selected_image_prompts ?? [],
    status: fields.status ?? "draft",
    notes: fields.notes ?? "",
  };

  const { data, error } = await supabase
    .from("ad_candidates")
    .insert(insertPayload)
    .select()
    .single();

  if (error || !data) {
    return res.status(500).json({
      error: `Failed to create ad candidate: ${error?.message ?? "unknown error"}`,
    });
  }

  return res.json({ candidate: data });
});

// List ad candidates for a project.
app.get("/api/ad-candidates", async (req, res) => {
  const projectId = req.query.projectId;

  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    return res
      .status(400)
      .json({ error: "Missing or invalid 'projectId' query param." });
  }

  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (error: unknown) {
    return res.status(500).json({ error: errorMessage(error) });
  }

  const { data, error } = await supabase
    .from("ad_candidates")
    .select("*")
    .eq("project_id", projectId)
    .order("ad_number", { ascending: true });

  if (error) {
    return res.status(500).json({
      error: `Failed to load ad candidates: ${error.message}`,
    });
  }

  return res.json({ candidates: data ?? [] });
});

// Update fields on a specific ad candidate (status, notes, selections).
app.patch("/api/ad-candidates/:id", async (req, res) => {
  const id = req.params.id;

  if (typeof id !== "string" || id.trim().length === 0) {
    return res.status(400).json({ error: "Missing or invalid candidate id." });
  }

  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (error: unknown) {
    return res.status(500).json({ error: errorMessage(error) });
  }

  const { fields, error: fieldError } = extractAdCandidateFields(
    (req.body ?? {}) as Record<string, unknown>
  );
  if (fieldError) {
    return res.status(400).json({ error: fieldError });
  }

  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: "No valid fields to update." });
  }

  const { data, error } = await supabase
    .from("ad_candidates")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return res.status(500).json({
      error: `Failed to update ad candidate: ${error?.message ?? "unknown error"}`,
    });
  }

  return res.json({ candidate: data });
});

/* ==================================================================== */
/* Delete a project and all related data                                */
/* ==================================================================== */

/**
 * Delete every row for a project from one child table. Treats a missing table
 * (e.g. compliance_checks / export_packs that were never created) as a no-op,
 * but surfaces real permission/database errors.
 */
async function deleteProjectRows(
  supabase: ReturnType<typeof getSupabase>,
  table: string,
  projectId: string
): Promise<void> {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq("project_id", projectId);

  if (!error) return;

  const code = (error as { code?: string }).code;
  const message = (error.message ?? "").toLowerCase();
  const tableMissing =
    code === "42P01" ||
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    message.includes("schema cache");

  if (tableMissing) return; // optional table not present — safe to skip
  throw new Error(`Failed to delete from ${table}: ${error.message}`);
}

app.delete("/api/projects/:projectId", async (req, res) => {
  const projectId = req.params.projectId;

  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    return res.status(400).json({ error: "Missing or invalid 'projectId'." });
  }

  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (error: unknown) {
    return res.status(500).json({ error: errorMessage(error) });
  }

  // Confirm the project exists before doing any destructive work.
  const { data: existing, error: lookupError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();

  if (lookupError) {
    return res
      .status(500)
      .json({ error: `Failed to look up project: ${lookupError.message}` });
  }

  if (!existing) {
    return res.status(404).json({ error: `Project not found: ${projectId}` });
  }

  // Delete dependent rows in safe dependency order, then the project itself.
  // This works whether or not ON DELETE CASCADE is configured.
  const childTables = [
    "compliance_checks",
    "export_packs",
    "ad_candidates",
    "desire_concepts",
    "desire_concept_sets",
    "creative_prompt_sets",
    "ad_copy_sets",
    "marketing_angles",
    "mass_desires",
    "generated_outputs",
    "research_insights",
    "research_sources",
    "research_runs",
  ];

  try {
    for (const table of childTables) {
      await deleteProjectRows(supabase, table, projectId);
    }

    const { error: deleteError } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (deleteError) {
      throw new Error(`Failed to delete project: ${deleteError.message}`);
    }
  } catch (error: unknown) {
    return res.status(500).json({ error: errorMessage(error) });
  }

  return res.json({ ok: true, deletedProjectId: projectId });
});

app.listen(PORT, () => {
  console.log(`[api] Branded eCommerce backend running on http://localhost:${PORT}`);
});
