export type AiOperation =
  | "research"
  | "insight_report"
  | "customer_avatar"
  | "marketing_angles"
  | "generate_copy"
  | "regenerate_ad"
  | "regenerate_image_prompt"
  | "tof_concepts";

export const AI_PROGRESS_MAX_SECONDS = 90;

/** Longer estimate for copy pack generation (no client abort — proxy/backend may run ~4 min). */
export const AI_PROGRESS_MAX_SECONDS_GENERATE_COPY = 240;

export function getOperationMaxSeconds(operation: AiOperation): number {
  return operation === "generate_copy"
    ? AI_PROGRESS_MAX_SECONDS_GENERATE_COPY
    : AI_PROGRESS_MAX_SECONDS;
}

export interface AiOperationConfig {
  id: AiOperation;
  title: string;
  successTitle: string;
  errorTitle?: string;
  description: string;
  reassurance: string;
  technicalDetail: string;
  steps: readonly [string, string, string, string, string];
}

export const AI_OPERATION_CONFIG: Record<AiOperation, AiOperationConfig> = {
  research: {
    id: "research",
    title: "Running research",
    successTitle: "Research complete",
    description:
      "Searching public discussions and extracting useful source evidence for this product.",
    reassurance:
      "Research runs in the background — large language models need time to search and structure findings.",
    technicalDetail: "Web search plus structured JSON source extraction",
    steps: [
      "Preparing product context",
      "Sending research request",
      "Waiting for AI research response",
      "Parsing research sources",
      "Saving research results",
    ],
  },
  insight_report: {
    id: "insight_report",
    title: "Generating insight report",
    successTitle: "Insight report generated",
    description:
      "Analysing research sources to surface pain clusters, language patterns, and copy direction.",
    reassurance:
      "The model is reading your research and building a structured insight report.",
    technicalDetail: "Large prompt and structured JSON response",
    steps: [
      "Preparing research context",
      "Sending insight request",
      "Waiting for AI analysis response",
      "Parsing insight structure",
      "Saving insight report",
    ],
  },
  customer_avatar: {
    id: "customer_avatar",
    title: "Generating customer avatar",
    successTitle: "Customer avatar generated",
    description:
      "Building a detailed customer profile from your insight report and product context.",
    reassurance:
      "Avatar generation synthesises research into a usable customer profile.",
    technicalDetail: "Structured customer profile JSON generation",
    steps: [
      "Preparing insight context",
      "Sending avatar request",
      "Waiting for AI avatar response",
      "Parsing avatar profile",
      "Saving customer avatar",
    ],
  },
  marketing_angles: {
    id: "marketing_angles",
    title: "Generating marketing angles",
    successTitle: "Marketing angles generated",
    description:
      "Creating distinct story-driven marketing angles for each mass desire.",
    reassurance:
      "Angle generation produces multiple strategic directions — this can take a minute.",
    technicalDetail: "Multi-angle structured JSON generation",
    steps: [
      "Preparing desires and insight context",
      "Sending angles request",
      "Waiting for AI strategy response",
      "Parsing marketing angles",
      "Saving angle matrix",
    ],
  },
  generate_copy: {
    id: "generate_copy",
    title: "Generating copy pack",
    successTitle: "Copy pack generated",
    errorTitle: "Generate Copy failed",
    description:
      "Creating five paired Meta ad variations with primary text, headline, description, visual strategy, and image prompt.",
    reassurance:
      "Each ad is a full creative unit — the model is writing copy and paired image direction together.",
    technicalDetail: "Large prompt and structured JSON response",
    steps: [
      "Preparing product, desire, and angle context",
      "Sending creative strategy prompt",
      "Waiting for AI copy response",
      "Validating the five ad variations",
      "Saving copy pack",
    ],
  },
  regenerate_ad: {
    id: "regenerate_ad",
    title: "Regenerating ad",
    successTitle: "Ad regenerated",
    description:
      "Creating a fresh ad variation while keeping it distinct from the rest of the copy pack.",
    reassurance:
      "Regeneration rewrites one ad slot — visual strategy and image prompt included.",
    technicalDetail: "Single ad JSON regeneration",
    steps: [
      "Reading existing copy pack",
      "Sending regeneration request",
      "Waiting for AI copy response",
      "Validating ad fields",
      "Saving updated ad",
    ],
  },
  regenerate_image_prompt: {
    id: "regenerate_image_prompt",
    title: "Regenerating image prompt",
    successTitle: "Image prompt regenerated",
    description:
      "Creating a fresh visual strategy and image prompt while keeping the ad copy unchanged.",
    reassurance:
      "Only the visual fields are being regenerated to match your existing copy.",
    technicalDetail: "Visual strategy and image prompt JSON",
    steps: [
      "Reading existing ad copy",
      "Sending visual prompt request",
      "Waiting for AI response",
      "Validating visual fields",
      "Saving updated prompt",
    ],
  },
  tof_concepts: {
    id: "tof_concepts",
    title: "Generating TOF concepts",
    successTitle: "TOF concepts generated",
    description:
      "Creating three broader visual-first top-of-funnel ad concepts for this mass desire.",
    reassurance:
      "TOF concepts are image-first awareness ideas — broader than angle-level copy packs.",
    technicalDetail: "Compact prompt and structured JSON response",
    steps: [
      "Preparing desire context",
      "Sending concept prompt",
      "Waiting for AI concept response",
      "Validating concept structure",
      "Saving concepts",
    ],
  },
};

/** Map elapsed seconds to the active estimated step index (0–4). */
export function getActiveStepIndex(elapsedSeconds: number): number {
  if (elapsedSeconds < 8) return 0;
  if (elapsedSeconds < 15) return 1;
  if (elapsedSeconds < 75) return 2;
  if (elapsedSeconds < 88) return 3;
  return 4;
}

export function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
