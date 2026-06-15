import { useRef, useState } from "react";
import { Download, ExternalLink, Loader2, Upload } from "lucide-react";
import type { DesireConcept } from "../types";
import {
  clearTofImageFields,
  deleteAdImage,
  uploadTofAdImage,
} from "../lib/adImageStorage";
import { downloadImageAs } from "../lib/finalAds";

interface TofImageUploadProps {
  concept: DesireConcept;
  conceptLabel: string;
  projectId: string;
  massDesireId: string;
  safeFilename: string;
  disabled?: boolean;
  onUpdate: (updatedConcept: DesireConcept) => Promise<void>;
}

export function TofImageUpload({
  concept,
  conceptLabel,
  projectId,
  massDesireId,
  safeFilename,
  disabled = false,
  onUpdate,
}: TofImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localWarning, setLocalWarning] = useState<string | null>(null);

  const hasImage = Boolean(concept.image_url?.trim());
  const busy = uploading || removing || downloading;

  async function handleFile(file: File) {
    setLocalError(null);
    setLocalWarning(null);
    setUploading(true);
    try {
      const meta = await uploadTofAdImage(
        file,
        projectId,
        massDesireId,
        safeFilename,
        concept.image_path ?? undefined
      );
      await onUpdate({ ...concept, ...meta });
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

    if (concept.image_path?.trim()) {
      try {
        await deleteAdImage(concept.image_path);
      } catch (err: unknown) {
        storageWarning =
          err instanceof Error
            ? `${err.message} The image reference will still be cleared.`
            : "Could not delete the file from storage. The image reference will still be cleared.";
      }
    }

    try {
      await onUpdate(clearTofImageFields(concept));
      if (storageWarning) setLocalWarning(storageWarning);
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error ? err.message : "Failed to remove image."
      );
    } finally {
      setRemoving(false);
    }
  }

  async function handleDownload() {
    if (!concept.image_url?.trim()) return;
    setLocalError(null);
    setDownloading(true);
    try {
      await downloadImageAs(concept.image_url, safeFilename);
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error ? err.message : "Download failed."
      );
    } finally {
      setDownloading(false);
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
            src={concept.image_url ?? ""}
            alt={`${conceptLabel} uploaded creative`}
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
              {removing ? <Loader2 size={13} className="spin" /> : null}
              Remove Image
            </button>
            {concept.image_url ? (
              <a
                href={concept.image_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm ad-image-open-link"
              >
                <ExternalLink size={13} strokeWidth={2.5} />
                Open Image
              </a>
            ) : null}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={disabled || busy}
              onClick={() => void handleDownload()}
            >
              {downloading ? (
                <Loader2 size={13} className="spin" />
              ) : (
                <Download size={13} strokeWidth={2.5} />
              )}
              Download Image
            </button>
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
