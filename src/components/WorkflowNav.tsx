import {
  Search,
  FileText,
  Layers,
  Settings2,
  Archive,
  UserRound,
  ImageIcon,
} from "lucide-react";
import type { ModeStatus, WorkflowMode } from "./workflow";
import { WORKFLOW_MODES } from "./workflow";

const MODE_ICONS: Record<WorkflowMode, typeof Search> = {
  setup: Settings2,
  research: Search,
  insight_report: FileText,
  avatar: UserRound,
  strategy: Layers,
  ads: ImageIcon,
  additional: Archive,
};

const STATUS_LABELS: Record<ModeStatus, string> = {
  missing: "Missing",
  ready: "Ready",
  done: "Done",
};

interface WorkflowNavProps {
  activeMode: WorkflowMode;
  statuses: Record<WorkflowMode, ModeStatus>;
  onChange: (mode: WorkflowMode) => void;
}

export function WorkflowNav({
  activeMode,
  statuses,
  onChange,
}: WorkflowNavProps) {
  return (
    <nav className="workflow-nav" aria-label="Workflow modes">
      {WORKFLOW_MODES.map((mode) => {
        const Icon = MODE_ICONS[mode.id];
        const status = statuses[mode.id];
        const isActive = activeMode === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            className={`workflow-nav-item${isActive ? " is-active" : ""}`}
            onClick={() => onChange(mode.id)}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={16} strokeWidth={2} />
            <span className="workflow-nav-label">{mode.label}</span>
            <span className={`workflow-nav-status status-${status}`}>
              {STATUS_LABELS[status]}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
