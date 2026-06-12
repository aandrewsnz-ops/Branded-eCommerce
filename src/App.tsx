import { useEffect, useState } from "react";
import {
  Search,
  FileText,
  UserRound,
  HeartPulse,
  Compass,
  PenLine,
  Sparkles,
  ShieldCheck,
  Package,
  Plus,
  Boxes,
  Globe,
  Tag,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  fetchLatestInsight,
  fetchLatestResearchSources,
  fetchProjects,
  insertProject,
  isSupabaseConfigured,
} from "./lib/supabase";
import type {
  GenerateInsightResponse,
  ProductProject,
  ProductProjectInput,
  ResearchInsight,
  ResearchSource,
  RunResearchResponse,
  WorkflowStage,
} from "./types";

const API_BASE = "http://localhost:3001";

const WORKFLOW_STAGES: readonly WorkflowStage[] = [
  { id: "research", label: "Run Research" },
  { id: "insight_report", label: "Generate Insight Report" },
  { id: "customer_avatar", label: "Generate Customer Avatar" },
  { id: "mass_desires", label: "Generate Mass Desires" },
  { id: "marketing_angles", label: "Generate Marketing Angles" },
  { id: "ad_copy", label: "Generate Ad Copy" },
  { id: "creative_prompts", label: "Generate Creative Prompts" },
  { id: "compliance_check", label: "Run Compliance Check" },
  { id: "export_ad_pack", label: "Export Ad Pack" },
] as const;

const STAGE_ICONS: Record<WorkflowStage["id"], typeof Search> = {
  research: Search,
  insight_report: FileText,
  customer_avatar: UserRound,
  mass_desires: HeartPulse,
  marketing_angles: Compass,
  ad_copy: PenLine,
  creative_prompts: Sparkles,
  compliance_check: ShieldCheck,
  export_ad_pack: Package,
};

const EMPTY_FORM: ProductProjectInput = {
  product_name: "",
  product_description: "",
  competitor_url: "",
  target_country: "",
  target_customer: "",
  main_problem: "",
  product_price: "",
  offer: "",
  claims_allowed: "",
  claims_banned: "",
  brand_tone: "",
  output_goal: "",
};

const SAMPLE_PROJECTS: ProductProject[] = [
  {
    id: "sample-1",
    product_name: "PostureFix Pro",
    product_description:
      "An adjustable posture corrector brace that gently pulls the shoulders back to retrain alignment over time. Breathable, lightweight, and worn under clothing.",
    competitor_url: "https://example.com/posture-corrector",
    target_country: "United States",
    target_customer: "Office workers aged 30-55 with back and neck pain",
    main_problem: "Chronic slouching and back pain from sitting all day",
    product_price: "$39.99",
    offer: "Buy 1 Get 1 50% off + free shipping",
    claims_allowed:
      "Helps support better posture\nMay reduce discomfort from slouching\nComfortable for daily wear",
    claims_banned:
      "Cures back disease\nMedical / clinical treatment claims\nGuaranteed pain elimination",
    brand_tone: "Confident, supportive, science-aware",
    output_goal:
      "Generate 5 Facebook ad angles and matching primary text for a cold audience.",
    created_at: "2026-06-01T09:00:00.000Z",
  },
  {
    id: "sample-2",
    product_name: "AquaGlow LED Mirror",
    product_description:
      "A rechargeable LED vanity mirror with adjustable warm-to-cool lighting and touch dimming. Cordless and portable for makeup and skincare routines.",
    competitor_url: "https://example.com/led-mirror",
    target_country: "United Kingdom",
    target_customer: "Women aged 18-40 into beauty and skincare",
    main_problem: "Poor bathroom lighting makes makeup application uneven",
    product_price: "£29.95",
    offer: "20% off launch discount",
    claims_allowed:
      "Even, flattering light\nAdjustable brightness\nCordless and portable",
    claims_banned: "Improves skin health\nAnti-aging claims",
    brand_tone: "Aesthetic, aspirational, clean",
    output_goal:
      "Produce a short-form video creative prompt and 3 hook variations.",
    created_at: "2026-06-05T14:30:00.000Z",
  },
];

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `project-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function App() {
  // Start empty + loading when Supabase is configured; otherwise fall back to
  // the local sample projects so the shell still works without a backend.
  const [projects, setProjects] = useState<ProductProject[]>(
    isSupabaseConfigured ? [] : SAMPLE_PROJECTS
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    isSupabaseConfigured ? null : SAMPLE_PROJECTS[0]?.id ?? null
  );
  const [form, setForm] = useState<ProductProjectInput>(EMPTY_FORM);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(isSupabaseConfigured);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Research results + status, keyed by project id.
  const [researchByProject, setResearchByProject] = useState<
    Record<string, ResearchSource[]>
  >({});
  const [researchingId, setResearchingId] = useState<string | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [sourcesLoadingId, setSourcesLoadingId] = useState<string | null>(null);

  // Insight reports + status, keyed by project id. `undefined` = not yet loaded.
  const [insightByProject, setInsightByProject] = useState<
    Record<string, ResearchInsight | null>
  >({});
  const [insightLoadingId, setInsightLoadingId] = useState<string | null>(null);
  const [generatingInsightId, setGeneratingInsightId] = useState<string | null>(
    null
  );
  const [insightError, setInsightError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let cancelled = false;

    fetchProjects()
      .then((rows) => {
        if (cancelled) return;
        setProjects(rows);
        setSelectedId(rows[0]?.id ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? `Failed to load projects: ${err.message}`
            : "Failed to load projects."
        );
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedProject =
    projects.find((project) => project.id === selectedId) ?? null;

  // Hydrate saved research sources for the selected project so they survive a
  // page refresh. Cached per project (the key existing means already loaded or
  // freshly generated), so we never refetch and never clobber new results.
  useEffect(() => {
    if (!isSupabaseConfigured || !selectedId) {
      return;
    }
    if (selectedId in researchByProject) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setSourcesLoadingId(selectedId);
      setResearchError(null);
      try {
        const sources = await fetchLatestResearchSources(selectedId);
        if (cancelled) return;
        setResearchByProject((prev) => ({ ...prev, [selectedId]: sources }));
      } catch (err: unknown) {
        if (cancelled) return;
        setResearchError(
          err instanceof Error
            ? `Failed to load research sources: ${err.message}`
            : "Failed to load research sources."
        );
      } finally {
        if (!cancelled) {
          setSourcesLoadingId((current) =>
            current === selectedId ? null : current
          );
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [selectedId, researchByProject]);

  // Load the latest persisted insight report for the selected project so it
  // survives a page refresh. Cached per project so we only fetch once.
  useEffect(() => {
    if (!isSupabaseConfigured || !selectedId) {
      return;
    }
    if (selectedId in insightByProject) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setInsightLoadingId(selectedId);
      setInsightError(null);
      try {
        const insight = await fetchLatestInsight(selectedId);
        if (cancelled) return;
        setInsightByProject((prev) => ({ ...prev, [selectedId]: insight }));
      } catch (err: unknown) {
        if (cancelled) return;
        setInsightError(
          err instanceof Error
            ? `Failed to load insight report: ${err.message}`
            : "Failed to load insight report."
        );
      } finally {
        if (!cancelled) {
          setInsightLoadingId((current) =>
            current === selectedId ? null : current
          );
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [selectedId, insightByProject]);

  function updateField<K extends keyof ProductProjectInput>(
    key: K,
    value: ProductProjectInput[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreateProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);
    setError(null);

    // Local-only mode: keep the original in-memory behaviour.
    if (!isSupabaseConfigured) {
      const localProject: ProductProject = {
        ...form,
        id: createId(),
        created_at: new Date().toISOString(),
      };
      setProjects((prev) => [localProject, ...prev]);
      setSelectedId(localProject.id);
      setForm(EMPTY_FORM);
      return;
    }

    setIsCreating(true);
    try {
      const saved = await insertProject(form);
      setProjects((prev) => [saved, ...prev]);
      setSelectedId(saved.id);
      setForm(EMPTY_FORM);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? `Failed to create project: ${err.message}`
          : "Failed to create project."
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRunStage(stage: WorkflowStage) {
    if (!selectedProject) {
      return;
    }

    if (stage.id === "insight_report") {
      await handleGenerateInsight(selectedProject.id);
      return;
    }

    // Only "Run Research" / insight are wired; other stages stay placeholders.
    if (stage.id !== "research") {
      setStatusMessage(`${stage.label} coming next`);
      return;
    }

    const projectId = selectedProject.id;
    setStatusMessage(null);
    setResearchError(null);
    setResearchingId(projectId);

    try {
      const res = await fetch(`${API_BASE}/api/research/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const payload: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error: unknown }).error)
            : `Research failed (HTTP ${res.status}).`;
        throw new Error(message);
      }

      const data = payload as RunResearchResponse;
      setResearchByProject((prev) => ({
        ...prev,
        [projectId]: data.sources,
      }));
      setStatusMessage(
        `Research complete: ${data.sources.length} sources saved.`
      );
    } catch (err: unknown) {
      setResearchError(
        err instanceof Error ? err.message : "Research failed."
      );
    } finally {
      setResearchingId((current) => (current === projectId ? null : current));
    }
  }

  async function handleGenerateInsight(projectId: string) {
    setStatusMessage(null);
    setInsightError(null);
    setGeneratingInsightId(projectId);

    try {
      const res = await fetch(`${API_BASE}/api/insights/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const payload: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error: unknown }).error)
            : `Insight report failed (HTTP ${res.status}).`;
        throw new Error(message);
      }

      const data = payload as GenerateInsightResponse;
      setInsightByProject((prev) => ({ ...prev, [projectId]: data.insight }));
      setStatusMessage("Insight report generated.");
    } catch (err: unknown) {
      setInsightError(
        err instanceof Error ? err.message : "Insight report failed."
      );
    } finally {
      setGeneratingInsightId((current) =>
        current === projectId ? null : current
      );
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">
            <Boxes size={22} strokeWidth={2} />
          </span>
          <div>
            <h1 className="brand-name">Branded eCommerce</h1>
            <p className="brand-subtitle">
              Ad research and creative workflow engine
            </p>
          </div>
        </div>
      </header>

      <main className="layout">
        <aside className="panel form-panel">
          <div className="panel-head">
            <h2 className="panel-title">New Product Project</h2>
            <p className="panel-hint">Define the product brief to research</p>
          </div>

          <form className="project-form" onSubmit={handleCreateProject}>
            <label className="field">
              <span className="field-label">Product name</span>
              <input
                className="input"
                value={form.product_name}
                onChange={(e) => updateField("product_name", e.target.value)}
                placeholder="e.g. PostureFix Pro"
                required
              />
            </label>

            <label className="field">
              <span className="field-label">Product description</span>
              <textarea
                className="textarea"
                value={form.product_description}
                onChange={(e) =>
                  updateField("product_description", e.target.value)
                }
                rows={3}
                placeholder="What the product is and how it works"
              />
            </label>

            <label className="field">
              <span className="field-label">Competitor URL</span>
              <input
                className="input"
                value={form.competitor_url}
                onChange={(e) => updateField("competitor_url", e.target.value)}
                placeholder="https://..."
              />
            </label>

            <div className="field-row">
              <label className="field">
                <span className="field-label">Target country</span>
                <input
                  className="input"
                  value={form.target_country}
                  onChange={(e) =>
                    updateField("target_country", e.target.value)
                  }
                  placeholder="e.g. United States"
                />
              </label>
              <label className="field">
                <span className="field-label">Product price</span>
                <input
                  className="input"
                  value={form.product_price}
                  onChange={(e) =>
                    updateField("product_price", e.target.value)
                  }
                  placeholder="e.g. $39.99"
                />
              </label>
            </div>

            <label className="field">
              <span className="field-label">Target customer</span>
              <input
                className="input"
                value={form.target_customer}
                onChange={(e) =>
                  updateField("target_customer", e.target.value)
                }
                placeholder="Who is this for?"
              />
            </label>

            <label className="field">
              <span className="field-label">Main problem</span>
              <input
                className="input"
                value={form.main_problem}
                onChange={(e) => updateField("main_problem", e.target.value)}
                placeholder="The core pain point it solves"
              />
            </label>

            <label className="field">
              <span className="field-label">Offer</span>
              <input
                className="input"
                value={form.offer}
                onChange={(e) => updateField("offer", e.target.value)}
                placeholder="e.g. Buy 1 Get 1 50% off"
              />
            </label>

            <label className="field">
              <span className="field-label">Brand tone</span>
              <input
                className="input"
                value={form.brand_tone}
                onChange={(e) => updateField("brand_tone", e.target.value)}
                placeholder="e.g. Confident, supportive"
              />
            </label>

            <label className="field">
              <span className="field-label">Claims allowed</span>
              <textarea
                className="textarea"
                value={form.claims_allowed}
                onChange={(e) =>
                  updateField("claims_allowed", e.target.value)
                }
                rows={3}
                placeholder="One claim per line"
              />
            </label>

            <label className="field">
              <span className="field-label">Claims banned</span>
              <textarea
                className="textarea"
                value={form.claims_banned}
                onChange={(e) => updateField("claims_banned", e.target.value)}
                rows={3}
                placeholder="One banned claim per line"
              />
            </label>

            <label className="field">
              <span className="field-label">Output goal</span>
              <textarea
                className="textarea"
                value={form.output_goal}
                onChange={(e) => updateField("output_goal", e.target.value)}
                rows={3}
                placeholder="What you want the workflow to produce"
              />
            </label>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isCreating}
            >
              {isCreating ? (
                <Loader2 size={16} strokeWidth={2.5} className="spin" />
              ) : (
                <Plus size={16} strokeWidth={2.5} />
              )}
              {isCreating ? "Creating…" : "Create project"}
            </button>
          </form>
        </aside>

        <section className="panel detail-panel">
          {error ? (
            <div className="banner banner-error" role="alert">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          ) : null}

          {isLoading ? (
            <div className="empty-state">
              <Loader2 size={36} strokeWidth={1.5} className="spin" />
              <p>Loading projects…</p>
            </div>
          ) : selectedProject ? (
            <ProjectDetail
              project={selectedProject}
              statusMessage={statusMessage}
              onRunStage={handleRunStage}
              isResearching={researchingId === selectedProject.id}
              isSourcesLoading={sourcesLoadingId === selectedProject.id}
              researchError={researchError}
              researchSources={researchByProject[selectedProject.id] ?? []}
              isGeneratingInsight={generatingInsightId === selectedProject.id}
              isInsightLoading={insightLoadingId === selectedProject.id}
              insightError={insightError}
              insight={insightByProject[selectedProject.id] ?? null}
            />
          ) : (
            <div className="empty-state">
              <Boxes size={40} strokeWidth={1.5} />
              <p>
                {projects.length === 0
                  ? "No projects yet. Create one to begin."
                  : "Select a project to begin."}
              </p>
            </div>
          )}
        </section>

        <aside className="panel list-panel">
          <div className="panel-head">
            <h2 className="panel-title">Projects</h2>
            <span className="count-badge">{projects.length}</span>
          </div>

          {isLoading ? (
            <div className="list-state">
              <Loader2 size={16} strokeWidth={2} className="spin" />
              <span>Loading…</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="list-state">No projects yet.</div>
          ) : (
            <ul className="project-list">
              {projects.map((project) => {
                const isActive = project.id === selectedId;
                return (
                  <li key={project.id}>
                    <button
                      type="button"
                      className={`project-item${isActive ? " is-active" : ""}`}
                      onClick={() => setSelectedId(project.id)}
                    >
                      <span className="project-item-name">
                        {project.product_name || "Untitled project"}
                      </span>
                      <span className="project-item-meta">
                        {project.target_country ? (
                          <span className="meta-chip">
                            <Globe size={12} />
                            {project.target_country}
                          </span>
                        ) : null}
                        {project.product_price ? (
                          <span className="meta-chip">
                            <Tag size={12} />
                            {project.product_price}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </main>
    </div>
  );
}

interface ProjectDetailProps {
  project: ProductProject;
  statusMessage: string | null;
  onRunStage: (stage: WorkflowStage) => void;
  isResearching: boolean;
  isSourcesLoading: boolean;
  researchError: string | null;
  researchSources: ResearchSource[];
  isGeneratingInsight: boolean;
  isInsightLoading: boolean;
  insightError: string | null;
  insight: ResearchInsight | null;
}

function ProjectDetail({
  project,
  statusMessage,
  onRunStage,
  isResearching,
  isSourcesLoading,
  researchError,
  researchSources,
  isGeneratingInsight,
  isInsightLoading,
  insightError,
  insight,
}: ProjectDetailProps) {
  return (
    <div className="detail">
      <div className="detail-head">
        <div>
          <h2 className="detail-title">{project.product_name}</h2>
          {project.target_customer ? (
            <p className="detail-sub">{project.target_customer}</p>
          ) : null}
        </div>
        {project.product_price ? (
          <span className="price-pill">{project.product_price}</span>
        ) : null}
      </div>

      <div className="detail-grid">
        <DetailField label="Product description" value={project.product_description} multiline />
        <DetailField label="Main problem" value={project.main_problem} />
        <DetailField label="Offer" value={project.offer} />
        <DetailField label="Target country" value={project.target_country} />
        <DetailField label="Brand tone" value={project.brand_tone} />
        <DetailField
          label="Competitor URL"
          value={project.competitor_url}
          isLink
        />
        <DetailField label="Claims allowed" value={project.claims_allowed} multiline />
        <DetailField label="Claims banned" value={project.claims_banned} multiline />
        <DetailField label="Output goal" value={project.output_goal} multiline />
      </div>

      <div className="workflow">
        <div className="workflow-head">
          <h3 className="workflow-title">Workflow</h3>
          {statusMessage ? (
            <p className="status-message" role="status">
              {statusMessage}
            </p>
          ) : (
            <p className="status-message status-idle">
              Run a stage to continue the workflow.
            </p>
          )}
        </div>
        <div className="workflow-grid">
          {WORKFLOW_STAGES.map((stage, index) => {
            const Icon = STAGE_ICONS[stage.id];
            const busy =
              (stage.id === "research" && isResearching) ||
              (stage.id === "insight_report" && isGeneratingInsight);
            const busyLabel =
              stage.id === "research"
                ? "Running research…"
                : "Generating insight report…";
            return (
              <button
                key={stage.id}
                type="button"
                className="stage-btn"
                onClick={() => onRunStage(stage)}
                disabled={busy}
              >
                <span className="stage-index">{index + 1}</span>
                {busy ? (
                  <Loader2 size={16} strokeWidth={2} className="spin" />
                ) : (
                  <Icon size={16} strokeWidth={2} />
                )}
                <span className="stage-label">
                  {busy ? busyLabel : stage.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <ResearchResults
        isResearching={isResearching}
        isLoading={isSourcesLoading}
        researchError={researchError}
        sources={researchSources}
      />

      <InsightReport
        isGenerating={isGeneratingInsight}
        isLoading={isInsightLoading}
        error={insightError}
        insight={insight}
      />
    </div>
  );
}

interface ResearchResultsProps {
  isResearching: boolean;
  isLoading: boolean;
  researchError: string | null;
  sources: ResearchSource[];
}

function ResearchResults({
  isResearching,
  isLoading,
  researchError,
  sources,
}: ResearchResultsProps) {
  const showEmptyState =
    !isResearching && !isLoading && !researchError && sources.length === 0;

  return (
    <div className="research">
      <div className="research-head">
        <h3 className="workflow-title">Research sources</h3>
        {sources.length > 0 ? (
          <span className="count-badge">{sources.length}</span>
        ) : null}
      </div>

      {researchError ? (
        <div className="banner banner-error" role="alert">
          <AlertTriangle size={16} />
          <span>{researchError}</span>
        </div>
      ) : null}

      {isResearching ? (
        <div className="list-state">
          <Loader2 size={16} strokeWidth={2} className="spin" />
          <span>Searching public discussions… this can take a minute.</span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="list-state">
          <Loader2 size={16} strokeWidth={2} className="spin" />
          <span>Loading saved research sources…</span>
        </div>
      ) : null}

      {showEmptyState ? (
        <div className="list-state">
          No research sources yet. Click “Run Research” to gather them.
        </div>
      ) : null}

      <div className="source-list">
        {sources.map((source) => (
          <article key={source.id} className="source-card">
            <header className="source-card-head">
              <h4 className="source-title">{source.title || "Untitled source"}</h4>
              <span className="score-pill">{source.relevance_score}</span>
            </header>

            <div className="source-meta">
              {source.platform ? (
                <span className="meta-chip">{source.platform}</span>
              ) : null}
              {source.emotional_theme ? (
                <span className="meta-chip meta-chip-theme">
                  {source.emotional_theme}
                </span>
              ) : null}
            </div>

            {source.summary ? (
              <p className="source-summary">{source.summary}</p>
            ) : null}

            {source.useful_phrases.length > 0 ? (
              <ul className="phrase-list">
                {source.useful_phrases.map((phrase, i) => (
                  <li key={i} className="phrase">
                    “{phrase}”
                  </li>
                ))}
              </ul>
            ) : null}

            {source.url ? (
              <a
                className="source-link"
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                {source.url}
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

interface InsightReportProps {
  isGenerating: boolean;
  isLoading: boolean;
  error: string | null;
  insight: ResearchInsight | null;
}

function InsightReport({
  isGenerating,
  isLoading,
  error,
  insight,
}: InsightReportProps) {
  const hasContent = isGenerating || isLoading || error || insight;
  if (!hasContent) {
    return null;
  }

  return (
    <div className="insight">
      <div className="research-head">
        <h3 className="workflow-title">Insight report</h3>
        {insight ? (
          <span className="insight-date">
            {new Date(insight.created_at).toLocaleString()}
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="banner banner-error" role="alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      ) : null}

      {isGenerating ? (
        <div className="list-state">
          <Loader2 size={16} strokeWidth={2} className="spin" />
          <span>Generating insight report… this can take a minute.</span>
        </div>
      ) : isLoading ? (
        <div className="list-state">
          <Loader2 size={16} strokeWidth={2} className="spin" />
          <span>Loading insight report…</span>
        </div>
      ) : null}

      {insight && !isGenerating ? (
        <div className="insight-body">
          <InsightSection title="Pain clusters">
            {insight.pain_clusters.map((cluster, i) => (
              <div key={i} className="insight-card">
                <div className="insight-card-head">
                  <h5 className="insight-card-title">{cluster.name}</h5>
                  <span
                    className={`intensity intensity-${cluster.emotional_intensity}`}
                  >
                    {cluster.emotional_intensity}
                  </span>
                </div>
                <p className="insight-text">{cluster.description}</p>
                {cluster.evidence_from_sources.length > 0 ? (
                  <ul className="phrase-list">
                    {cluster.evidence_from_sources.map((ev, j) => (
                      <li key={j} className="phrase">
                        {ev}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </InsightSection>

          <InsightSection title="Language patterns">
            {insight.language_patterns.map((lp, i) => (
              <div key={i} className="insight-card">
                <h5 className="insight-card-title">“{lp.pattern}”</h5>
                <p className="insight-text">
                  <strong>Meaning:</strong> {lp.meaning}
                </p>
                <p className="insight-text">
                  <strong>Copy use:</strong> {lp.copywriting_use}
                </p>
              </div>
            ))}
          </InsightSection>

          <InsightSection title="Emotional states">
            {insight.emotional_states.map((es, i) => (
              <div key={i} className="insight-card">
                <h5 className="insight-card-title">{es.state}</h5>
                <p className="insight-text">{es.description}</p>
                {es.trigger_moments.length > 0 ? (
                  <ul className="phrase-list">
                    {es.trigger_moments.map((tm, j) => (
                      <li key={j} className="phrase">
                        {tm}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </InsightSection>

          <InsightSection title="Failed solutions">
            {insight.failed_solutions.map((fs, i) => (
              <div key={i} className="insight-card">
                <h5 className="insight-card-title">{fs.solution}</h5>
                <p className="insight-text">
                  <strong>Why it failed:</strong> {fs.why_it_failed}
                </p>
                <p className="insight-text">
                  <strong>Market belief:</strong> {fs.market_belief}
                </p>
              </div>
            ))}
          </InsightSection>

          <div className="insight-columns">
            <InsightSection title="Hopes">
              <ul className="bullet-list">
                {insight.hopes.map((hope, i) => (
                  <li key={i}>{hope}</li>
                ))}
              </ul>
            </InsightSection>
            <InsightSection title="Fears">
              <ul className="bullet-list">
                {insight.fears.map((fear, i) => (
                  <li key={i}>{fear}</li>
                ))}
              </ul>
            </InsightSection>
          </div>

          <InsightSection title="Copywriting notes">
            <p className="insight-text">{insight.copywriting_notes || "—"}</p>
          </InsightSection>

          <InsightSection title="Compliance warnings">
            {insight.compliance_warnings.map((cw, i) => (
              <div key={i} className="insight-card insight-card-warning">
                <h5 className="insight-card-title">{cw.risk}</h5>
                <p className="insight-text">
                  <strong>Why it matters:</strong> {cw.why_it_matters}
                </p>
                <p className="insight-text">
                  <strong>Safer direction:</strong> {cw.safer_direction}
                </p>
              </div>
            ))}
          </InsightSection>
        </div>
      ) : null}
    </div>
  );
}

interface InsightSectionProps {
  title: string;
  children: React.ReactNode;
}

function InsightSection({ title, children }: InsightSectionProps) {
  return (
    <section className="insight-section">
      <h4 className="insight-section-title">{title}</h4>
      <div className="insight-section-body">{children}</div>
    </section>
  );
}

interface DetailFieldProps {
  label: string;
  value: string;
  multiline?: boolean;
  isLink?: boolean;
}

function DetailField({ label, value, multiline, isLink }: DetailFieldProps) {
  const hasValue = value.trim().length > 0;
  return (
    <div className={`detail-field${multiline ? " is-multiline" : ""}`}>
      <span className="detail-field-label">{label}</span>
      {hasValue ? (
        isLink ? (
          <a
            className="detail-field-value detail-link"
            href={value}
            target="_blank"
            rel="noreferrer"
          >
            {value}
          </a>
        ) : (
          <span className="detail-field-value">{value}</span>
        )
      ) : (
        <span className="detail-field-value is-empty">—</span>
      )}
    </div>
  );
}

export default App;
