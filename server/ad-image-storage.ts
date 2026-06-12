import { getSupabase } from "./supabase";

export const AD_IMAGES_BUCKET = "ad-images";

/** Storage path using the clean ad filename under projects/{id}/ads/. */
export function buildNamedAdImageStoragePath(
  projectId: string,
  safeFilename: string,
  withTimestampSuffix = false
): string {
  const ext = safeFilename.includes(".")
    ? safeFilename.split(".").pop() ?? "png"
    : "png";
  const base = safeFilename.replace(/\.[^.]+$/, "");
  if (withTimestampSuffix) {
    return `projects/${projectId}/ads/${base}-${Date.now()}.${ext}`;
  }
  return `projects/${projectId}/ads/${safeFilename}`;
}

export function getAdImagePublicUrl(path: string): string {
  const supabase = getSupabase();
  const { data } = supabase.storage.from(AD_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function storageErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/policy|permission|denied|unauthorized|403/i.test(message)) {
    return "Storage permission denied. Check ad-images bucket policies.";
  }
  return message;
}

/** Move or copy a storage object to a new path within ad-images. */
export async function renameAdImageObject(
  oldPath: string,
  newPath: string
): Promise<void> {
  if (!oldPath.trim() || !newPath.trim()) {
    throw new Error("Missing storage path.");
  }
  if (oldPath === newPath) return;

  const supabase = getSupabase();
  const bucket = supabase.storage.from(AD_IMAGES_BUCKET);

  const { error: moveError } = await bucket.move(oldPath, newPath);
  if (!moveError) return;

  const { error: copyError } = await bucket.copy(oldPath, newPath);
  if (!copyError) {
    const { error: removeError } = await bucket.remove([oldPath]);
    if (removeError) {
      // New object exists; old duplicate is harmless.
      console.warn(
        `[ad-images] Copied ${oldPath} → ${newPath} but could not remove old object:`,
        removeError.message
      );
    }
    return;
  }

  throw new Error(
    storageErrorMessage(
      moveError.message.includes("not found") ? moveError : copyError
    )
  );
}
