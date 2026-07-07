import { useEffect, useRef, useState } from "react";
import { Download, Loader2, Upload } from "lucide-react";
import type { ProductPageSection } from "../types";
import { CopyButton } from "./shared";
import {
  deleteAdImage,
  uploadProductPageImage,
} from "../lib/adImageStorage";
import { downloadImageAs } from "../lib/finalAds";

interface ProductPageSectionCardProps {
  section: ProductPageSection;
  projectId: string;
  disabled?: boolean;
  onPatch: (patch: Partial<ProductPageSection>) => Promise<void>;
}

export function ProductPageSectionCard({
  section,
  projectId,
  disabled = false,
  onPatch,
}: ProductPageSectionCardProps) {
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
    <article className="product-page-section-card">
      <header className="product-page-section-head">
        <div>
          <p className="product-page-section-kicker">
            {section.order}. {section.shopify_section_name}
          </p>
          <h3 className="product-page-section-title">{section.section_title}</h3>
          <p className="product-page-section-purpose">{section.purpose}</p>
        </div>
        <span className="meta-chip">{section.section_type}</span>
      </header>

      <div className="product-page-section-fields">
        <label className="product-page-field">
          <span className="product-page-field-label">Headline</span>
          <input
            className="product-page-input"
            value={headlineDraft}
            disabled={busy}
            onChange={(e) => setHeadlineDraft(e.target.value)}
          />
        </label>
        {section.proof_line !== undefined ? (
          <label className="product-page-field">
            <span className="product-page-field-label">Proof line</span>
            <input
              className="product-page-input"
              value={proofLineDraft}
              disabled={busy}
              onChange={(e) => setProofLineDraft(e.target.value)}
            />
          </label>
        ) : null}
        <label className="product-page-field">
          <span className="product-page-field-label">Body copy</span>
          <textarea
            className="product-page-textarea"
            rows={4}
            value={bodyDraft}
            disabled={busy}
            onChange={(e) => setBodyDraft(e.target.value)}
          />
        </label>
        {section.image_required ? (
          <label className="product-page-field">
            <span className="product-page-field-label">Image prompt</span>
            <textarea
              className="product-page-textarea"
              rows={5}
              value={imagePromptDraft}
              disabled={busy}
              onChange={(e) => setImagePromptDraft(e.target.value)}
            />
          </label>
        ) : null}
      </div>

      {(section.bullets ?? []).length > 0 ? (
        <ul className="product-page-bullets">
          {section.bullets.map((bullet, index) => (
            <li key={index}>{bullet}</li>
          ))}
        </ul>
      ) : null}

      {section.image_required ? (
        <div className="product-page-image-block">
          <div className="product-page-image-meta">
            <span className="product-page-field-label">Image filename</span>
            <code className="product-page-filename">{section.image_filename}</code>
          </div>

          <div className="product-page-image-preview">
            {hasUploadedImage ? (
              <img src={section.image_url!} alt="" className="product-page-image" />
            ) : (
              <div className="product-page-image-placeholder">
                Image placeholder — {section.image_role || "UGC image"}
              </div>
            )}
          </div>

          <div className="product-page-image-actions">
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

          <label className="product-page-field">
            <span className="product-page-field-label">Shopify image URL</span>
            <p className="product-page-field-hint">
              Upload the image to Shopify Files, then paste the CDN URL here.
            </p>
            <input
              className="product-page-input"
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

      <div className="product-page-section-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={busy}
          onClick={() => void handleSaveCopy()}
        >
          {saving ? <Loader2 size={14} className="spin" /> : null}
          Save copy
        </button>
        <CopyButton
          text={section.custom_liquid}
          label="Copy Custom Liquid"
          variant="description"
        />
      </div>

      {localError ? (
        <p className="product-page-section-error" role="alert">
          {localError}
        </p>
      ) : null}
    </article>
  );
}
