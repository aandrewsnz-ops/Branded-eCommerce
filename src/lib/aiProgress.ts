export type AiOperation =
  | "research"
  | "research_append"
  | "insight_report"
  | "customer_avatar"
  | "marketing_angles"
  | "generate_copy"
  | "regenerate_ad"
  | "regenerate_image_prompt"
  | "tof_concepts"
  | "product_page";

export const AI_PROGRESS_MAX_SECONDS = 90;

/** Longer estimate for copy pack generation (no client abort — proxy/backend may run ~4 min). */
export const AI_PROGRESS_MAX_SECONDS_GENERATE_COPY = 240;

/** Research uses web search and may run up to ~4 minutes. */
export const AI_PROGRESS_MAX_SECONDS_RESEARCH = 240;

/** Product page generation may include many sections. */
export const AI_PROGRESS_MAX_SECONDS_PRODUCT_PAGE = 120;

/** Marketing angles run per desire with a 240s backend timeout. */
export const AI_PROGRESS_MAX_SECONDS_MARKETING_ANGLES = 240;

export function getOperationMaxSeconds(operation: AiOperation): number {
  if (operation === "generate_copy") {
    return AI_PROGRESS_MAX_SECONDS_GENERATE_COPY;
  }
  if (operation === "research" || operation === "research_append") {
    return AI_PROGRESS_MAX_SECONDS_RESEARCH;
  }
  if (operation === "product_page") {
    return AI_PROGRESS_MAX_SECONDS_PRODUCT_PAGE;
  }
  if (operation === "marketing_angles") {
    return AI_PROGRESS_MAX_SECONDS_MARKETING_ANGLES;
  }
  return AI_PROGRESS_MAX_SECONDS;
}

export interface AiOperationConfig {
  id: AiOperation;
  title: string;
  successTitle: string;
  errorTitle?: string;
  description: string;
  reassurance: string;
  extendedWaitAfterSeconds?: number;
  extendedWaitMessage?: string;
  technicalDetail: string;
  steps: readonly [string, string, string, string, string];
}

export const AI_OPERATION_CONFIG: Record<AiOperation, AiOperationConfig> = {
  research: {
    id: "research",
    title: "Running research",
    successTitle: "Research complete",
    errorTitle: "Research failed",
    description:
      "Searching public discussions and extracting the first 5 useful sources.",
    reassurance:
      "Typical timing: 1 to 3 minutes. Long web search runs may take up to 4 minutes.",
    extendedWaitAfterSeconds: 90,
    extendedWaitMessage:
      "Still working. Research can take longer because the AI is searching the web and returning structured source evidence.",
    technicalDetail: "Web search plus structured JSON source extraction",
    steps: [
      "Preparing product context",
      "Sending research request",
      "Waiting for AI research response",
      "Parsing research sources",
      "Saving research results",
    ],
  },
  research_append: {
    id: "research_append",
    title: "Fetching another 5 sources",
    successTitle: "Research sources updated",
    errorTitle: "Research fetch failed",
    description:
      "Looking for new discussions while avoiding sources already collected.",
    reassurance:
      "Typical timing: 1 to 3 minutes. Long web search runs may take up to 4 minutes.",
    extendedWaitAfterSeconds: 90,
    extendedWaitMessage:
      "Still working. Research can take longer because the AI is searching the web and returning structured source evidence.",
    technicalDetail: "Web search with existing-source avoidance",
    steps: [
      "Loading saved research sources",
      "Sending follow-up research request",
      "Waiting for AI research response",
      "Parsing new sources",
      "Saving additional results",
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
      "Angles are generated one mass desire at a time — each call may take up to 4 minutes.",
    extendedWaitAfterSeconds: 90,
    extendedWaitMessage:
      "Still working. Each desire runs as a separate OpenAI call with up to a 4-minute timeout.",
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
    title: "Generating TOF copy pack",
    successTitle: "TOF copy pack generated",
    errorTitle: "TOF copy pack generation failed",
    description:
      "Creating three desire-level Meta ad units anchored on this mass desire.",
    reassurance:
      "Desire-level copy is broader than angle ads but still ready to use as Meta ad units.",
    technicalDetail: "Compact prompt and structured JSON response",
    steps: [
      "Preparing desire context",
      "Sending copy prompt",
      "Waiting for AI response",
      "Validating ad structure",
      "Saving copy pack",
    ],
  },
  product_page: {
    id: "product_page",
    title: "Generating product page",
    successTitle: "Product page generated",
    errorTitle: "Product page generation failed",
    description:
      "Creating Shopify-ready product page sections, UGC image prompts, and export-ready Custom Liquid placeholders.",
    reassurance:
      "The model is planning multiple standalone Shopify sections from your research and strategy.",
    technicalDetail: "Large structured JSON product page plan",
    steps: [
      "Preparing research and strategy context",
      "Sending product page prompt",
      "Waiting for AI response",
      "Validating sections and image prompts",
      "Saving product page template",
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
