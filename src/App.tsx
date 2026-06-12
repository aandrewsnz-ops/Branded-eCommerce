import { useState } from "react";
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
} from "lucide-react";
import type {
  ProductProject,
  ProductProjectInput,
  WorkflowStage,
} from "./types";

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
  const [projects, setProjects] = useState<ProductProject[]>(SAMPLE_PROJECTS);
  const [selectedId, setSelectedId] = useState<string | null>(
    SAMPLE_PROJECTS[0]?.id ?? null
  );
  const [form, setForm] = useState<ProductProjectInput>(EMPTY_FORM);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const selectedProject =
    projects.find((project) => project.id === selectedId) ?? null;

  function updateField<K extends keyof ProductProjectInput>(
    key: K,
    value: ProductProjectInput[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCreateProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const newProject: ProductProject = {
      ...form,
      id: createId(),
      created_at: new Date().toISOString(),
    };
    setProjects((prev) => [newProject, ...prev]);
    setSelectedId(newProject.id);
    setForm(EMPTY_FORM);
    setStatusMessage(null);
  }

  function handleRunStage(stage: WorkflowStage) {
    setStatusMessage(`${stage.label} coming next`);
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

            <button type="submit" className="btn btn-primary">
              <Plus size={16} strokeWidth={2.5} />
              Create project
            </button>
          </form>
        </aside>

        <section className="panel detail-panel">
          {selectedProject ? (
            <ProjectDetail
              project={selectedProject}
              statusMessage={statusMessage}
              onRunStage={handleRunStage}
            />
          ) : (
            <div className="empty-state">
              <Boxes size={40} strokeWidth={1.5} />
              <p>Select a project or create a new one to begin.</p>
            </div>
          )}
        </section>

        <aside className="panel list-panel">
          <div className="panel-head">
            <h2 className="panel-title">Projects</h2>
            <span className="count-badge">{projects.length}</span>
          </div>
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
        </aside>
      </main>
    </div>
  );
}

interface ProjectDetailProps {
  project: ProductProject;
  statusMessage: string | null;
  onRunStage: (stage: WorkflowStage) => void;
}

function ProjectDetail({
  project,
  statusMessage,
  onRunStage,
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
            return (
              <button
                key={stage.id}
                type="button"
                className="stage-btn"
                onClick={() => onRunStage(stage)}
              >
                <span className="stage-index">{index + 1}</span>
                <Icon size={16} strokeWidth={2} />
                <span className="stage-label">{stage.label}</span>
              </button>
            );
          })}
        </div>
      </div>
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
