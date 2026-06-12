import { Boxes } from "lucide-react";
import type {
  AdCopySet,
  AngleReviewPatch,
  CreativePromptSet,
  CustomerAvatarOutput,
  MarketingAngle,
  MassDesire,
  ProductProject,
  ProductProjectInput,
  ResearchInsight,
  ResearchSource,
} from "../types";
import type {
  InsightSectionKey,
  ModeStatus,
  SelectedItem,
  WorkflowMode,
} from "./workflow";
import { LeftRail } from "./LeftRail";
import { InspectorPanel } from "./InspectorPanel";
import { SetupWorkspace } from "./SetupWorkspace";
import { ResearchGrid } from "./ResearchGrid";
import { InsightsWorkspace } from "./InsightsWorkspace";
import { StrategyMatrix } from "./StrategyMatrix";
import { CreativeWorkspace } from "./CreativeWorkspace";
import { ReviewWorkspace } from "./ReviewWorkspace";

export interface AppShellProps {
  // Projects + brief
  projects: ProductProject[];
  selectedId: string | null;
  selectedProject: ProductProject | null;
  isProjectsLoading: boolean;
  onSelectProject: (id: string) => void;
  form: ProductProjectInput;
  onUpdateField: <K extends keyof ProductProjectInput>(
    key: K,
    value: ProductProjectInput[K]
  ) => void;
  onCreateProject: (event: React.FormEvent<HTMLFormElement>) => void;
  isCreating: boolean;
  createError: string | null;

  // Mode + selection
  mode: WorkflowMode;
  onChangeMode: (mode: WorkflowMode) => void;
  statuses: Record<WorkflowMode, ModeStatus>;
  selectedItem: SelectedItem | null;
  onSelectItem: (item: SelectedItem | null) => void;

  statusMessage: string | null;

  // Data
  sources: ResearchSource[];
  insight: ResearchInsight | null;
  avatar: CustomerAvatarOutput | null;
  desires: MassDesire[];
  angles: MarketingAngle[];
  copySets: AdCopySet[];
  creativePromptSets: CreativePromptSet[];

  // Loading / generating / errors
  isResearching: boolean;
  isSourcesLoading: boolean;
  researchError: string | null;
  isGeneratingInsight: boolean;
  isInsightLoading: boolean;
  insightError: string | null;
  isGeneratingAvatar: boolean;
  isAvatarLoading: boolean;
  avatarError: string | null;
  isGeneratingDesires: boolean;
  isGeneratingAngles: boolean;
  isDesiresLoading: boolean;
  desiresError: string | null;
  anglesError: string | null;
  generatingCopyAngleId: string | null;
  copyError: string | null;
  generatingCreativePromptAngleId: string | null;
  creativePromptError: string | null;
  savingReviewAngleId: string | null;
  reviewError: string | null;

  // Actions
  onRunResearch: () => void;
  onGenerateInsight: () => void;
  onGenerateAvatar: () => void;
  onGenerateDesires: () => void;
  onGenerateAngles: () => void;
  onGenerateCopy: (angleId: string) => void;
  onGenerateCreativePrompts: (angleId: string, adCopySetId: string) => void;
  onUpdateAngleReview: (angleId: string, updates: AngleReviewPatch) => void;
}

export function AppShell(props: AppShellProps) {
  const {
    selectedProject,
    mode,
    statusMessage,
    selectedItem,
    onSelectItem,
  } = props;

  const selectedAngleId =
    selectedItem?.type === "angle" ? selectedItem.id : null;
  const selectedDesireId =
    selectedItem?.type === "desire" ? selectedItem.id : null;
  const selectedSourceId =
    selectedItem?.type === "source" ? selectedItem.id : null;

  function selectInsight(section: InsightSectionKey, index: number) {
    onSelectItem({ type: "insight", section, index });
  }

  return (
    <div className="command-centre">
      <LeftRail
        projects={props.projects}
        selectedId={props.selectedId}
        selectedProject={selectedProject}
        isLoading={props.isProjectsLoading}
        onSelectProject={props.onSelectProject}
        mode={mode}
        statuses={props.statuses}
        onChangeMode={props.onChangeMode}
        form={props.form}
        onUpdateField={props.onUpdateField}
        onCreateProject={props.onCreateProject}
        isCreating={props.isCreating}
        createError={props.createError}
      />

      <main className="centre">
        {statusMessage ? (
          <div className="centre-status" role="status">
            {statusMessage}
          </div>
        ) : null}

        {!selectedProject ? (
          <div className="empty-state">
            <Boxes size={40} strokeWidth={1.5} />
            <p>
              {props.projects.length === 0
                ? "No projects yet. Create one in the left rail to begin."
                : "Select a project to begin."}
            </p>
          </div>
        ) : mode === "setup" ? (
          <SetupWorkspace project={selectedProject} />
        ) : mode === "research" ? (
          <ResearchGrid
            sources={props.sources}
            isResearching={props.isResearching}
            isLoading={props.isSourcesLoading}
            error={props.researchError}
            onRunResearch={props.onRunResearch}
            selectedSourceId={selectedSourceId}
            onSelectSource={(id) => onSelectItem({ type: "source", id })}
          />
        ) : mode === "insights" ? (
          <InsightsWorkspace
            insight={props.insight}
            isGeneratingInsight={props.isGeneratingInsight}
            isInsightLoading={props.isInsightLoading}
            insightError={props.insightError}
            onGenerateInsight={props.onGenerateInsight}
            avatar={props.avatar}
            isGeneratingAvatar={props.isGeneratingAvatar}
            isAvatarLoading={props.isAvatarLoading}
            avatarError={props.avatarError}
            onGenerateAvatar={props.onGenerateAvatar}
            selectedItem={selectedItem}
            onSelectInsight={selectInsight}
            onSelectAvatar={() => onSelectItem({ type: "avatar" })}
          />
        ) : mode === "strategy" ? (
          <StrategyMatrix
            desires={props.desires}
            angles={props.angles}
            copySets={props.copySets}
            creativePromptSets={props.creativePromptSets}
            isGeneratingDesires={props.isGeneratingDesires}
            isGeneratingAngles={props.isGeneratingAngles}
            isLoading={props.isDesiresLoading}
            desiresError={props.desiresError}
            anglesError={props.anglesError}
            onGenerateDesires={props.onGenerateDesires}
            onGenerateAngles={props.onGenerateAngles}
            generatingCopyAngleId={props.generatingCopyAngleId}
            generatingCreativePromptAngleId={
              props.generatingCreativePromptAngleId
            }
            selectedAngleId={selectedAngleId}
            selectedDesireId={selectedDesireId}
            onSelectAngle={(id) => onSelectItem({ type: "angle", id })}
            onSelectDesire={(id) => onSelectItem({ type: "desire", id })}
          />
        ) : mode === "creative" ? (
          <CreativeWorkspace
            angles={props.angles}
            copySets={props.copySets}
            creativePromptSets={props.creativePromptSets}
            copyError={props.copyError}
            creativePromptError={props.creativePromptError}
            generatingCopyAngleId={props.generatingCopyAngleId}
            generatingCreativePromptAngleId={
              props.generatingCreativePromptAngleId
            }
            selectedAngleId={selectedAngleId}
            onSelectAngle={(id) => onSelectItem({ type: "angle", id })}
          />
        ) : (
          <ReviewWorkspace
            angles={props.angles}
            copySets={props.copySets}
            creativePromptSets={props.creativePromptSets}
            reviewError={props.reviewError}
            selectedAngleId={selectedAngleId}
            onSelectAngle={(id) => onSelectItem({ type: "angle", id })}
          />
        )}
      </main>

      <InspectorPanel
        selectedItem={selectedItem}
        project={selectedProject}
        sources={props.sources}
        insight={props.insight}
        avatar={props.avatar}
        desires={props.desires}
        angles={props.angles}
        copySets={props.copySets}
        creativePromptSets={props.creativePromptSets}
        generatingCopyAngleId={props.generatingCopyAngleId}
        generatingCreativePromptAngleId={props.generatingCreativePromptAngleId}
        savingReviewAngleId={props.savingReviewAngleId}
        onGenerateCopy={props.onGenerateCopy}
        onGenerateCreativePrompts={props.onGenerateCreativePrompts}
        onUpdateAngleReview={props.onUpdateAngleReview}
      />
    </div>
  );
}
