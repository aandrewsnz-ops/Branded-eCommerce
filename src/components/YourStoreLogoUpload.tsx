import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import {
  deleteStoreLogo,
  uploadStoreLogo,
  type StoreLogoMeta,
} from "../lib/storeLogoStorage";

interface YourStoreLogoUploadProps {
  projectId: string;
  logoUrl?: string | null;
  logoPath?: string | null;
  disabled?: boolean;
  variant?: "default" | "compact";
  onChange: (meta: StoreLogoMeta | null) => void;
}

export function YourStoreLogoUpload({
  projectId,
  logoUrl,
  logoPath,
  disabled = false,
  variant = "default",
  onChange,
}: YourStoreLogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const hasLogo = Boolean(logoUrl?.trim());
  const busy = uploading || removing;
  const isCompact = variant === "compact";

  async function handleFile(file: File) {
    setLocalError(null);
    setUploading(true);
    try {
      const meta = await uploadStoreLogo(file, projectId, logoPath);
      onChange(meta);
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error ? err.message : "Failed to upload logo."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setLocalError(null);
    setRemoving(true);
    try {
      if (logoPath?.trim()) {
        try {
          await deleteStoreLogo(logoPath);
        } catch {
          // Clearing project metadata is still useful if storage delete fails.
        }
      }
      onChange(null);
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error ? err.message : "Failed to remove logo."
      );
    } finally {
      setRemoving(false);
    }
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragOver(false);
    if (disabled || busy) return;
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function onInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void handleFile(file);
  }

  return (
    <div
      className={`store-logo-upload${isCompact ? " is-compact" : ""}`}
    >
      {hasLogo ? (
        <div className="store-logo-preview-wrap">
          <img
            src={logoUrl ?? ""}
            alt="Your store logo preview"
            className="store-logo-preview"
          />
          <div className="store-logo-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={disabled || busy}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 size={13} className="spin" />
              ) : (
                <Upload size={13} strokeWidth={2.5} />
              )}
              {isCompact ? "Replace" : "Replace logo"}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={disabled || busy}
              onClick={() => void handleRemove()}
            >
              {removing ? <Loader2 size={13} className="spin" /> : null}
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`store-logo-dropzone${dragOver ? " is-dragover" : ""}${
            disabled || busy ? " is-disabled" : ""
          }`}
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            if (!disabled && !busy) setDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled && !busy) setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onDrop={onDrop}
        >
          {uploading ? (
            <>
              <Loader2 size={isCompact ? 16 : 18} className="spin" />
              <span>Uploading…</span>
            </>
          ) : (
            <>
              <Upload size={isCompact ? 16 : 18} strokeWidth={1.75} />
              <span>{isCompact ? "Upload logo" : "Upload Your store logo"}</span>
              {!isCompact ? (
                <span className="store-logo-dropzone-hint">
                  PNG, JPG, or WebP · up to 5MB
                </span>
              ) : null}
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,.png,.jpg,.jpeg,.webp"
        className="sr-only"
        onChange={onInputChange}
      />

      {localError ? (
        <p className="store-logo-error" role="alert">
          {localError}
        </p>
      ) : null}
    </div>
  );
}
