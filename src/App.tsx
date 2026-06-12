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
  Copy,
  Check,
} from "lucide-react";
import {
  fetchLatestCustomerAvatar,
  fetchLatestInsight,
  fetchAdCopySets,
  fetchCreativePromptSets,
  fetchMassDesires,
  fetchMarketingAngles,
  fetchLatestResearchSources,
  fetchProjects,
  insertProject,
  isSupabaseConfigured,
} from "./lib/supabase";
import type {
  AdCopySet,
  CreativePromptSet,
  CustomerAvatarOutput,
  GenerateAnglesResponse,
  GenerateAvatarResponse,
  GenerateCopyResponse,
  GenerateCreativePromptsResponse,
  GenerateDesiresResponse,
  GenerateInsightResponse,
  MarketingAngle,
  MassDesire,
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
  { id: "ad_copy", label: "Generate Quick Copy" },
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

  const [avatarByProject, setAvatarByProject] = useState<
    Record<string, CustomerAvatarOutput | null>
  >({});
  const [avatarLoadingId, setAvatarLoadingId] = useState<string | null>(null);
  const [generatingAvatarId, setGeneratingAvatarId] = useState<string | null>(
    null
  );
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [desiresByProject, setDesiresByProject] = useState<
    Record<string, MassDesire[]>
  >({});
  const [anglesByProject, setAnglesByProject] = useState<
    Record<string, MarketingAngle[]>
  >({});
  const [desiresLoadingId, setDesiresLoadingId] = useState<string | null>(null);
  const [generatingDesiresId, setGeneratingDesiresId] = useState<string | null>(
    null
  );
  const [desiresError, setDesiresError] = useState<string | null>(null);
  const [generatingAnglesId, setGeneratingAnglesId] = useState<string | null>(
    null
  );
  const [anglesError, setAnglesError] = useState<string | null>(null);

  const [copySetsByProject, setCopySetsByProject] = useState<
    Record<string, AdCopySet[]>
  >({});
  const [generatingCopyAngleId, setGeneratingCopyAngleId] = useState<
    string | null
  >(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const [creativePromptSetsByProject, setCreativePromptSetsByProject] =
    useState<Record<string, CreativePromptSet[]>>({});
  const [generatingCreativePromptAngleId, setGeneratingCreativePromptAngleId] =
    useState<string | null>(null);
  const [creativePromptError, setCreativePromptError] = useState<string | null>(
    null
  );

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

  useEffect(() => {
    if (!isSupabaseConfigured || !selectedId) {
      return;
    }
    if (selectedId in avatarByProject) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setAvatarLoadingId(selectedId);
      setAvatarError(null);
      try {
        const avatar = await fetchLatestCustomerAvatar(selectedId);
        if (cancelled) return;
        setAvatarByProject((prev) => ({ ...prev, [selectedId]: avatar }));
      } catch (err: unknown) {
        if (cancelled) return;
        setAvatarError(
          err instanceof Error
            ? `Failed to load customer avatar: ${err.message}`
            : "Failed to load customer avatar."
        );
      } finally {
        if (!cancelled) {
          setAvatarLoadingId((current) =>
            current === selectedId ? null : current
          );
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [selectedId, avatarByProject]);

  useEffect(() => {
    if (!isSupabaseConfigured || !selectedId) {
      return;
    }
    if (
      selectedId in desiresByProject &&
      selectedId in anglesByProject &&
      selectedId in copySetsByProject &&
      selectedId in creativePromptSetsByProject
    ) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setDesiresLoadingId(selectedId);
      setDesiresError(null);
      setAnglesError(null);
      setCopyError(null);
      setCreativePromptError(null);
      try {
        const [desires, angles, copySets, creativePromptSets] =
          await Promise.all([
            fetchMassDesires(selectedId),
            fetchMarketingAngles(selectedId),
            fetchAdCopySets(selectedId),
            fetchCreativePromptSets(selectedId),
          ]);
        if (cancelled) return;
        setDesiresByProject((prev) => ({ ...prev, [selectedId]: desires }));
        setAnglesByProject((prev) => ({ ...prev, [selectedId]: angles }));
        setCopySetsByProject((prev) => ({ ...prev, [selectedId]: copySets }));
        setCreativePromptSetsByProject((prev) => ({
          ...prev,
          [selectedId]: creativePromptSets,
        }));
      } catch (err: unknown) {
        if (cancelled) return;
        setDesiresError(
          err instanceof Error
            ? `Failed to load workflow data: ${err.message}`
            : "Failed to load workflow data."
        );
      } finally {
        if (!cancelled) {
          setDesiresLoadingId((current) =>
            current === selectedId ? null : current
          );
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    selectedId,
    desiresByProject,
    anglesByProject,
    copySetsByProject,
    creativePromptSetsByProject,
  ]);

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

    if (stage.id === "customer_avatar") {
      await handleGenerateAvatar(selectedProject.id);
      return;
    }

    if (stage.id === "mass_desires") {
      await handleGenerateDesires(selectedProject.id);
      return;
    }

    if (stage.id === "marketing_angles") {
      await handleGenerateAngles(selectedProject.id);
      return;
    }

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

  async function handleGenerateAvatar(projectId: string) {
    setStatusMessage(null);
    setAvatarError(null);
    setGeneratingAvatarId(projectId);

    try {
      const res = await fetch(`${API_BASE}/api/avatar/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const payload: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error: unknown }).error)
            : `Customer avatar failed (HTTP ${res.status}).`;
        throw new Error(message);
      }

      const data = payload as GenerateAvatarResponse;
      setAvatarByProject((prev) => ({ ...prev, [projectId]: data.avatar }));
      setStatusMessage("Customer avatar generated.");
    } catch (err: unknown) {
      setAvatarError(
        err instanceof Error ? err.message : "Customer avatar failed."
      );
    } finally {
      setGeneratingAvatarId((current) =>
        current === projectId ? null : current
      );
    }
  }

  async function handleGenerateDesires(projectId: string) {
    setStatusMessage(null);
    setDesiresError(null);
    setGeneratingDesiresId(projectId);

    try {
      const res = await fetch(`${API_BASE}/api/desires/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const payload: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error: unknown }).error)
            : `Mass desires failed (HTTP ${res.status}).`;
        throw new Error(message);
      }

      const data = payload as GenerateDesiresResponse;
      setDesiresByProject((prev) => ({ ...prev, [projectId]: data.desires }));
      setAnglesByProject((prev) => ({ ...prev, [projectId]: [] }));
      setCopySetsByProject((prev) => ({ ...prev, [projectId]: [] }));
      setCreativePromptSetsByProject((prev) => ({ ...prev, [projectId]: [] }));
      setStatusMessage("Mass desires generated.");
    } catch (err: unknown) {
      setDesiresError(
        err instanceof Error ? err.message : "Mass desires failed."
      );
    } finally {
      setGeneratingDesiresId((current) =>
        current === projectId ? null : current
      );
    }
  }

  async function handleGenerateAngles(projectId: string) {
    setStatusMessage(null);
    setAnglesError(null);
    setGeneratingAnglesId(projectId);

    try {
      const res = await fetch(`${API_BASE}/api/angles/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const payload: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error: unknown }).error)
            : `Marketing angles failed (HTTP ${res.status}).`;
        throw new Error(message);
      }

      const data = payload as GenerateAnglesResponse;
      setDesiresByProject((prev) => ({
        ...prev,
        [projectId]: data.desires.map((group) => group.desire),
      }));
      setAnglesByProject((prev) => ({
        ...prev,
        [projectId]: data.desires.flatMap((group) => group.angles),
      }));
      setCopySetsByProject((prev) => ({ ...prev, [projectId]: [] }));
      setCreativePromptSetsByProject((prev) => ({ ...prev, [projectId]: [] }));
      setStatusMessage(
        `Marketing angles generated: ${data.desires.reduce((n, g) => n + g.angles.length, 0)} angles.`
      );
    } catch (err: unknown) {
      setAnglesError(
        err instanceof Error ? err.message : "Marketing angles failed."
      );
    } finally {
      setGeneratingAnglesId((current) =>
        current === projectId ? null : current
      );
    }
  }

  async function handleGenerateCopy(
    projectId: string,
    marketingAngleId: string
  ) {
    setStatusMessage(null);
    setCopyError(null);
    setGeneratingCopyAngleId(marketingAngleId);

    try {
      const res = await fetch(`${API_BASE}/api/copy/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, marketingAngleId }),
      });

      const payload: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error: unknown }).error)
            : `Ad copy failed (HTTP ${res.status}).`;
        throw new Error(message);
      }

      const data = payload as GenerateCopyResponse;
      setCopySetsByProject((prev) => {
        const existing = prev[projectId] ?? [];
        const filtered = existing.filter(
          (set) => set.marketing_angle_id !== marketingAngleId
        );
        return {
          ...prev,
          [projectId]: [data.copySet, ...filtered],
        };
      });
      setCreativePromptSetsByProject((prev) => {
        const existing = prev[projectId] ?? [];
        const filtered = existing.filter(
          (set) => set.marketing_angle_id !== marketingAngleId
        );
        return { ...prev, [projectId]: filtered };
      });
      setStatusMessage("Quick copy generated.");
    } catch (err: unknown) {
      setCopyError(err instanceof Error ? err.message : "Ad copy failed.");
    } finally {
      setGeneratingCopyAngleId((current) =>
        current === marketingAngleId ? null : current
      );
    }
  }

  async function handleGenerateCreativePrompts(
    projectId: string,
    marketingAngleId: string,
    adCopySetId: string
  ) {
    setStatusMessage(null);
    setCreativePromptError(null);
    setGeneratingCreativePromptAngleId(marketingAngleId);

    try {
      const res = await fetch(`${API_BASE}/api/creative-prompts/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, marketingAngleId, adCopySetId }),
      });

      const payload: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error: unknown }).error)
            : `Creative prompts failed (HTTP ${res.status}).`;
        throw new Error(message);
      }

      const data = payload as GenerateCreativePromptsResponse;
      setCreativePromptSetsByProject((prev) => {
        const existing = prev[projectId] ?? [];
        const filtered = existing.filter(
          (set) => set.ad_copy_set_id !== adCopySetId
        );
        return {
          ...prev,
          [projectId]: [data.promptSet, ...filtered],
        };
      });
      setStatusMessage("Creative prompts generated.");
    } catch (err: unknown) {
      setCreativePromptError(
        err instanceof Error ? err.message : "Creative prompts failed."
      );
    } finally {
      setGeneratingCreativePromptAngleId((current) =>
        current === marketingAngleId ? null : current
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
              isGeneratingAvatar={generatingAvatarId === selectedProject.id}
              isAvatarLoading={avatarLoadingId === selectedProject.id}
              avatarError={avatarError}
              avatar={avatarByProject[selectedProject.id] ?? null}
              isGeneratingDesires={generatingDesiresId === selectedProject.id}
              isGeneratingAngles={generatingAnglesId === selectedProject.id}
              isDesiresLoading={desiresLoadingId === selectedProject.id}
              desiresError={desiresError}
              anglesError={anglesError}
              desires={desiresByProject[selectedProject.id] ?? []}
              angles={anglesByProject[selectedProject.id] ?? []}
              copySets={copySetsByProject[selectedProject.id] ?? []}
              generatingCopyAngleId={generatingCopyAngleId}
              copyError={copyError}
              onGenerateCopy={(angleId) =>
                handleGenerateCopy(selectedProject.id, angleId)
              }
              creativePromptSets={
                creativePromptSetsByProject[selectedProject.id] ?? []
              }
              generatingCreativePromptAngleId={generatingCreativePromptAngleId}
              creativePromptError={creativePromptError}
              onGenerateCreativePrompts={(angleId, copySetId) =>
                handleGenerateCreativePrompts(
                  selectedProject.id,
                  angleId,
                  copySetId
                )
              }
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
  isGeneratingAvatar: boolean;
  isAvatarLoading: boolean;
  avatarError: string | null;
  avatar: CustomerAvatarOutput | null;
  isGeneratingDesires: boolean;
  isGeneratingAngles: boolean;
  isDesiresLoading: boolean;
  desiresError: string | null;
  anglesError: string | null;
  desires: MassDesire[];
  angles: MarketingAngle[];
  copySets: AdCopySet[];
  generatingCopyAngleId: string | null;
  copyError: string | null;
  onGenerateCopy: (marketingAngleId: string) => void;
  creativePromptSets: CreativePromptSet[];
  generatingCreativePromptAngleId: string | null;
  creativePromptError: string | null;
  onGenerateCreativePrompts: (
    marketingAngleId: string,
    adCopySetId: string
  ) => void;
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
  isGeneratingAvatar,
  isAvatarLoading,
  avatarError,
  avatar,
  isGeneratingDesires,
  isGeneratingAngles,
  isDesiresLoading,
  desiresError,
  anglesError,
  desires,
  angles,
  copySets,
  generatingCopyAngleId,
  copyError,
  onGenerateCopy,
  creativePromptSets,
  generatingCreativePromptAngleId,
  creativePromptError,
  onGenerateCreativePrompts,
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
              (stage.id === "insight_report" && isGeneratingInsight) ||
              (stage.id === "customer_avatar" && isGeneratingAvatar) ||
              (stage.id === "mass_desires" && isGeneratingDesires) ||
              (stage.id === "marketing_angles" && isGeneratingAngles);
            const busyLabels: Partial<Record<WorkflowStage["id"], string>> = {
              research: "Running research…",
              insight_report: "Generating insight report…",
              customer_avatar: "Generating customer avatar…",
              mass_desires: "Generating mass desires…",
              marketing_angles: "Generating marketing angles…",
            };
            const busyLabel = busyLabels[stage.id];
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
                  {busy && busyLabel ? busyLabel : stage.label}
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

      <CustomerAvatarPanel
        isGenerating={isGeneratingAvatar}
        isLoading={isAvatarLoading}
        error={avatarError}
        avatar={avatar}
      />

      <MassDesiresPanel
        isGeneratingDesires={isGeneratingDesires}
        isGeneratingAngles={isGeneratingAngles}
        isLoading={isDesiresLoading}
        desiresError={desiresError}
        anglesError={anglesError}
        copyError={copyError}
        desires={desires}
        angles={angles}
        copySets={copySets}
        generatingCopyAngleId={generatingCopyAngleId}
        onGenerateCopy={onGenerateCopy}
        creativePromptSets={creativePromptSets}
        generatingCreativePromptAngleId={generatingCreativePromptAngleId}
        creativePromptError={creativePromptError}
        onGenerateCreativePrompts={onGenerateCreativePrompts}
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

interface CustomerAvatarPanelProps {
  isGenerating: boolean;
  isLoading: boolean;
  error: string | null;
  avatar: CustomerAvatarOutput | null;
}

function CustomerAvatarPanel({
  isGenerating,
  isLoading,
  error,
  avatar,
}: CustomerAvatarPanelProps) {
  const hasContent = isGenerating || isLoading || error || avatar;
  if (!hasContent) {
    return null;
  }

  const content = avatar?.content_json;

  return (
    <div className="insight avatar-panel">
      <div className="research-head">
        <h3 className="workflow-title">Customer avatar</h3>
        {avatar ? (
          <span className="insight-date">
            {new Date(avatar.created_at).toLocaleString()}
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
          <span>Generating customer avatar… this can take a minute.</span>
        </div>
      ) : isLoading ? (
        <div className="list-state">
          <Loader2 size={16} strokeWidth={2} className="spin" />
          <span>Loading customer avatar…</span>
        </div>
      ) : null}

      {content && !isGenerating ? (
        <div className="insight-body">
          <InsightSection title="Avatar summary">
            <div className="insight-card">
              <h5 className="insight-card-title">{content.avatar_name}</h5>
              <p className="insight-text">{content.avatar_summary}</p>
            </div>
          </InsightSection>

          <InsightSection title="Demographics">
            <div className="insight-card">
              <p className="insight-text">
                <strong>Age range:</strong> {content.demographics.age_range}
              </p>
              <p className="insight-text">
                <strong>Gender skew:</strong> {content.demographics.gender_skew}
              </p>
              <p className="insight-text">
                <strong>Location:</strong>{" "}
                {content.demographics.location_context}
              </p>
              <p className="insight-text">
                <strong>Income / spending:</strong>{" "}
                {content.demographics.income_or_spending_context}
              </p>
              <p className="insight-text">
                <strong>Life stage:</strong> {content.demographics.life_stage}
              </p>
            </div>
          </InsightSection>

          <InsightSection title="Psychographics">
            <div className="insight-card">
              <p className="insight-text">
                <strong>Core beliefs</strong>
              </p>
              <ul className="bullet-list">
                {content.psychographics.core_beliefs.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <p className="insight-text">
                <strong>Attitudes</strong>
              </p>
              <ul className="bullet-list">
                {content.psychographics.attitudes.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <p className="insight-text">
                <strong>Identity markers</strong>
              </p>
              <ul className="bullet-list">
                {content.psychographics.identity_markers.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <p className="insight-text">
                <strong>Values</strong>
              </p>
              <ul className="bullet-list">
                {content.psychographics.values.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <p className="insight-text">
                <strong>Prejudices / biases</strong>
              </p>
              <ul className="bullet-list">
                {content.psychographics.prejudices_or_biases.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </InsightSection>

          <InsightSection title="Hopes and dreams">
            <ul className="bullet-list">
              {content.hopes_and_dreams.map((hope, i) => (
                <li key={i}>{hope}</li>
              ))}
            </ul>
          </InsightSection>

          <div className="insight-columns">
            <InsightSection title="Victories">
              <ul className="bullet-list">
                {content.victories_and_failures.victories.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </InsightSection>
            <InsightSection title="Failures">
              <ul className="bullet-list">
                {content.victories_and_failures.failures.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </InsightSection>
          </div>

          <InsightSection title="Existing solutions">
            {content.existing_solutions.map((sol, i) => (
              <div key={i} className="insight-card">
                <h5 className="insight-card-title">{sol.solution}</h5>
                <p className="insight-text">
                  <strong>Experience:</strong> {sol.experience}
                </p>
                <p className="insight-text">
                  <strong>Likes:</strong> {sol.likes}
                </p>
                <p className="insight-text">
                  <strong>Dislikes:</strong> {sol.dislikes}
                </p>
                <p className="insight-text">
                  <strong>Belief about effectiveness:</strong>{" "}
                  {sol.belief_about_effectiveness}
                </p>
              </div>
            ))}
          </InsightSection>

          <InsightSection title="Buying triggers">
            <ul className="bullet-list">
              {content.buying_triggers.map((trigger, i) => (
                <li key={i}>{trigger}</li>
              ))}
            </ul>
          </InsightSection>

          <InsightSection title="Objections">
            <ul className="bullet-list">
              {content.objections.map((objection, i) => (
                <li key={i}>{objection}</li>
              ))}
            </ul>
          </InsightSection>

          <InsightSection title="Language bank">
            <div className="insight-card">
              <p className="insight-text">
                <strong>Phrases they use</strong>
              </p>
              <ul className="phrase-list">
                {content.language_bank.phrases_they_use.map((phrase, i) => (
                  <li key={i} className="phrase">
                    “{phrase}”
                  </li>
                ))}
              </ul>
              <p className="insight-text">
                <strong>Words to use in copy</strong>
              </p>
              <ul className="bullet-list">
                {content.language_bank.words_to_use_in_copy.map((word, i) => (
                  <li key={i}>{word}</li>
                ))}
              </ul>
              <p className="insight-text">
                <strong>Words to avoid</strong>
              </p>
              <ul className="bullet-list">
                {content.language_bank.words_to_avoid.map((word, i) => (
                  <li key={i}>{word}</li>
                ))}
              </ul>
            </div>
          </InsightSection>

          <InsightSection title="Copywriting implications">
            <div className="insight-card">
              <p className="insight-text">
                <strong>Best emotional angle:</strong>{" "}
                {content.copywriting_implications.best_emotional_angle}
              </p>
              <p className="insight-text">
                <strong>Best logical angle:</strong>{" "}
                {content.copywriting_implications.best_logical_angle}
              </p>
              <p className="insight-text">
                <strong>Trust builders</strong>
              </p>
              <ul className="bullet-list">
                {content.copywriting_implications.trust_builders.map(
                  (item, i) => (
                    <li key={i}>{item}</li>
                  )
                )}
              </ul>
              <p className="insight-text">
                <strong>Risk reducers</strong>
              </p>
              <ul className="bullet-list">
                {content.copywriting_implications.risk_reducers.map(
                  (item, i) => (
                    <li key={i}>{item}</li>
                  )
                )}
              </ul>
            </div>
          </InsightSection>

          <InsightSection title="Compliance notes">
            <ul className="bullet-list">
              {content.compliance_notes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </InsightSection>
        </div>
      ) : null}
    </div>
  );
}

interface MassDesiresPanelProps {
  isGeneratingDesires: boolean;
  isGeneratingAngles: boolean;
  isLoading: boolean;
  desiresError: string | null;
  anglesError: string | null;
  copyError: string | null;
  desires: MassDesire[];
  angles: MarketingAngle[];
  copySets: AdCopySet[];
  generatingCopyAngleId: string | null;
  onGenerateCopy: (marketingAngleId: string) => void;
  creativePromptSets: CreativePromptSet[];
  generatingCreativePromptAngleId: string | null;
  creativePromptError: string | null;
  onGenerateCreativePrompts: (
    marketingAngleId: string,
    adCopySetId: string
  ) => void;
}

function MassDesiresPanel({
  isGeneratingDesires,
  isGeneratingAngles,
  isLoading,
  desiresError,
  anglesError,
  copyError,
  desires,
  angles,
  copySets,
  generatingCopyAngleId,
  onGenerateCopy,
  creativePromptSets,
  generatingCreativePromptAngleId,
  creativePromptError,
  onGenerateCreativePrompts,
}: MassDesiresPanelProps) {
  const [fullCopyPlaceholderId, setFullCopyPlaceholderId] = useState<
    string | null
  >(null);

  const hasContent =
    isGeneratingDesires ||
    isGeneratingAngles ||
    isLoading ||
    desiresError ||
    anglesError ||
    desires.length > 0;

  if (!hasContent) {
    return null;
  }

  const totalAngles = angles.length;

  return (
    <div className="insight desires-panel">
      <div className="research-head">
        <h3 className="workflow-title">Mass desires &amp; marketing angles</h3>
        {desires.length > 0 ? (
          <span className="count-badge">{desires.length} desires</span>
        ) : null}
        {totalAngles > 0 ? (
          <span className="count-badge">{totalAngles} angles</span>
        ) : null}
      </div>

      {desiresError ? (
        <div className="banner banner-error" role="alert">
          <AlertTriangle size={16} />
          <span>{desiresError}</span>
        </div>
      ) : null}

      {anglesError ? (
        <div className="banner banner-error" role="alert">
          <AlertTriangle size={16} />
          <span>{anglesError}</span>
        </div>
      ) : null}

      {copyError ? (
        <div className="banner banner-error" role="alert">
          <AlertTriangle size={16} />
          <span>{copyError}</span>
        </div>
      ) : null}

      {creativePromptError ? (
        <div className="banner banner-error" role="alert">
          <AlertTriangle size={16} />
          <span>{creativePromptError}</span>
        </div>
      ) : null}

      {isGeneratingDesires ? (
        <div className="list-state">
          <Loader2 size={16} strokeWidth={2} className="spin" />
          <span>Generating mass desires… this can take a minute.</span>
        </div>
      ) : null}

      {isGeneratingAngles ? (
        <div className="list-state">
          <Loader2 size={16} strokeWidth={2} className="spin" />
          <span>Generating marketing angles… this can take a few minutes.</span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="list-state">
          <Loader2 size={16} strokeWidth={2} className="spin" />
          <span>Loading mass desires and marketing angles…</span>
        </div>
      ) : null}

      {!isGeneratingDesires && desires.length > 0 ? (
        <div className="source-list">
          {desires.map((desire, index) => {
            const desireAngles = angles
              .filter((angle) => angle.mass_desire_id === desire.id)
              .sort((a, b) => a.sort_order - b.sort_order);

            return (
              <article key={desire.id} className="source-card desire-card">
                <header className="source-card-head">
                  <h4 className="source-title">{desire.desire_statement}</h4>
                  <span className="stage-index">{index + 1}</span>
                </header>

                {desire.audience_segment ? (
                  <span className="meta-chip meta-chip-theme">
                    {desire.audience_segment}
                  </span>
                ) : null}

                <p className="insight-text">
                  <strong>Emotional driver:</strong> {desire.emotional_driver}
                </p>
                <p className="insight-text">
                  <strong>What they are really buying:</strong>{" "}
                  {desire.what_they_are_really_buying}
                </p>
                <p className="insight-text">
                  <strong>Pain it moves away from:</strong>{" "}
                  {desire.pain_it_moves_away_from}
                </p>
                <p className="insight-text">
                  <strong>Positive outcome it moves toward:</strong>{" "}
                  {desire.positive_outcome_it_moves_toward}
                </p>
                <p className="insight-text">
                  <strong>Copy direction:</strong> {desire.copy_direction}
                </p>
                <p className="insight-text">
                  <strong>Messaging to avoid:</strong>{" "}
                  {desire.messaging_to_avoid}
                </p>

                {desire.compliance_notes.length > 0 ? (
                  <ul className="bullet-list">
                    {desire.compliance_notes.map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                ) : null}

                {desireAngles.length > 0 ? (
                  <div className="angle-list">
                    <h5 className="angle-list-title">
                      Marketing angles ({desireAngles.length})
                    </h5>
                    {desireAngles.map((angle) => {
                      const isGeneratingCopy =
                        generatingCopyAngleId === angle.id;
                      const isGeneratingCreativePrompts =
                        generatingCreativePromptAngleId === angle.id;
                      const copySet = copySets.find(
                        (set) => set.marketing_angle_id === angle.id
                      );
                      const promptSet = copySet
                        ? creativePromptSets.find(
                            (set) => set.ad_copy_set_id === copySet.id
                          )
                        : undefined;

                      return (
                        <div key={angle.id} className="angle-card">
                          <header className="angle-card-head">
                            <h6 className="angle-name">{angle.angle_name}</h6>
                            <span className="stage-index">
                              {angle.sort_order + 1}
                            </span>
                          </header>
                          <p className="insight-text">
                            <strong>Target audience:</strong>{" "}
                            {angle.target_audience}
                          </p>
                          <p className="insight-text">
                            <strong>Story arc:</strong> {angle.story_arc}
                          </p>
                          <p className="insight-text">
                            <strong>Crisis / realization:</strong>{" "}
                            {angle.crisis_or_realization_moment}
                          </p>
                          <p className="insight-text">
                            <strong>Unique problem mechanism:</strong>{" "}
                            {angle.unique_problem_mechanism}
                          </p>
                          <p className="insight-text">
                            <strong>Unique solution mechanism:</strong>{" "}
                            {angle.unique_solution_mechanism}
                          </p>
                          <p className="insight-text">
                            <strong>Key emotional moment:</strong>{" "}
                            {angle.key_emotional_moment}
                          </p>
                          <p className="insight-text">
                            <strong>Copy direction:</strong>{" "}
                            {angle.copy_direction}
                          </p>
                          <p className="insight-text">
                            <strong>Creative direction:</strong>{" "}
                            {angle.creative_direction}
                          </p>
                          {angle.compliance_notes.length > 0 ? (
                            <ul className="bullet-list">
                              {angle.compliance_notes.map((note, i) => (
                                <li key={i}>{note}</li>
                              ))}
                            </ul>
                          ) : null}

                          <div className="angle-actions">
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                setFullCopyPlaceholderId(null);
                                onGenerateCopy(angle.id);
                              }}
                              disabled={isGeneratingCopy}
                            >
                              {isGeneratingCopy ? (
                                <Loader2
                                  size={14}
                                  strokeWidth={2.5}
                                  className="spin"
                                />
                              ) : (
                                <PenLine size={14} strokeWidth={2.5} />
                              )}
                              {isGeneratingCopy
                                ? "Generating quick copy…"
                                : "Generate Quick Copy"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() =>
                                setFullCopyPlaceholderId(angle.id)
                              }
                              disabled={isGeneratingCopy}
                            >
                              Expand Full Copy Pack
                            </button>
                          </div>

                          {fullCopyPlaceholderId === angle.id ? (
                            <p className="status-message status-idle angle-placeholder">
                              Full copy pack coming next
                            </p>
                          ) : null}

                          {copySet ? (
                            <QuickCopyDisplay copySet={copySet} />
                          ) : null}

                          <div className="angle-actions angle-actions-creative">
                            {copySet ? (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() =>
                                  onGenerateCreativePrompts(
                                    angle.id,
                                    copySet.id
                                  )
                                }
                                disabled={
                                  isGeneratingCopy ||
                                  isGeneratingCreativePrompts
                                }
                              >
                                {isGeneratingCreativePrompts ? (
                                  <Loader2
                                    size={14}
                                    strokeWidth={2.5}
                                    className="spin"
                                  />
                                ) : (
                                  <Sparkles size={14} strokeWidth={2.5} />
                                )}
                                {isGeneratingCreativePrompts
                                  ? "Generating creative prompts…"
                                  : "Generate Creative Prompts"}
                              </button>
                            ) : (
                              <p className="status-message status-idle angle-placeholder">
                                Generate Quick Copy first
                              </p>
                            )}
                          </div>

                          {promptSet ? (
                            <CreativePromptsDisplay promptSet={promptSet} />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

interface CopyButtonProps {
  text: string;
  label?: string;
}

function CopyButton({ text, label = "Copy" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be unavailable; fail silently.
    }
  }

  return (
    <button
      type="button"
      className="btn-copy"
      onClick={() => void handleCopy()}
      disabled={!text.trim()}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : label}
    </button>
  );
}

interface CopyBlockProps {
  text: string;
  label?: string;
}

function CopyBlock({ text, label }: CopyBlockProps) {
  if (!text.trim()) return null;
  return (
    <div className="copy-block">
      <div className="copy-block-head">
        {label ? <span className="copy-block-label">{label}</span> : null}
        <CopyButton text={text} />
      </div>
      <p className="copy-block-text">{text}</p>
    </div>
  );
}

function quickCopyWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

interface CollapsibleInsightSectionProps {
  title: string;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}

function CollapsibleInsightSection({
  title,
  children,
  defaultCollapsed = false,
}: CollapsibleInsightSectionProps) {
  const [open, setOpen] = useState(!defaultCollapsed);

  return (
    <section className="insight-section collapsible-section">
      <button
        type="button"
        className="collapsible-head"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <h4 className="insight-section-title">{title}</h4>
        <span className="collapsible-toggle">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? <div className="insight-section-body">{children}</div> : null}
    </section>
  );
}

interface QuickCopyDisplayProps {
  copySet: AdCopySet;
}

function QuickCopyDisplay({ copySet }: QuickCopyDisplayProps) {
  const isLegacyLongStory =
    quickCopyWordCount(copySet.long_form_story) > 120;
  const hasLegacyHookTransitions = copySet.hook_transitions.length > 0;
  const isLegacyLargeHooks = copySet.hooks.length > 5;
  const isLegacyLargeHeadlines = copySet.headlines.length > 5;
  const isLegacyLargeShortTexts = copySet.short_primary_texts.length > 3;
  const isLegacyLargeMediumTexts = copySet.medium_primary_texts.length > 2;

  return (
    <div className="copy-set copy-set-quick">
      <div className="copy-set-head">
        <h6 className="angle-list-title">Quick copy pack</h6>
        <span className="insight-date">
          {new Date(copySet.created_at).toLocaleString()}
        </span>
      </div>

      {copySet.long_form_story.trim() ? (
        <CollapsibleInsightSection
          title="Core ad concept"
          defaultCollapsed={isLegacyLongStory}
        >
          <CopyBlock text={copySet.long_form_story} />
        </CollapsibleInsightSection>
      ) : null}

      {copySet.short_primary_texts.length > 0 ? (
        <CollapsibleInsightSection
          title={`Short primary texts (${copySet.short_primary_texts.length})`}
          defaultCollapsed={isLegacyLargeShortTexts}
        >
          {copySet.short_primary_texts.map((item, i) => (
            <div key={i} className="insight-card insight-card-compact">
              <div className="copy-block-head">
                <h5 className="insight-card-title">
                  {item.label || `Short ${i + 1}`}
                </h5>
                <CopyButton text={item.text} />
              </div>
              <p className="copy-block-text copy-block-text-compact">
                {item.text}
              </p>
            </div>
          ))}
        </CollapsibleInsightSection>
      ) : null}

      {copySet.medium_primary_texts.length > 0 ? (
        <CollapsibleInsightSection
          title={`Medium primary texts (${copySet.medium_primary_texts.length})`}
          defaultCollapsed={isLegacyLargeMediumTexts}
        >
          {copySet.medium_primary_texts.map((item, i) => (
            <div key={i} className="insight-card insight-card-compact">
              <div className="copy-block-head">
                <h5 className="insight-card-title">
                  {item.label || `Medium ${i + 1}`}
                </h5>
                <CopyButton text={item.text} />
              </div>
              <p className="copy-block-text copy-block-text-compact">
                {item.text}
              </p>
            </div>
          ))}
        </CollapsibleInsightSection>
      ) : null}

      {copySet.headlines.length > 0 ? (
        <CollapsibleInsightSection
          title={`Headlines (${copySet.headlines.length})`}
          defaultCollapsed={isLegacyLargeHeadlines}
        >
          <ul className="copy-list">
            {copySet.headlines.map((item, i) => (
              <li key={i} className="copy-list-item">
                <span>{item.text}</span>
                <CopyButton text={item.text} label="Copy" />
              </li>
            ))}
          </ul>
        </CollapsibleInsightSection>
      ) : null}

      {copySet.descriptions.length > 0 ? (
        <CollapsibleInsightSection
          title={`Descriptions (${copySet.descriptions.length})`}
        >
          <ul className="copy-list">
            {copySet.descriptions.map((item, i) => (
              <li key={i} className="copy-list-item">
                <span>{item.text}</span>
                <CopyButton text={item.text} label="Copy" />
              </li>
            ))}
          </ul>
        </CollapsibleInsightSection>
      ) : null}

      {copySet.hooks.length > 0 ? (
        <CollapsibleInsightSection
          title={`Hooks (${copySet.hooks.length})`}
          defaultCollapsed={isLegacyLargeHooks}
        >
          <ul className="copy-list">
            {copySet.hooks.map((hook, i) => (
              <li key={i} className="copy-list-item copy-list-item-hook">
                <span>“{hook.text}”</span>
                <CopyButton text={hook.text} label="Copy" />
              </li>
            ))}
          </ul>
        </CollapsibleInsightSection>
      ) : null}

      {hasLegacyHookTransitions ? (
        <CollapsibleInsightSection
          title={`Hook transitions (${copySet.hook_transitions.length})`}
          defaultCollapsed
        >
          {copySet.hook_transitions.map((transition, i) => (
            <div key={i} className="insight-card insight-card-compact">
              <div className="copy-block-head">
                <h5 className="insight-card-title">Hook: {transition.hook}</h5>
                <CopyButton text={transition.transition_paragraph} />
              </div>
              <p className="copy-block-text">{transition.transition_paragraph}</p>
            </div>
          ))}
        </CollapsibleInsightSection>
      ) : null}

      {copySet.callouts.length > 0 ? (
        <CollapsibleInsightSection title={`Callouts (${copySet.callouts.length})`}>
          <ul className="copy-list">
            {copySet.callouts.map((callout, i) => (
              <li key={i} className="copy-list-item">
                <span>
                  <span className="meta-chip">{callout.use_case}</span>{" "}
                  {callout.text}
                </span>
                <CopyButton text={callout.text} label="Copy" />
              </li>
            ))}
          </ul>
        </CollapsibleInsightSection>
      ) : null}

      {copySet.compliance_notes.length > 0 ? (
        <CollapsibleInsightSection
          title={`Compliance (${copySet.compliance_notes.length})`}
        >
          {copySet.compliance_notes.map((note, i) => (
            <div key={i} className="insight-card insight-card-warning insight-card-compact">
              <h5 className="insight-card-title">{note.risk}</h5>
              <p className="insight-text">
                <strong>Safer:</strong> {note.safer_direction}
              </p>
            </div>
          ))}
        </CollapsibleInsightSection>
      ) : null}
    </div>
  );
}

function formatImagePromptForCopy(prompt: {
  concept_name: string;
  aspect_ratio: string;
  prompt: string;
  overlay_text: string;
  style_notes: string;
}): string {
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

function formatUgcScriptForCopy(script: {
  script_name: string;
  duration: string;
  hook: string;
  script: string;
  shot_list: string[];
  caption: string;
}): string {
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

interface CreativePromptsDisplayProps {
  promptSet: CreativePromptSet;
}

function CreativePromptsDisplay({ promptSet }: CreativePromptsDisplayProps) {
  return (
    <div className="copy-set creative-prompt-set">
      <div className="copy-set-head">
        <h6 className="angle-list-title">Creative prompt pack</h6>
        <span className="insight-date">
          {new Date(promptSet.created_at).toLocaleString()}
        </span>
      </div>

      {promptSet.creative_concepts.length > 0 ? (
        <CollapsibleInsightSection
          title={`Creative concepts (${promptSet.creative_concepts.length})`}
        >
          {promptSet.creative_concepts.map((concept, i) => (
            <div key={i} className="insight-card insight-card-compact">
              <h5 className="insight-card-title">{concept.concept_name}</h5>
              <p className="insight-text">
                <span className="meta-chip">{concept.format}</span>{" "}
                <span className="meta-chip">{concept.recommended_use}</span>
              </p>
              <p className="insight-text">
                <strong>Core idea:</strong> {concept.core_idea}
              </p>
              <p className="insight-text">
                <strong>Why it matches:</strong>{" "}
                {concept.why_it_matches_the_angle}
              </p>
              <p className="insight-text">
                <strong>Visual hook:</strong> {concept.visual_hook}
              </p>
            </div>
          ))}
        </CollapsibleInsightSection>
      ) : null}

      {promptSet.image_prompts.length > 0 ? (
        <CollapsibleInsightSection
          title={`Image prompts (${promptSet.image_prompts.length})`}
        >
          {promptSet.image_prompts.map((item, i) => (
            <div key={i} className="insight-card insight-card-compact">
              <div className="copy-block-head">
                <h5 className="insight-card-title">
                  {item.concept_name}{" "}
                  <span className="meta-chip">{item.aspect_ratio}</span>
                </h5>
                <CopyButton text={formatImagePromptForCopy(item)} />
              </div>
              <p className="copy-block-text">{item.prompt}</p>
              {item.overlay_text ? (
                <p className="insight-text">
                  <strong>Overlay:</strong> {item.overlay_text}
                </p>
              ) : null}
              {item.style_notes ? (
                <p className="insight-text">
                  <strong>Style:</strong> {item.style_notes}
                </p>
              ) : null}
            </div>
          ))}
        </CollapsibleInsightSection>
      ) : null}

      {promptSet.ugc_scripts.length > 0 ? (
        <CollapsibleInsightSection
          title={`UGC scripts (${promptSet.ugc_scripts.length})`}
        >
          {promptSet.ugc_scripts.map((script, i) => (
            <div key={i} className="insight-card insight-card-compact">
              <div className="copy-block-head">
                <h5 className="insight-card-title">
                  {script.script_name}{" "}
                  <span className="meta-chip">{script.duration}</span>
                </h5>
                <CopyButton text={formatUgcScriptForCopy(script)} />
              </div>
              <p className="insight-text">
                <strong>Hook:</strong> {script.hook}
              </p>
              <p className="copy-block-text">{script.script}</p>
              {script.shot_list.length > 0 ? (
                <ul className="bullet-list">
                  {script.shot_list.map((shot, j) => (
                    <li key={j}>{shot}</li>
                  ))}
                </ul>
              ) : null}
              {script.caption ? (
                <p className="insight-text">
                  <strong>Caption:</strong> {script.caption}
                </p>
              ) : null}
            </div>
          ))}
        </CollapsibleInsightSection>
      ) : null}

      {promptSet.overlay_texts.length > 0 ? (
        <CollapsibleInsightSection
          title={`Overlay texts (${promptSet.overlay_texts.length})`}
        >
          <ul className="copy-list">
            {promptSet.overlay_texts.map((item, i) => (
              <li key={i} className="copy-list-item">
                <span>
                  <span className="meta-chip">{item.use_case}</span> {item.text}
                </span>
                <CopyButton text={item.text} label="Copy" />
              </li>
            ))}
          </ul>
        </CollapsibleInsightSection>
      ) : null}

      {promptSet.negative_prompts.length > 0 ? (
        <CollapsibleInsightSection title="Negative prompts">
          <ul className="bullet-list">
            {promptSet.negative_prompts.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </CollapsibleInsightSection>
      ) : null}

      {promptSet.compliance_notes.length > 0 ? (
        <CollapsibleInsightSection
          title={`Compliance (${promptSet.compliance_notes.length})`}
        >
          {promptSet.compliance_notes.map((note, i) => (
            <div
              key={i}
              className="insight-card insight-card-warning insight-card-compact"
            >
              <h5 className="insight-card-title">{note.risk}</h5>
              <p className="insight-text">
                <strong>Safer:</strong> {note.safer_direction}
              </p>
            </div>
          ))}
        </CollapsibleInsightSection>
      ) : null}
    </div>
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
