import { useMemo, useState } from "react";
import { LayoutTemplate, Loader2 } from "lucide-react";
import type { ProductPageSection, ProductPageSet } from "../types";
import { uploadProductPageImage } from "../lib/adImageStorage";
import { ProductPagePreview } from "./ProductPagePreview";
import { ProductPageSectionInspector } from "./ProductPageSectionInspector";

interface ProductPageWorkspaceProps {
  productPageSet: ProductPageSet | null;
  projectId: string;
  isCreating: boolean;
  error: string | null;
  canCreate: boolean;
  onCreate: () => void;
  onPatchSection: (
    sectionId: string,
    patch: Partial<ProductPageSection>
  ) => Promise<void>;
}

export function ProductPageWorkspace({
  productPageSet,
  projectId,
  isCreating,
  error,
  canCreate,
  onCreate,
  onPatchSection,
}: ProductPageWorkspaceProps) {
  const [inspectorSectionId, setInspectorSectionId] = useState<string | null>(
    null
  );
  const [uploadError, setUploadError] = useState<string | null>(null);

  const sections = productPageSet?.content.sections ?? [];

  const inspectorSection = useMemo(
    () => sections.find((section) => section.id === inspectorSectionId) ?? null,
    [sections, inspectorSectionId]
  );

  async function handleUploadSectionImage(
    section: ProductPageSection,
    file: File
  ) {
    setUploadError(null);
    try {
      const meta = await uploadProductPageImage(
        file,
        projectId,
        section.id,
        section.image_filename,
        section.image_path ?? undefined
      );
      await onPatchSection(section.id, {
        image_url: meta.image_url,
        image_path: meta.image_path,
        image_filename: meta.image_filename,
        image_uploaded_at: meta.image_uploaded_at,
        image_file_type: meta.image_file_type,
      });
    } catch (err: unknown) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload image."
      );
    }
  }

  return (
    <div className="workspace workspace-full product-page-workspace">
      <div className="workspace-head">
        <div>
          <h2 className="workspace-title">Product Page</h2>
          <p className="workspace-sub">
            Build a Shopify-ready product page from structured sections.
          </p>
        </div>
        {!productPageSet ? (
          <div className="workspace-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!canCreate || isCreating}
              onClick={onCreate}
            >
              {isCreating ? (
                <Loader2 size={14} strokeWidth={2.5} className="spin" />
              ) : (
                <LayoutTemplate size={14} strokeWidth={2.5} />
              )}
              {isCreating ? "Creating…" : "Create Product Page Template"}
            </button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="banner banner-error" role="alert">
          {error}
        </div>
      ) : null}

      {uploadError ? (
        <div className="banner banner-error" role="alert">
          {uploadError}
        </div>
      ) : null}

      {!productPageSet ? (
        <div className="empty-state">
          <LayoutTemplate size={36} strokeWidth={1.5} />
          <p>No product page template yet.</p>
          <p className="empty-state-sub">
            Create a starter template to preview your Shopify product page layout
            here, then polish each section.
          </p>
        </div>
      ) : (
        <div
          className={`product-page-editor${inspectorSection ? " has-inspector" : ""}`}
        >
          <div className="product-page-canvas">
            <ProductPagePreview
              sections={sections}
              disabled={isCreating}
              onEditSection={(section) => setInspectorSectionId(section.id)}
              onUploadSectionImage={handleUploadSectionImage}
            />
          </div>
          {inspectorSection ? (
            <ProductPageSectionInspector
              section={inspectorSection}
              projectId={projectId}
              disabled={isCreating}
              onClose={() => setInspectorSectionId(null)}
              onPatch={(patch) => onPatchSection(inspectorSection.id, patch)}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
