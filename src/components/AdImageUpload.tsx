import { useRef, useState } from "react";
import { ExternalLink, Loader2, Upload } from "lucide-react";
import type { AdVariation } from "../types";
import {
  clearAdImageFields,
  deleteAdImage,
  uploadAdImage,
} from "../lib/adImageStorage";

interface AdImageUploadProps {
  adIndex: number;
  ad: AdVariation;
  projectId: string;
  safeFilename: string;
  disabled?: boolean;
  onUpdate: (updatedAd: AdVariation) => Promise<void>;
}

export function AdImageUpload({
  adIndex,
  ad,
  projectId,
  safeFilename,
  disabled = false,
  onUpdate,
}: AdImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localWarning, setLocalWarning] = useState<string | null>(null);

  const hasImage = Boolean(ad.image_url?.trim());
  const busy = uploading || removing;

  async function handleFile(file: File) {
    setLocalError(null);
    setLocalWarning(null);
    setUploading(true);
    try {
      const meta = await uploadAdImage(
        file,
        projectId,
        safeFilename,
        ad.image_path
      );
      await onUpdate({ ...ad, ...meta });
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error ? err.message : "Failed to upload image."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setLocalError(null);
    setLocalWarning(null);
    setRemoving(true);
    let storageWarning: string | null = null;

    if (ad.image_path?.trim()) {
      try {
        await deleteAdImage(ad.image_path);
      } catch (err: unknown) {
        storageWarning =
          err instanceof Error
            ? `${err.message} The image reference will still be cleared.`
            : "Could not delete the file from storage. The image reference will still be cleared.";
      }
    }

    try {
      await onUpdate(clearAdImageFields(ad));
      if (storageWarning) setLocalWarning(storageWarning);
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error ? err.message : "Failed to remove image."
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
    <div className="ad-image-upload">
      <span className="copy-pack-label">Uploaded Image</span>

      {hasImage ? (
        <div className="ad-image-preview-wrap">
          <img
            src={ad.image_url}
            alt={`Ad ${adIndex + 1} uploaded creative`}
            className="ad-image-preview"
          />
          <div className="ad-image-actions">
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
              Replace Image
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={disabled || busy}
              onClick={() => void handleRemove()}
            >
              {removing ? (
                <Loader2 size={13} className="spin" />
              ) : null}
              Remove Image
            </button>
            {ad.image_url ? (
              <a
                href={ad.image_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm ad-image-open-link"
              >
                <ExternalLink size={13} strokeWidth={2.5} />
                Open Image
              </a>
            ) : null}
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`ad-image-dropzone${dragOver ? " is-dragover" : ""}${
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
              <Loader2 size={20} className="spin" />
              <span>Uploading…</span>
            </>
          ) : (
            <>
              <Upload size={20} strokeWidth={1.75} />
              <span className="ad-image-dropzone-title">
                Drop generated image here
              </span>
              <span className="ad-image-dropzone-sub">or click to upload</span>
              <span className="ad-image-dropzone-hint">PNG, JPG, WebP · max 10MB</span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,.png,.jpg,.jpeg,.webp"
        className="ad-image-input"
        onChange={onInputChange}
        tabIndex={-1}
      />

      {localError ? (
        <p className="ad-image-message ad-image-message-error" role="alert">
          {localError}
        </p>
      ) : null}
      {localWarning ? (
        <p className="ad-image-message ad-image-message-warning" role="status">
          {localWarning}
        </p>
      ) : null}
    </div>
  );
}
