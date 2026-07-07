import { useEffect, useRef, useState } from "react";
import { Download, Loader2, Upload, X } from "lucide-react";
import type { ProductPageSection } from "../types";
import { renderProductPageSectionLiquid } from "../lib/productPageLiquid";
import { CopyButton } from "./shared";
import {
  deleteAdImage,
  uploadProductPageImage,
} from "../lib/adImageStorage";
import { downloadImageAs } from "../lib/finalAds";

interface ProductPageSectionInspectorProps {
  section: ProductPageSection;
  projectId: string;
  disabled?: boolean;
  onClose: () => void;
  onPatch: (patch: Partial<ProductPageSection>) => Promise<void>;
}

export function ProductPageSectionInspector({
  section,
  projectId,
  disabled = false,
  onClose,
  onPatch,
}: ProductPageSectionInspectorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [shopifyUrlDraft, setShopifyUrlDraft] = useState(
    section.shopify_image_url ?? ""
  );
  const [headlineDraft, setHeadlineDraft] = useState(section.headline);
  const [proofLineDraft, setProofLineDraft] = useState(section.proof_line ?? "");
  const [bodyDraft, setBodyDraft] = useState(
    (section.body_paragraphs ?? []).join("\n\n")
  );
  const [imagePromptDraft, setImagePromptDraft] = useState(section.image_prompt);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const hasUploadedImage = Boolean(section.image_url?.trim());
  const busy = disabled || uploading || downloading || saving;

  useEffect(() => {
    setShopifyUrlDraft(section.shopify_image_url ?? "");
    setHeadlineDraft(section.headline);
    setProofLineDraft(section.proof_line ?? "");
    setBodyDraft((section.body_paragraphs ?? []).join("\n\n"));
    setImagePromptDraft(section.image_prompt);
  }, [section]);

  async function handleUpload(file: File) {
    setLocalError(null);
    setUploading(true);
    try {
      const meta = await uploadProductPageImage(
        file,
        projectId,
        section.id,
        section.image_filename,
        section.image_path ?? undefined
      );
      await onPatch({
        image_url: meta.image_url,
        image_path: meta.image_path,
        image_filename: meta.image_filename,
        image_uploaded_at: meta.image_uploaded_at,
        image_file_type: meta.image_file_type,
      });
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error ? err.message : "Failed to upload image."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload() {
    if (!section.image_url?.trim()) return;
    setLocalError(null);
    setDownloading(true);
    try {
      await downloadImageAs(section.image_url, section.image_filename);
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error ? err.message : "Failed to download image."
      );
    } finally {
      setDownloading(false);
    }
  }

  async function handleSaveShopifyUrl() {
    setLocalError(null);
    setSaving(true);
    try {
      await onPatch({ shopify_image_url: shopifyUrlDraft.trim() });
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error ? err.message : "Failed to save Shopify URL."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCopy() {
    setLocalError(null);
    setSaving(true);
    try {
      await onPatch({
        headline: headlineDraft,
        proof_line: proofLineDraft,
        body_paragraphs: bodyDraft
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter(Boolean),
        image_prompt: imagePromptDraft,
      });
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error ? err.message : "Failed to save section copy."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveImage() {
    if (!section.image_path?.trim()) return;
    setLocalError(null);
    setUploading(true);
    try {
      try {
        await deleteAdImage(section.image_path);
      } catch {
        // Clear reference even if storage delete fails.
      }
      await onPatch({
        image_url: "",
        image_path: "",
        image_filename: section.image_filename,
        image_uploaded_at: "",
        image_file_type: "",
      });
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error ? err.message : "Failed to remove image."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <aside className="pp-inspector" aria-label="Section editor">
      <header className="pp-inspector-head">
        <div>
          <p className="pp-inspector-kicker">
            {section.order}. {section.shopify_section_name}
          </p>
          <h3 className="pp-inspector-title">{section.section_title}</h3>
        </div>
        <button
          type="button"
          className="pp-inspector-close"
          onClick={onClose}
          aria-label="Close section editor"
        >
          <X size={16} />
        </button>
      </header>

      <div className="pp-inspector-body">
        <label className="pp-inspector-field">
          <span className="pp-inspector-label">Headline</span>
          <input
            className="pp-inspector-input"
            value={headlineDraft}
            disabled={busy}
            onChange={(e) => setHeadlineDraft(e.target.value)}
          />
        </label>

        {section.proof_line !== undefined ? (
          <label className="pp-inspector-field">
            <span className="pp-inspector-label">Proof line</span>
            <input
              className="pp-inspector-input"
              value={proofLineDraft}
              disabled={busy}
              onChange={(e) => setProofLineDraft(e.target.value)}
            />
          </label>
        ) : null}

        <label className="pp-inspector-field">
          <span className="pp-inspector-label">Body copy</span>
          <textarea
            className="pp-inspector-textarea"
            rows={5}
            value={bodyDraft}
            disabled={busy}
            onChange={(e) => setBodyDraft(e.target.value)}
          />
        </label>

        {section.image_required ? (
          <label className="pp-inspector-field">
            <span className="pp-inspector-label">Image prompt</span>
            <textarea
              className="pp-inspector-textarea"
              rows={4}
              value={imagePromptDraft}
              disabled={busy}
              onChange={(e) => setImagePromptDraft(e.target.value)}
            />
          </label>
        ) : null}

        {section.image_required ? (
          <div className="pp-inspector-block">
            <span className="pp-inspector-label">Image filename</span>
            <code className="pp-inspector-filename">{section.image_filename}</code>

            <div className="pp-inspector-actions">
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 size={14} className="spin" />
                ) : (
                  <Upload size={14} />
                )}
                Upload image
              </button>
              {hasUploadedImage ? (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={busy}
                    onClick={() => void handleDownload()}
                  >
                    {downloading ? (
                      <Loader2 size={14} className="spin" />
                    ) : (
                      <Download size={14} />
                    )}
                    Download
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={busy}
                    onClick={() => void handleRemoveImage()}
                  >
                    Remove
                  </button>
                </>
              ) : null}
              <CopyButton
                text={imagePromptDraft}
                label="Copy Image Prompt"
                variant="primary"
              />
            </div>

            <label className="pp-inspector-field">
              <span className="pp-inspector-label">Shopify image URL</span>
              <p className="pp-inspector-hint">
                Upload the image to Shopify Files, then paste the CDN URL here.
              </p>
              <input
                className="pp-inspector-input"
                value={shopifyUrlDraft}
                disabled={busy}
                placeholder="https://cdn.shopify.com/..."
                onChange={(e) => setShopifyUrlDraft(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={busy}
              onClick={() => void handleSaveShopifyUrl()}
            >
              {saving ? <Loader2 size={14} className="spin" /> : null}
              Save Shopify URL
            </button>
          </div>
        ) : null}

        <div className="pp-inspector-foot">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy}
            onClick={() => void handleSaveCopy()}
          >
            {saving ? <Loader2 size={14} className="spin" /> : null}
            Save copy
          </button>
          <CopyButton
            text={renderProductPageSectionLiquid(section)}
            label="Copy Custom Liquid"
            variant="description"
          />
        </div>

        {localError ? (
          <p className="pp-inspector-error" role="alert">
            {localError}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
