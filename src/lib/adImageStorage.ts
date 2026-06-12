import { supabase, isSupabaseConfigured } from "./supabase";
import type { AdVariation } from "../types";

export const AD_IMAGES_BUCKET = "ad-images";
export const AD_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

const ACCEPTED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};

export interface AdImageUploadMeta {
  image_url: string;
  image_path: string;
  image_filename: string;
  image_uploaded_at: string;
  image_file_type: string;
}

export function validateAdImageFile(file: File): string | null {
  const mime = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const extOk = ["png", "jpg", "jpeg", "webp"].includes(ext);
  if (!ACCEPTED_MIME_TYPES.has(mime) && !extOk) {
    return "Please upload a PNG, JPG, JPEG, or WebP image.";
  }
  if (file.size > AD_IMAGE_MAX_BYTES) {
    return "Image must be 10MB or smaller.";
  }
  return null;
}

function extensionForFile(file: File): string {
  const fromMime = EXTENSION_BY_MIME[file.type.toLowerCase()];
  if (fromMime) return fromMime;
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName === "jpeg") return "jpg";
  if (fromName && ["png", "jpg", "webp"].includes(fromName)) return fromName;
  return "png";
}

export function buildAdImageStoragePath(
  projectId: string,
  marketingAngleId: string,
  copySetId: string,
  adNumber: number,
  extension: string
): string {
  return `projects/${projectId}/angles/${marketingAngleId}/copy-packs/${copySetId}/ad-${adNumber}-${Date.now()}.${extension}`;
}

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
  if (!supabase) return "";
  const { data } = supabase.storage.from(AD_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function storagePermissionMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/policy|permission|denied|unauthorized|403/i.test(message)) {
    return "Image upload failed. Check Supabase Storage bucket policies for ad-images.";
  }
  return message;
}

/** Upload an ad image to Supabase Storage and return metadata for ad_variations. */
export async function uploadAdImage(
  file: File,
  projectId: string,
  safeFilename: string,
  existingPath?: string
): Promise<AdImageUploadMeta> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured.");
  }

  const validationError = validateAdImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  if (existingPath?.trim()) {
    try {
      await deleteAdImage(existingPath);
    } catch {
      // Replacing with a new path is fine even if the old object is already gone.
    }
  }

  const extension = extensionForFile(file);
  const filename =
    safeFilename.trim() ||
    `upload-${Date.now()}.${extension}`;

  let path = buildNamedAdImageStoragePath(projectId, filename);
  let uploadError = (
    await supabase.storage.from(AD_IMAGES_BUCKET).upload(path, file, {
      upsert: false,
      contentType:
        file.type || `image/${extension === "jpg" ? "jpeg" : extension}`,
    })
  ).error;

  if (uploadError && /already exists|duplicate/i.test(uploadError.message)) {
    path = buildNamedAdImageStoragePath(projectId, filename, true);
    uploadError = (
      await supabase.storage.from(AD_IMAGES_BUCKET).upload(path, file, {
        upsert: false,
        contentType:
          file.type || `image/${extension === "jpg" ? "jpeg" : extension}`,
      })
    ).error;
  }

  if (uploadError) {
    throw new Error(storagePermissionMessage(uploadError));
  }

  return {
    image_url: getAdImagePublicUrl(path),
    image_path: path,
    image_filename: filename.split("/").pop() ?? filename,
    image_uploaded_at: new Date().toISOString(),
    image_file_type:
      file.type || `image/${extension === "jpg" ? "jpeg" : extension}`,
  };
}

/** Delete an ad image from Supabase Storage. */
export async function deleteAdImage(path: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured.");
  }
  if (!path.trim()) return;

  const { error } = await supabase.storage.from(AD_IMAGES_BUCKET).remove([path]);
  if (error) {
    throw new Error(storagePermissionMessage(error));
  }
}

/** Remove image metadata from an ad variation (does not delete storage). */
export function clearAdImageFields(ad: AdVariation): AdVariation {
  const next = { ...ad };
  delete next.image_url;
  delete next.image_path;
  delete next.image_filename;
  delete next.image_uploaded_at;
  delete next.image_file_type;
  return next;
}

/** Copy optional uploaded-image fields from a stored ad object. */
export function readAdImageFields(source: Partial<AdVariation>): Pick<
  AdVariation,
  | "image_url"
  | "image_path"
  | "image_filename"
  | "image_uploaded_at"
  | "image_file_type"
> {
  const fields: Pick<
    AdVariation,
    | "image_url"
    | "image_path"
    | "image_filename"
    | "image_uploaded_at"
    | "image_file_type"
  > = {};
  if (typeof source.image_url === "string" && source.image_url.trim()) {
    fields.image_url = source.image_url;
  }
  if (typeof source.image_path === "string" && source.image_path.trim()) {
    fields.image_path = source.image_path;
  }
  if (typeof source.image_filename === "string" && source.image_filename.trim()) {
    fields.image_filename = source.image_filename;
  }
  if (
    typeof source.image_uploaded_at === "string" &&
    source.image_uploaded_at.trim()
  ) {
    fields.image_uploaded_at = source.image_uploaded_at;
  }
  if (typeof source.image_file_type === "string" && source.image_file_type.trim()) {
    fields.image_file_type = source.image_file_type;
  }
  return fields;
}
