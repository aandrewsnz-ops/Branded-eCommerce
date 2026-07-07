import { Boxes } from "lucide-react";
import type {
  AdCandidate,
  AdCandidatePatch,
  AdCopySet,
  AdVariation,
  AngleReviewPatch,
  CreativePromptSet,
  CustomerAvatarOutput,
  DesireConceptSet,
  MarketingAngle,
  MassDesire,
  ProductProject,
  ProductProjectInput,
  ProductPageSection,
  ProductPageSet,
  ProjectAiUsageSummary,
  ProjectAiCostTotal,
  ResearchInsight,
  ResearchSource,
} from "../types";
import type { ProductProjectUpdate } from "../lib/projectSetupFields";
import type { ModeStatus, WorkflowMode } from "./workflow";
import { LeftRail } from "./LeftRail";
import { SetupWorkspace } from "./SetupWorkspace";
import { ResearchWorkspace } from "./ResearchWorkspace";
import { InsightReportWorkspace } from "./InsightReportWorkspace";
import { CustomerAvatarWorkspace } from "./CustomerAvatarWorkspace";
import { StrategyWorkspace } from "./StrategyWorkspace";
import { AdsWorkspace } from "./AdsWorkspace";
import { ViewAdsWorkspace } from "./ViewAdsWorkspace";
import { PublishAdsWorkspace } from "./PublishAdsWorkspace";
import { ProductPageWorkspace } from "./ProductPageWorkspace";
import { AdditionalContentWorkspace } from "./AdditionalContentWorkspace";

export interface AppShellProps {
  // Projects + brief
  projects: ProductProject[];
  selectedId: string | null;
  selectedProject: ProductProject | null;
  isProjectsLoading: boolean;
  onSelectProject: (id: string) => void;
  deletingProjectId: string | null;
  onDeleteProject: (id: string) => void;
  form: ProductProjectInput;
  onUpdateField: <K extends keyof ProductProjectInput>(
    key: K,
    value: ProductProjectInput[K]
  ) => void;
  onCreateProject: (event: React.FormEvent<HTMLFormElement>) => void;
  isCreating: boolean;
  createError: string | null;

  isSavingSetup: boolean;
  setupError: string | null;
  onSaveSetup: (patch: ProductProjectUpdate) => Promise<void>;

  // Mode
  mode: WorkflowMode;
  onChangeMode: (mode: WorkflowMode) => void;
  statuses: Record<WorkflowMode, ModeStatus>;

  statusMessage: string | null;

  // Data
  sources: ResearchSource[];
  insight: ResearchInsight | null;
  avatar: CustomerAvatarOutput | null;
  desires: MassDesire[];
  angles: MarketingAngle[];
  copySets: AdCopySet[];
  conceptSets: DesireConceptSet[];
  creativePromptSets: CreativePromptSet[];
  adCandidates: AdCandidate[];

  productPageSet: ProductPageSet | null;
  isCreatingProductPageTemplate: boolean;
  productPageError: string | null;
  onCreateProductPageTemplate: () => void;
  onPatchProductPageSection: (
    sectionId: string,
    patch: Partial<ProductPageSection>
  ) => Promise<void>;

  // Loading / generating / errors
  isResearching: boolean;
  isSourcesLoading: boolean;
  researchError: string | null;
  newResearchSourceIds: ReadonlySet<string>;
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
  generatingTofDesireId: string | null;
  tofError: string | null;
  generatingCreativePromptAngleId: string | null;
  creativePromptError: string | null;
  savingReviewAngleId: string | null;
  reviewError: string | null;
  candidateError: string | null;
  savingCandidateAngleId: string | null;
  savingCandidateId: string | null;

  // Actions
  onRunResearch: () => void;
  onGenerateInsight: () => void;
  onGenerateAvatar: () => void;
  onGenerateDesires: () => void;
  onGenerateAngles: () => void;
  onGenerateCopy: (angleId: string) => void;
  onGenerateTofConcepts: (desireId: string) => void;
  onOpenTofConcepts: (conceptSet: DesireConceptSet) => void;
  onGenerateCreativePrompts: (angleId: string, adCopySetId: string) => void;
  onUpdateAngleReview: (angleId: string, updates: AngleReviewPatch) => void;
  onUpsertCandidate: (angleId: string, patch: AdCandidatePatch) => void;
  onPatchCandidate: (id: string, patch: AdCandidatePatch) => void;
  onOpenCopyPack: (copySet: AdCopySet, angleName: string) => void;
  onSaveCopyPack: (
    copySet: AdCopySet,
    adVariations: AdVariation[]
  ) => Promise<AdCopySet>;
  onFixImageFilename: (
    copySetId: string,
    adIndex: number,
    safeFilename: string
  ) => Promise<AdCopySet>;
  onUpdateTofConceptCopy: (
    conceptId: string,
    copy: { primary: string; headline: string; description: string }
  ) => Promise<void>;

  projectAiUsage: ProjectAiUsageSummary | null;
  projectCostById: Record<string, ProjectAiCostTotal>;
}

export function AppShell(props: AppShellProps) {
  const { selectedProject, mode, statusMessage } = props;

  function renderWorkspace() {
    if (!selectedProject) {
      return (
        <div className="empty-state">
          <Boxes size={40} strokeWidth={1.5} />
          <p>
            {props.projects.length === 0
              ? "No projects yet. Create one in the left rail to begin."
              : "Select a project to begin."}
          </p>
        </div>
      );
    }

    switch (mode) {
      case "setup":
        return (
          <SetupWorkspace
            project={selectedProject}
            isSaving={props.isSavingSetup}
            saveError={props.setupError}
            onSave={(patch) => props.onSaveSetup(patch)}
          />
        );
      case "research":
        return (
          <ResearchWorkspace
            sources={props.sources}
            isResearching={props.isResearching}
            isLoading={props.isSourcesLoading}
            error={props.researchError}
            newSourceIds={props.newResearchSourceIds}
            onRunResearch={props.onRunResearch}
          />
        );
      case "insight_report":
        return (
          <InsightReportWorkspace
            insight={props.insight}
            hasResearch={props.sources.length >= 5}
            isGeneratingInsight={props.isGeneratingInsight}
            isInsightLoading={props.isInsightLoading}
            insightError={props.insightError}
            onGenerateInsight={props.onGenerateInsight}
          />
        );
      case "avatar":
        return (
          <CustomerAvatarWorkspace
            avatar={props.avatar}
            hasInsight={Boolean(props.insight)}
            isGeneratingAvatar={props.isGeneratingAvatar}
            isAvatarLoading={props.isAvatarLoading}
            avatarError={props.avatarError}
            onGenerateAvatar={props.onGenerateAvatar}
          />
        );
      case "strategy":
        return (
          <StrategyWorkspace
            desires={props.desires}
            angles={props.angles}
            copySets={props.copySets}
            conceptSets={props.conceptSets}
            isGeneratingDesires={props.isGeneratingDesires}
            isGeneratingAngles={props.isGeneratingAngles}
            isLoading={props.isDesiresLoading}
            desiresError={props.desiresError}
            anglesError={props.anglesError}
            copyError={props.copyError}
            tofError={props.tofError}
            onGenerateDesires={props.onGenerateDesires}
            onGenerateAngles={props.onGenerateAngles}
            generatingTofDesireId={props.generatingTofDesireId}
            generatingCopyAngleId={props.generatingCopyAngleId}
            savingReviewAngleId={props.savingReviewAngleId}
            onGenerateTofConcepts={props.onGenerateTofConcepts}
            onOpenTofConcepts={props.onOpenTofConcepts}
            onGenerateCopy={props.onGenerateCopy}
            onUpdateAngleReview={props.onUpdateAngleReview}
            onOpenCopyPack={props.onOpenCopyPack}
          />
        );
      case "ads":
        return (
          <AdsWorkspace
            desires={props.desires}
            angles={props.angles}
            copySets={props.copySets}
            onGoToStrategy={() => props.onChangeMode("strategy")}
            onSaveCopyPack={props.onSaveCopyPack}
            onFixImageFilename={props.onFixImageFilename}
          />
        );
      case "view_ads":
        return (
          <ViewAdsWorkspace
            project={selectedProject}
            desires={props.desires}
            angles={props.angles}
            copySets={props.copySets}
            conceptSets={props.conceptSets}
            onGoToReviewAds={() => props.onChangeMode("ads")}
            onSaveCopyPack={props.onSaveCopyPack}
            onUpdateTofConceptCopy={props.onUpdateTofConceptCopy}
          />
        );
      case "publish_ads":
        return (
          <PublishAdsWorkspace
            key={selectedProject.id}
            desires={props.desires}
            angles={props.angles}
            copySets={props.copySets}
            onGoToReviewAds={() => props.onChangeMode("ads")}
          />
        );
      case "product_page":
        return (
          <ProductPageWorkspace
            key={selectedProject.id}
            projectId={selectedProject.id}
            productPageSet={props.productPageSet}
            isCreating={props.isCreatingProductPageTemplate}
            error={props.productPageError}
            canCreate={Boolean(selectedProject)}
            onCreate={props.onCreateProductPageTemplate}
            onPatchSection={props.onPatchProductPageSection}
          />
        );
      case "additional":
        return (
          <AdditionalContentWorkspace
            angles={props.angles}
            copySets={props.copySets}
            creativePromptSets={props.creativePromptSets}
            adCandidates={props.adCandidates}
            sources={props.sources}
            insight={props.insight}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="command-centre command-centre-full">
      <LeftRail
        projects={props.projects}
        selectedId={props.selectedId}
        selectedProject={selectedProject}
        isLoading={props.isProjectsLoading}
        onSelectProject={props.onSelectProject}
        deletingProjectId={props.deletingProjectId}
        onDeleteProject={props.onDeleteProject}
        mode={mode}
        statuses={props.statuses}
        onChangeMode={props.onChangeMode}
        form={props.form}
        onUpdateField={props.onUpdateField}
        onCreateProject={props.onCreateProject}
        isCreating={props.isCreating}
        createError={props.createError}
        projectAiUsage={props.projectAiUsage}
        projectCostById={props.projectCostById}
      />

      <main className="centre">
        {statusMessage ? (
          <div className="centre-status" role="status">
            {statusMessage}
          </div>
        ) : null}
        {renderWorkspace()}
      </main>
    </div>
  );
}
