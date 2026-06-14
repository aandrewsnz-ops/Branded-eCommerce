import fs from "fs/promises";
import path from "path";
import type { AiUsageApiPayload } from "./ai-usage";

const DEBUG_DIR = path.join(process.cwd(), "server", "debug", "openai-responses");

export interface SaveGenerateCopyDebugInput {
  project_id: string;
  mass_desire_id: string;
  marketing_angle_id: string;
  model: string;
  openai_response_id: string | null;
  usage: AiUsageApiPayload | null;
  raw_text: string;
  attempt: number;
}

/** Dev-only rescue file for paid OpenAI output. Returns filename relative to debug dir. */
export async function saveGenerateCopyDebugResponse(
  input: SaveGenerateCopyDebugInput
): Promise<string | undefined> {
  if (process.env.NODE_ENV === "production") {
    return undefined;
  }

  try {
    await fs.mkdir(DEBUG_DIR, { recursive: true });
    const filename = `generate-copy-${Date.now()}-${input.marketing_angle_id}.json`;
    const filePath = path.join(DEBUG_DIR, filename);

    const payload = {
      operation: "generate-copy",
      project_id: input.project_id,
      mass_desire_id: input.mass_desire_id,
      marketing_angle_id: input.marketing_angle_id,
      model: input.model,
      openai_response_id: input.openai_response_id,
      created_at: new Date().toISOString(),
      attempt: input.attempt,
      usage: input.usage,
      raw_text: input.raw_text,
    };

    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
    console.log("[COPY] debug raw response saved:", filename);
    return filename;
  } catch (error: unknown) {
    console.warn(
      "[COPY] Failed to save debug raw response:",
      error instanceof Error ? error.message : String(error)
    );
    return undefined;
  }
}
