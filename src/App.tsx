import { useEffect, useState } from "react";
import {
  fetchAdCandidates,
  fetchLatestCustomerAvatar,
  fetchLatestInsight,
  fetchAdCopySets,
  fetchCreativePromptSets,
  fetchDesireConceptSets,
  fetchMassDesires,
  fetchMarketingAngles,
  fetchLatestResearchSources,
  fetchProjects,
  insertProject,
  isSupabaseConfigured,
} from "./lib/supabase";
import type {
  AdCandidate,
  AdCandidatePatch,
  AdCopySet,
  AngleReviewPatch,
  CreativePromptSet,
  CustomerAvatarOutput,
  GenerateAnglesResponse,
  GenerateAvatarResponse,
  GenerateCopyResponse,
  FixImageFilenameResponse,
  UpdateCopyResponse,
  RegenerateCopyResponse,
  RegenerateMode,
  AdVariation,
  DesireConceptSet,
  GenerateCreativePromptsResponse,
  GenerateDesiresResponse,
  GenerateInsightResponse,
  GenerateTofConceptsResponse,
  MarketingAngle,
  MassDesire,
  ProductProject,
  ProductProjectInput,
  ResearchInsight,
  ResearchSource,
  RunResearchResponse,
  UpdateAngleReviewResponse,
  UpsertAdCandidateResponse,
} from "./types";
import { AppShell } from "./components/AppShell";
import { CopyPackModal } from "./components/CopyPackModal";
import { TofConceptModal } from "./components/TofConceptModal";
import { flattenFinalAds } from "./lib/finalAds";
import type { ModeStatus, WorkflowMode } from "./components/workflow";

const API_BASE = "http://localhost:3001";

const EMPTY_FORM: ProductProjectInput = {
  our_product_name: "",
  supplier_product_url: "",
  supplier_product_description: "",
  primary_competitor_url: "",
  additional_competitor_urls: "",
  closest_competitor_product_description: "",
  target_country: "",
  cost_price_including_shipping: "",
  planned_sale_price: "",
  current_offer: "",
  initial_problem_hypothesis: "",
  initial_customer_hypothesis: "",
  preferred_tone: "",
};

const SAMPLE_PROJECTS: ProductProject[] = [
  {
    id: "sample-1",
    our_product_name: "PostureFix Pro",
    supplier_product_url: "https://supplier.example.com/posture-corrector",
    supplier_product_description:
      "An adjustable posture corrector brace that gently pulls the shoulders back to retrain alignment over time. Breathable, lightweight, and worn under clothing.",
    primary_competitor_url: "https://example.com/posture-corrector",
    additional_competitor_urls: "",
    closest_competitor_product_description:
      "A neoprene posture support brace marketed for desk workers with adjustable straps.",
    target_country: "United States",
    cost_price_including_shipping: "$11.50",
    planned_sale_price: "$39.99",
    current_offer: "Buy 1 Get 1 50% off + free shipping",
    initial_problem_hypothesis: "Chronic slouching and back pain from sitting all day",
    initial_customer_hypothesis:
      "Office workers aged 30-55 with back and neck pain",
    preferred_tone: "Confident, supportive, science-aware",
    created_at: "2026-06-01T09:00:00.000Z",
  },
  {
    id: "sample-2",
    our_product_name: "AquaGlow LED Mirror",
    supplier_product_url: "https://supplier.example.com/led-mirror",
    supplier_product_description:
      "A rechargeable LED vanity mirror with adjustable warm-to-cool lighting and touch dimming. Cordless and portable for makeup and skincare routines.",
    primary_competitor_url: "https://example.com/led-mirror",
    additional_competitor_urls: "",
    closest_competitor_product_description:
      "A ring-light vanity mirror with three light modes sold for makeup application.",
    target_country: "United Kingdom",
    cost_price_including_shipping: "£8.20",
    planned_sale_price: "£29.95",
    current_offer: "20% off launch discount",
    initial_problem_hypothesis: "Poor bathroom lighting makes makeup application uneven",
    initial_customer_hypothesis: "Women aged 18-40 into beauty and skincare",
    preferred_tone: "Aesthetic, aspirational, clean",
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
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(
    null
  );

  // Workflow-mode command-centre UI state.
  const [mode, setMode] = useState<WorkflowMode>("setup");

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
  const [copyModal, setCopyModal] = useState<{
    copySet: AdCopySet;
    angleName: string;
    massDesire: string;
    offer: string;
    product: string;
  } | null>(null);

  const [conceptSetsByProject, setConceptSetsByProject] = useState<
    Record<string, DesireConceptSet[]>
  >({});
  const [generatingTofDesireId, setGeneratingTofDesireId] = useState<
    string | null
  >(null);
  const [tofError, setTofError] = useState<string | null>(null);
  const [tofModal, setTofModal] = useState<{
    conceptSet: DesireConceptSet;
    desireTitle: string;
    offer: string;
    product: string;
  } | null>(null);

  const [creativePromptSetsByProject, setCreativePromptSetsByProject] =
    useState<Record<string, CreativePromptSet[]>>({});
  const [generatingCreativePromptAngleId, setGeneratingCreativePromptAngleId] =
    useState<string | null>(null);
  const [creativePromptError, setCreativePromptError] = useState<string | null>(
    null
  );

  const [reviewError, setReviewError] = useState<string | null>(null);
  const [savingReviewAngleId, setSavingReviewAngleId] = useState<string | null>(
    null
  );

  const [adCandidatesByProject, setAdCandidatesByProject] = useState<
    Record<string, AdCandidate[]>
  >({});
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [savingCandidateAngleId, setSavingCandidateAngleId] = useState<
    string | null
  >(null);
  const [savingCandidateId, setSavingCandidateId] = useState<string | null>(
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
  // page refresh. Cached per project so we never refetch or clobber results.
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

  // Load the latest persisted insight report for the selected project.
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
      selectedId in creativePromptSetsByProject &&
      selectedId in conceptSetsByProject &&
      selectedId in adCandidatesByProject
    ) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setDesiresLoadingId(selectedId);
      setDesiresError(null);
      setAnglesError(null);
      setCopyError(null);
      setTofError(null);
      setCreativePromptError(null);
      setCandidateError(null);
      try {
        const [
          desires,
          angles,
          copySets,
          conceptSets,
          creativePromptSets,
          adCandidates,
        ] = await Promise.all([
          fetchMassDesires(selectedId),
          fetchMarketingAngles(selectedId),
          fetchAdCopySets(selectedId),
          fetchDesireConceptSets(selectedId),
          fetchCreativePromptSets(selectedId),
          fetchAdCandidates(selectedId),
        ]);
        if (cancelled) return;
        setDesiresByProject((prev) => ({ ...prev, [selectedId]: desires }));
        setAnglesByProject((prev) => ({ ...prev, [selectedId]: angles }));
        setCopySetsByProject((prev) => ({ ...prev, [selectedId]: copySets }));
        setConceptSetsByProject((prev) => ({
          ...prev,
          [selectedId]: conceptSets,
        }));
        setCreativePromptSetsByProject((prev) => ({
          ...prev,
          [selectedId]: creativePromptSets,
        }));
        setAdCandidatesByProject((prev) => ({
          ...prev,
          [selectedId]: adCandidates,
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
    conceptSetsByProject,
    creativePromptSetsByProject,
    adCandidatesByProject,
  ]);

  function updateField<K extends keyof ProductProjectInput>(
    key: K,
    value: ProductProjectInput[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSelectProject(id: string) {
    setSelectedId(id);
  }

  async function handleCreateProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);
    setError(null);

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

  const DELETE_CONFIRM_MESSAGE =
    "Are you sure you want to delete this project? This will permanently delete " +
    "the project and all related research, insights, angles, copy, creative " +
    "prompts, and ad selections. This cannot be undone.";

  function forgetProjectData(projectId: string) {
    const drop = <T,>(prev: Record<string, T>): Record<string, T> => {
      if (!(projectId in prev)) return prev;
      const next = { ...prev };
      delete next[projectId];
      return next;
    };
    setResearchByProject(drop);
    setInsightByProject(drop);
    setAvatarByProject(drop);
    setDesiresByProject(drop);
    setAnglesByProject(drop);
    setCopySetsByProject(drop);
    setCreativePromptSetsByProject(drop);
    setAdCandidatesByProject(drop);
  }

  async function handleDeleteProject(projectId: string) {
    if (!projectId) return;
    if (!window.confirm(DELETE_CONFIRM_MESSAGE)) return;

    setStatusMessage(null);
    setError(null);
    setDeletingProjectId(projectId);

    const finishLocalCleanup = () => {
      setProjects((prev) => {
        const remaining = prev.filter((p) => p.id !== projectId);
        setSelectedId((current) =>
          current === projectId ? remaining[0]?.id ?? null : current
        );
        return remaining;
      });
      forgetProjectData(projectId);
    };

    // Local-only mode (no Supabase): just drop it from memory.
    if (!isSupabaseConfigured) {
      finishLocalCleanup();
      setDeletingProjectId(null);
      setStatusMessage("Project deleted.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}`, {
        method: "DELETE",
      });

      const payload: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error: unknown }).error)
            : `Delete failed (HTTP ${res.status}).`;
        throw new Error(message);
      }

      finishLocalCleanup();
      setStatusMessage("Project deleted.");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? `Failed to delete project: ${err.message}`
          : "Failed to delete project."
      );
    } finally {
      setDeletingProjectId((current) =>
        current === projectId ? null : current
      );
    }
  }

  async function handleRunResearch(projectId: string) {
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
      setResearchError(err instanceof Error ? err.message : "Research failed.");
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

  function openCopyPack(copySet: AdCopySet, angleName: string) {
    const project = projects.find((p) => p.id === copySet.project_id);
    const desire = (desiresByProject[copySet.project_id] ?? []).find(
      (d) => d.id === copySet.mass_desire_id
    );
    setCopyModal({
      copySet,
      angleName,
      massDesire: desire?.desire_statement ?? "",
      offer: project?.current_offer ?? "",
      product: project?.our_product_name ?? "",
    });
  }

  function openTofConcepts(conceptSet: DesireConceptSet) {
    const project = projects.find((p) => p.id === conceptSet.project_id);
    setTofModal({
      conceptSet,
      desireTitle: conceptSet.source_desire_title,
      offer: project?.current_offer ?? "",
      product: project?.our_product_name ?? "",
    });
  }

  async function handleGenerateTofConcepts(
    projectId: string,
    massDesireId: string
  ) {
    setStatusMessage(null);
    setTofError(null);
    setGeneratingTofDesireId(massDesireId);

    try {
      const res = await fetch(`${API_BASE}/api/tof-concepts/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, massDesireId }),
      });

      const payload: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error: unknown }).error)
            : `TOF concept generation failed (HTTP ${res.status}).`;
        throw new Error(message);
      }

      const data = payload as GenerateTofConceptsResponse;
      setConceptSetsByProject((prev) => {
        const existing = prev[projectId] ?? [];
        const filtered = existing.filter(
          (set) => set.mass_desire_id !== massDesireId
        );
        return {
          ...prev,
          [projectId]: [data.conceptSet, ...filtered],
        };
      });
      openTofConcepts(data.conceptSet);
      setStatusMessage("Top of funnel concepts generated.");
    } catch (err: unknown) {
      setTofError(
        err instanceof Error ? err.message : "TOF concept generation failed."
      );
    } finally {
      setGeneratingTofDesireId((current) =>
        current === massDesireId ? null : current
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
      const generatedAngle = (anglesByProject[projectId] ?? []).find(
        (a) => a.id === marketingAngleId
      );
      openCopyPack(
        data.copySet,
        generatedAngle?.angle_name ?? "Marketing angle"
      );
      setStatusMessage("Copy pack generated.");
    } catch (err: unknown) {
      setCopyError(err instanceof Error ? err.message : "Ad copy failed.");
    } finally {
      setGeneratingCopyAngleId((current) =>
        current === marketingAngleId ? null : current
      );
    }
  }

  async function handleSaveCopyPack(
    copySet: AdCopySet,
    adVariations: AdVariation[]
  ): Promise<AdCopySet> {
    const res = await fetch(`${API_BASE}/api/copy/${copySet.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ad_variations: adVariations }),
    });

    const payload: unknown = await res.json().catch(() => null);

    if (!res.ok) {
      const message =
        payload && typeof payload === "object" && "error" in payload
          ? String((payload as { error: unknown }).error)
          : `Failed to save copy pack (HTTP ${res.status}).`;
      throw new Error(message);
    }

    const updated = (payload as UpdateCopyResponse).copySet;

    setCopySetsByProject((prev) => {
      const existing = prev[updated.project_id] ?? [];
      const next = existing.map((set) =>
        set.id === updated.id ? updated : set
      );
      return { ...prev, [updated.project_id]: next };
    });
    setCopyModal((current) =>
      current && current.copySet.id === updated.id
        ? { ...current, copySet: updated }
        : current
    );

    return updated;
  }

  async function handleFixImageFilename(
    copySetId: string,
    adIndex: number,
    safeFilename: string
  ): Promise<AdCopySet> {
    const res = await fetch(`${API_BASE}/api/copy/${copySetId}/fix-image-filename`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adIndex, safeFilename }),
    });

    const payload: unknown = await res.json().catch(() => null);

    if (!res.ok) {
      const message =
        payload && typeof payload === "object" && "error" in payload
          ? String((payload as { error: unknown }).error)
          : "Could not update filename. The image is still available.";
      throw new Error(message);
    }

    const updated = (payload as FixImageFilenameResponse).copySet;

    setCopySetsByProject((prev) => {
      const existing = prev[updated.project_id] ?? [];
      const next = existing.map((set) =>
        set.id === updated.id ? updated : set
      );
      return { ...prev, [updated.project_id]: next };
    });
    setCopyModal((current) =>
      current && current.copySet.id === updated.id
        ? { ...current, copySet: updated }
        : current
    );

    return updated;
  }

  async function handleRegenerateAd(
    copySet: AdCopySet,
    adIndex: number,
    mode: RegenerateMode
  ): Promise<AdCopySet> {
    const res = await fetch(`${API_BASE}/api/copy/${copySet.id}/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ad_index: adIndex, mode }),
    });

    const payload: unknown = await res.json().catch(() => null);

    if (!res.ok) {
      const message =
        payload && typeof payload === "object" && "error" in payload
          ? String((payload as { error: unknown }).error)
          : `Failed to regenerate (HTTP ${res.status}).`;
      throw new Error(message);
    }

    const updated = (payload as RegenerateCopyResponse).copySet;

    setCopySetsByProject((prev) => {
      const existing = prev[updated.project_id] ?? [];
      const next = existing.map((set) =>
        set.id === updated.id ? updated : set
      );
      return { ...prev, [updated.project_id]: next };
    });
    setCopyModal((current) =>
      current && current.copySet.id === updated.id
        ? { ...current, copySet: updated }
        : current
    );

    return updated;
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

  async function handleUpdateAngleReview(
    projectId: string,
    angleId: string,
    updates: AngleReviewPatch
  ) {
    setReviewError(null);
    setSavingReviewAngleId(angleId);

    try {
      const res = await fetch(`${API_BASE}/api/angles/${angleId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const payload: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error: unknown }).error)
            : `Angle review update failed (HTTP ${res.status}).`;
        throw new Error(message);
      }

      const data = payload as UpdateAngleReviewResponse;
      setAnglesByProject((prev) => ({
        ...prev,
        [projectId]: (prev[projectId] ?? []).map((angle) =>
          angle.id === angleId ? data.angle : angle
        ),
      }));
    } catch (err: unknown) {
      setReviewError(
        err instanceof Error ? err.message : "Angle review update failed."
      );
    } finally {
      setSavingReviewAngleId((current) =>
        current === angleId ? null : current
      );
    }
  }

  function applyCandidate(projectId: string, candidate: AdCandidate) {
    setAdCandidatesByProject((prev) => {
      const existing = prev[projectId] ?? [];
      const index = existing.findIndex((c) => c.id === candidate.id);
      const next =
        index === -1
          ? [...existing, candidate]
          : existing.map((c) => (c.id === candidate.id ? candidate : c));
      next.sort((a, b) => (a.ad_number ?? 0) - (b.ad_number ?? 0));
      return { ...prev, [projectId]: next };
    });
  }

  async function handleUpsertCandidate(
    projectId: string,
    marketingAngleId: string,
    patch: AdCandidatePatch
  ) {
    setCandidateError(null);
    setSavingCandidateAngleId(marketingAngleId);

    try {
      const res = await fetch(`${API_BASE}/api/ad-candidates/upsert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, marketingAngleId, ...patch }),
      });

      const payload: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error: unknown }).error)
            : `Ad candidate save failed (HTTP ${res.status}).`;
        throw new Error(message);
      }

      const data = payload as UpsertAdCandidateResponse;
      applyCandidate(projectId, data.candidate);
    } catch (err: unknown) {
      setCandidateError(
        err instanceof Error ? err.message : "Ad candidate save failed."
      );
    } finally {
      setSavingCandidateAngleId((current) =>
        current === marketingAngleId ? null : current
      );
    }
  }

  async function handlePatchCandidate(
    projectId: string,
    candidateId: string,
    patch: AdCandidatePatch
  ) {
    setCandidateError(null);
    setSavingCandidateId(candidateId);

    try {
      const res = await fetch(`${API_BASE}/api/ad-candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const payload: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error: unknown }).error)
            : `Ad candidate update failed (HTTP ${res.status}).`;
        throw new Error(message);
      }

      const data = payload as UpsertAdCandidateResponse;
      applyCandidate(projectId, data.candidate);
    } catch (err: unknown) {
      setCandidateError(
        err instanceof Error ? err.message : "Ad candidate update failed."
      );
    } finally {
      setSavingCandidateId((current) =>
        current === candidateId ? null : current
      );
    }
  }

  // Derived per-project data for the selected project.
  const sources = selectedId ? researchByProject[selectedId] ?? [] : [];
  const insight = selectedId ? insightByProject[selectedId] ?? null : null;
  const avatar = selectedId ? avatarByProject[selectedId] ?? null : null;
  const desires = selectedId ? desiresByProject[selectedId] ?? [] : [];
  const angles = selectedId ? anglesByProject[selectedId] ?? [] : [];
  const copySets = selectedId ? copySetsByProject[selectedId] ?? [] : [];
  const conceptSets = selectedId
    ? conceptSetsByProject[selectedId] ?? []
    : [];
  const creativePromptSets = selectedId
    ? creativePromptSetsByProject[selectedId] ?? []
    : [];
  const adCandidates = selectedId
    ? adCandidatesByProject[selectedId] ?? []
    : [];

  const finalAdCount = flattenFinalAds(desires, angles, copySets).length;

  const statuses: Record<WorkflowMode, ModeStatus> = {
    setup: selectedProject ? "done" : "missing",
    research: sources.length > 0 ? "done" : "missing",
    insight_report: insight
      ? "done"
      : sources.length > 0
        ? "ready"
        : "missing",
    avatar: avatar ? "done" : insight ? "ready" : "missing",
    strategy:
      desires.length > 0 && angles.length > 0
        ? "done"
        : insight
          ? "ready"
          : "missing",
    ads: finalAdCount > 0 ? "done" : copySets.length > 0 ? "ready" : "missing",
    additional:
      copySets.length > 0 || creativePromptSets.length > 0 ? "ready" : "missing",
  };

  const shell = (
    <AppShell
      projects={projects}
      selectedId={selectedId}
      selectedProject={selectedProject}
      isProjectsLoading={isLoading}
      onSelectProject={handleSelectProject}
      deletingProjectId={deletingProjectId}
      onDeleteProject={(id) => void handleDeleteProject(id)}
      form={form}
      onUpdateField={updateField}
      onCreateProject={handleCreateProject}
      isCreating={isCreating}
      createError={error}
      mode={mode}
      onChangeMode={setMode}
      statuses={statuses}
      statusMessage={statusMessage}
      sources={sources}
      insight={insight}
      avatar={avatar}
      desires={desires}
      angles={angles}
      copySets={copySets}
      conceptSets={conceptSets}
      creativePromptSets={creativePromptSets}
      adCandidates={adCandidates}
      isResearching={researchingId === selectedId}
      isSourcesLoading={sourcesLoadingId === selectedId}
      researchError={researchError}
      isGeneratingInsight={generatingInsightId === selectedId}
      isInsightLoading={insightLoadingId === selectedId}
      insightError={insightError}
      isGeneratingAvatar={generatingAvatarId === selectedId}
      isAvatarLoading={avatarLoadingId === selectedId}
      avatarError={avatarError}
      isGeneratingDesires={generatingDesiresId === selectedId}
      isGeneratingAngles={generatingAnglesId === selectedId}
      isDesiresLoading={desiresLoadingId === selectedId}
      desiresError={desiresError}
      anglesError={anglesError}
      generatingCopyAngleId={generatingCopyAngleId}
      copyError={copyError}
      generatingTofDesireId={generatingTofDesireId}
      tofError={tofError}
      generatingCreativePromptAngleId={generatingCreativePromptAngleId}
      creativePromptError={creativePromptError}
      savingReviewAngleId={savingReviewAngleId}
      reviewError={reviewError}
      candidateError={candidateError}
      savingCandidateAngleId={savingCandidateAngleId}
      savingCandidateId={savingCandidateId}
      onRunResearch={() => {
        if (selectedProject) void handleRunResearch(selectedProject.id);
      }}
      onGenerateInsight={() => {
        if (selectedProject) void handleGenerateInsight(selectedProject.id);
      }}
      onGenerateAvatar={() => {
        if (selectedProject) void handleGenerateAvatar(selectedProject.id);
      }}
      onGenerateDesires={() => {
        if (selectedProject) void handleGenerateDesires(selectedProject.id);
      }}
      onGenerateAngles={() => {
        if (selectedProject) void handleGenerateAngles(selectedProject.id);
      }}
      onGenerateCopy={(angleId) => {
        if (selectedProject)
          void handleGenerateCopy(selectedProject.id, angleId);
      }}
      onGenerateTofConcepts={(desireId) => {
        if (selectedProject)
          void handleGenerateTofConcepts(selectedProject.id, desireId);
      }}
      onOpenTofConcepts={openTofConcepts}
      onGenerateCreativePrompts={(angleId, adCopySetId) => {
        if (selectedProject)
          void handleGenerateCreativePrompts(
            selectedProject.id,
            angleId,
            adCopySetId
          );
      }}
      onUpdateAngleReview={(angleId, updates) => {
        if (selectedProject)
          void handleUpdateAngleReview(selectedProject.id, angleId, updates);
      }}
      onUpsertCandidate={(angleId, patch) => {
        if (selectedProject)
          void handleUpsertCandidate(selectedProject.id, angleId, patch);
      }}
      onPatchCandidate={(id, patch) => {
        if (selectedProject)
          void handlePatchCandidate(selectedProject.id, id, patch);
      }}
      onOpenCopyPack={(copySet, angleName) =>
        openCopyPack(copySet, angleName)
      }
      onFixImageFilename={handleFixImageFilename}
    />
  );

  return (
    <>
      {shell}
      {copyModal ? (
        <CopyPackModal
          key={copyModal.copySet.id}
          copySet={copyModal.copySet}
          angleName={copyModal.angleName}
          desires={desires}
          angles={angles}
          massDesire={copyModal.massDesire}
          offer={copyModal.offer}
          product={copyModal.product}
          onSave={handleSaveCopyPack}
          onRegenerate={handleRegenerateAd}
          onClose={() => setCopyModal(null)}
        />
      ) : null}
      {tofModal ? (
        <TofConceptModal
          key={tofModal.conceptSet.id}
          conceptSet={tofModal.conceptSet}
          desireTitle={tofModal.desireTitle}
          offer={tofModal.offer}
          product={tofModal.product}
          onClose={() => setTofModal(null)}
        />
      ) : null}
    </>
  );
}

export default App;
