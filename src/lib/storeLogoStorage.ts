import { supabase, isSupabaseConfigured } from "./supabase";

export const STORE_ASSETS_BUCKET = "store-assets";
export const STORE_LOGO_MAX_BYTES = 5 * 1024 * 1024;

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

export interface StoreLogoMeta {
  your_store_logo_url: string;
  your_store_logo_path: string;
  your_store_logo_filename: string;
  your_store_logo_uploaded_at: string;
}

export function validateStoreLogoFile(file: File): string | null {
  const mime = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const extOk = ["png", "jpg", "jpeg", "webp"].includes(ext);
  if (!ACCEPTED_MIME_TYPES.has(mime) && !extOk) {
    return "Please upload a PNG, JPG, JPEG, or WebP logo.";
  }
  if (file.size > STORE_LOGO_MAX_BYTES) {
    return "Logo must be 5MB or smaller.";
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

function safeLogoFilename(name: string): string {
  const base = name.trim().replace(/^.*[/\\]/, "").replace(/[^\w.-]+/g, "-");
  return base || `logo-${Date.now()}.png`;
}

export function buildStoreLogoStoragePath(
  projectId: string,
  filename: string
): string {
  const safeName = safeLogoFilename(filename);
  return `your-store-logos/${projectId}/${Date.now()}-${safeName}`;
}

export function getStoreLogoPublicUrl(path: string): string {
  if (!supabase) return "";
  const { data } = supabase.storage.from(STORE_ASSETS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function storagePermissionMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/policy|permission|denied|unauthorized|403/i.test(message)) {
    return "Logo upload failed. Check Supabase Storage bucket policies for store-assets.";
  }
  return message;
}

export async function uploadStoreLogo(
  file: File,
  projectId: string,
  existingPath?: string | null
): Promise<StoreLogoMeta> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured.");
  }

  const validationError = validateStoreLogoFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  if (existingPath?.trim()) {
    try {
      await deleteStoreLogo(existingPath);
    } catch {
      // Continue even if the previous object is already gone.
    }
  }

  const extension = extensionForFile(file);
  const filename =
    safeLogoFilename(file.name) ||
    `logo-${Date.now()}.${extension}`;

  const path = buildStoreLogoStoragePath(projectId, filename);
  const contentType =
    file.type || `image/${extension === "jpg" ? "jpeg" : extension}`;

  const { error: uploadError } = await supabase.storage
    .from(STORE_ASSETS_BUCKET)
    .upload(path, file, {
      upsert: false,
      contentType,
    });

  if (uploadError) {
    throw new Error(storagePermissionMessage(uploadError));
  }

  return {
    your_store_logo_url: getStoreLogoPublicUrl(path),
    your_store_logo_path: path,
    your_store_logo_filename: path.split("/").pop() ?? filename,
    your_store_logo_uploaded_at: new Date().toISOString(),
  };
}

export async function deleteStoreLogo(path: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured.");
  }
  if (!path.trim()) return;

  const { error } = await supabase.storage
    .from(STORE_ASSETS_BUCKET)
    .remove([path]);

  if (error) {
    throw new Error(storagePermissionMessage(error));
  }
}
