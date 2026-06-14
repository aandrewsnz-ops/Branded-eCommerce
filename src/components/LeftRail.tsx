import { useState } from "react";
import {
  AlertTriangle,
  Boxes,
  Globe,
  Loader2,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import type { ProductProject, ProductProjectInput, ProjectAiUsageSummary, ProjectAiCostTotal } from "../types";
import type { ModeStatus, WorkflowMode } from "./workflow";
import { WorkflowNav } from "./WorkflowNav";
import { formatAiCost } from "../lib/aiUsageFormat";

interface LeftRailProps {
  projects: ProductProject[];
  selectedId: string | null;
  selectedProject: ProductProject | null;
  isLoading: boolean;
  onSelectProject: (id: string) => void;
  deletingProjectId: string | null;
  onDeleteProject: (id: string) => void;

  mode: WorkflowMode;
  statuses: Record<WorkflowMode, ModeStatus>;
  onChangeMode: (mode: WorkflowMode) => void;

  form: ProductProjectInput;
  onUpdateField: <K extends keyof ProductProjectInput>(
    key: K,
    value: ProductProjectInput[K]
  ) => void;
  onCreateProject: (event: React.FormEvent<HTMLFormElement>) => void;
  isCreating: boolean;
  createError: string | null;

  projectAiUsage: ProjectAiUsageSummary | null;
  projectCostById: Record<string, ProjectAiCostTotal>;
}

const BRIEF_FIELDS: {
  key: keyof ProductProjectInput;
  label: string;
  multiline?: boolean;
}[] = [
  { key: "our_product_name", label: "Our product name" },
  { key: "supplier_product_url", label: "Supplier product URL" },
  {
    key: "supplier_product_description",
    label: "Supplier product description",
    multiline: true,
  },
  { key: "primary_competitor_url", label: "Primary competitor URL" },
  {
    key: "additional_competitor_urls",
    label: "Additional competitor URLs",
    multiline: true,
  },
  {
    key: "closest_competitor_product_description",
    label: "Closest competitor product description",
    multiline: true,
  },
  { key: "target_country", label: "Target country" },
  {
    key: "cost_price_including_shipping",
    label: "Cost price including shipping",
  },
  { key: "planned_sale_price", label: "Planned sale price" },
  { key: "current_offer", label: "Current offer (optional)" },
  {
    key: "initial_problem_hypothesis",
    label: "Initial problem hypothesis (optional)",
    multiline: true,
  },
  {
    key: "initial_customer_hypothesis",
    label: "Initial customer hypothesis (optional)",
    multiline: true,
  },
  { key: "preferred_tone", label: "Preferred tone (optional)" },
];

export function LeftRail({
  projects,
  selectedId,
  selectedProject,
  isLoading,
  onSelectProject,
  deletingProjectId,
  onDeleteProject,
  mode,
  statuses,
  onChangeMode,
  form,
  onUpdateField,
  onCreateProject,
  isCreating,
  createError,
  projectAiUsage,
  projectCostById,
}: LeftRailProps) {
  const [showForm, setShowForm] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    onCreateProject(event);
    setShowForm(false);
  }

  return (
    <aside className="rail">
      <div className="rail-brand">
        <span className="brand-mark">
          <Boxes size={20} strokeWidth={2} />
        </span>
        <div>
          <h1 className="brand-name">Branded eCommerce</h1>
          <p className="brand-subtitle">Research command centre</p>
        </div>
      </div>

      <div className="rail-section">
        <div className="rail-section-head">
          <h2 className="rail-section-title">Projects</h2>
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => setShowForm((open) => !open)}
          >
            {showForm ? <X size={13} /> : <Plus size={13} />}
            {showForm ? "Close" : "New"}
          </button>
        </div>

        {showForm ? (
          <form className="brief-form" onSubmit={handleSubmit}>
            {createError ? (
              <div className="banner banner-error" role="alert">
                <AlertTriangle size={14} />
                <span>{createError}</span>
              </div>
            ) : null}
            {BRIEF_FIELDS.map((field) =>
              field.multiline ? (
                <label key={field.key} className="brief-field">
                  <span className="brief-field-label">{field.label}</span>
                  <textarea
                    className="brief-input"
                    rows={2}
                    value={form[field.key]}
                    onChange={(e) => onUpdateField(field.key, e.target.value)}
                  />
                </label>
              ) : (
                <label key={field.key} className="brief-field">
                  <span className="brief-field-label">{field.label}</span>
                  <input
                    className="brief-input"
                    value={form[field.key]}
                    onChange={(e) => onUpdateField(field.key, e.target.value)}
                  />
                </label>
              )
            )}
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isCreating}
            >
              {isCreating ? (
                <Loader2 size={14} strokeWidth={2.5} className="spin" />
              ) : (
                <Plus size={14} strokeWidth={2.5} />
              )}
              {isCreating ? "Creating…" : "Create project"}
            </button>
          </form>
        ) : null}

        {isLoading ? (
          <div className="list-state">
            <Loader2 size={14} strokeWidth={2} className="spin" />
            <span>Loading…</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="list-state">No projects yet.</div>
        ) : (
          <ul className="rail-project-list">
            {projects.map((project) => {
              const isDeleting = deletingProjectId === project.id;
              const aiCostLabel = formatAiCost(
                projectCostById[project.id]?.total_cost_usd
              );
              return (
                <li key={project.id} className="rail-project-li">
                  <button
                    type="button"
                    className={`rail-project-item${project.id === selectedId ? " is-active" : ""}`}
                    onClick={() => onSelectProject(project.id)}
                  >
                    <span className="rail-project-name">
                      {project.our_product_name || "Untitled project"}
                    </span>
                    <span className="rail-project-meta">
                      {project.target_country ? (
                        <span className="meta-chip">
                          <Globe size={11} />
                          {project.target_country}
                        </span>
                      ) : null}
                      {project.planned_sale_price ? (
                        <span className="meta-chip">
                          <Tag size={11} />
                          {project.planned_sale_price}
                        </span>
                      ) : null}
                      {aiCostLabel ? (
                        <span className="meta-chip meta-chip-ai">
                          AI {aiCostLabel}
                        </span>
                      ) : null}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="rail-project-delete"
                    title="Delete project"
                    aria-label="Delete project"
                    disabled={isDeleting}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteProject(project.id);
                    }}
                  >
                    {isDeleting ? (
                      <Loader2 size={13} strokeWidth={2.5} className="spin" />
                    ) : (
                      <Trash2 size={13} strokeWidth={2.5} />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selectedProject ? (
        <div className="rail-section">
          <h2 className="rail-section-title">Selected project</h2>
          <div className="rail-summary">
            <h3 className="rail-summary-name">
              {selectedProject.our_product_name || "Untitled project"}
            </h3>
            <RailSummaryRow
              label="Country"
              value={selectedProject.target_country}
            />
            <RailSummaryRow
              label="Customer hypothesis"
              value={selectedProject.initial_customer_hypothesis}
            />
            <RailSummaryRow
              label="Problem hypothesis"
              value={selectedProject.initial_problem_hypothesis}
            />
            <RailSummaryRow
              label="Sale price"
              value={selectedProject.planned_sale_price}
            />
            <RailSummaryRow
              label="AI cost"
              value={formatAiCost(projectAiUsage?.total_cost_usd, {
                showZero: true,
              })}
            />
          </div>
        </div>
      ) : null}

      <div className="rail-section rail-section-nav">
        <h2 className="rail-section-title">Workflow</h2>
        <WorkflowNav
          activeMode={mode}
          statuses={statuses}
          onChange={onChangeMode}
          projectAiUsage={projectAiUsage}
        />
      </div>
    </aside>
  );
}

function RailSummaryRow({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <p className="rail-summary-row">
      <span className="rail-summary-label">{label}</span>
      <span className="rail-summary-value">{value}</span>
    </p>
  );
}
