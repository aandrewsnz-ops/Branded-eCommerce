import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Save } from "lucide-react";
import type { ProductProject } from "../types";
import {
  projectToSetupDraft,
  sanitizeSetupUpdate,
  type ProductProjectUpdate,
} from "../lib/projectSetupFields";
import type { StoreLogoMeta } from "../lib/storeLogoStorage";
import { isSupabaseConfigured } from "../lib/supabase";
import { YourStoreLogoUpload } from "./YourStoreLogoUpload";
import { AutoResizeTextarea } from "./AutoResizeTextarea";

/** Minimum textarea heights for auto-resize setup fields (px). */
const SETUP_TEXTAREA_MIN = {
  urls: 100,
  supplierDescription: 180,
  competitorDescription: 220,
  hypothesis: 140,
} as const;

interface SetupWorkspaceProps {
  project: ProductProject;
  isSaving: boolean;
  saveError: string | null;
  onSave: (patch: ProductProjectUpdate) => Promise<void>;
}

type TextareaSize = keyof typeof SETUP_TEXTAREA_MIN;

interface SetupFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  textareaSize?: TextareaSize;
  placeholder?: string;
  disabled?: boolean;
}

function SetupField({
  label,
  value,
  onChange,
  multiline = false,
  textareaSize,
  placeholder,
  disabled = false,
}: SetupFieldProps) {
  const textareaClass = "setup-input setup-textarea setup-textarea-auto";

  return (
    <label className="setup-field">
      <span className="setup-field-label">{label}</span>
      {multiline ? (
        <AutoResizeTextarea
          className={textareaClass}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          minHeight={
            textareaSize ? SETUP_TEXTAREA_MIN[textareaSize] : 120
          }
          onChange={onChange}
        />
      ) : (
        <input
          className="setup-input"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

function SetupSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="setup-section">
      <header className="setup-section-head">
        <h3 className="setup-section-title">{title}</h3>
        {description ? (
          <p className="setup-section-desc">{description}</p>
        ) : null}
      </header>
      <div className="setup-section-body">{children}</div>
    </section>
  );
}

export function SetupWorkspace({
  project,
  isSaving,
  saveError,
  onSave,
}: SetupWorkspaceProps) {
  const [draft, setDraft] = useState<ProductProjectUpdate>(() =>
    projectToSetupDraft(project)
  );
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(projectToSetupDraft(project));
    setDirty(false);
  }, [project]);

  function updateDraft<K extends keyof ProductProjectUpdate>(
    key: K,
    value: ProductProjectUpdate[K]
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function handleLogoChange(meta: StoreLogoMeta | null) {
    if (meta) {
      setDraft((prev) => ({
        ...prev,
        your_store_logo_url: meta.your_store_logo_url,
        your_store_logo_path: meta.your_store_logo_path,
        your_store_logo_filename: meta.your_store_logo_filename,
        your_store_logo_uploaded_at: meta.your_store_logo_uploaded_at,
      }));
    } else {
      setDraft((prev) => ({
        ...prev,
        your_store_logo_url: null,
        your_store_logo_path: null,
        your_store_logo_filename: null,
        your_store_logo_uploaded_at: null,
      }));
    }
    setDirty(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave(sanitizeSetupUpdate(draft));
    setDirty(false);
  }

  const logoUploadDisabled = isSaving || !isSupabaseConfigured;

  return (
    <form className="workspace workspace-full setup-form" onSubmit={handleSubmit}>
      <div className="setup-brief">
        <div className="workspace-head setup-page-head">
          <div>
            <h2 className="workspace-title">Project setup</h2>
            <p className="workspace-sub">
              Editable project brief. Changes here do not reset downstream
              workflow data.
            </p>
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={isSaving || !dirty}
          >
            {isSaving ? (
              <Loader2 size={14} strokeWidth={2.5} className="spin" />
            ) : (
              <Save size={14} strokeWidth={2.5} />
            )}
            {isSaving ? "Saving…" : "Save changes"}
          </button>
        </div>

        {saveError ? (
          <div className="banner banner-error" role="alert">
            <AlertTriangle size={16} />
            <span>{saveError}</span>
          </div>
        ) : null}

        {!isSupabaseConfigured ? (
          <div className="banner banner-info" role="status">
            <AlertTriangle size={16} />
            <span>
              Supabase is not configured. Setup edits are kept in memory only
              for this session.
            </span>
          </div>
        ) : null}

        <p className="setup-brief-note">
          “Our product name” is used later for copy and publishing — not as a
          research search term.
        </p>

        <div className="setup-sections">
          <SetupSection
            title="Your store branding"
            description="Used later for ad previews."
          >
            <div className="setup-branding-grid">
              <SetupField
                label="Your store name"
                value={draft.your_store_name}
                placeholder="Westward Vault"
                disabled={isSaving}
                onChange={(value) => updateDraft("your_store_name", value)}
              />
              <SetupField
                label="Your store URL"
                value={draft.your_store_url}
                placeholder="https://westwardvault.com"
                disabled={isSaving}
                onChange={(value) => updateDraft("your_store_url", value)}
              />
              <div className="setup-field setup-branding-logo">
                <span className="setup-field-label">Your store logo</span>
                <YourStoreLogoUpload
                  projectId={project.id}
                  logoUrl={draft.your_store_logo_url}
                  logoPath={draft.your_store_logo_path}
                  disabled={logoUploadDisabled}
                  variant="compact"
                  onChange={handleLogoChange}
                />
              </div>
            </div>
          </SetupSection>

          <SetupSection title="Product basics">
            <div className="setup-short-grid setup-short-grid-3">
              <SetupField
                label="Our product name"
                value={draft.our_product_name}
                disabled={isSaving}
                onChange={(value) => updateDraft("our_product_name", value)}
              />
              <SetupField
                label="Target country"
                value={draft.target_country}
                disabled={isSaving}
                onChange={(value) => updateDraft("target_country", value)}
              />
              <SetupField
                label="Cost price (incl. shipping)"
                value={draft.cost_price_including_shipping}
                disabled={isSaving}
                onChange={(value) =>
                  updateDraft("cost_price_including_shipping", value)
                }
              />
              <SetupField
                label="Planned sale price"
                value={draft.planned_sale_price}
                disabled={isSaving}
                onChange={(value) => updateDraft("planned_sale_price", value)}
              />
              <SetupField
                label="Current offer"
                value={draft.current_offer}
                disabled={isSaving}
                onChange={(value) => updateDraft("current_offer", value)}
              />
              <SetupField
                label="Supplier product URL"
                value={draft.supplier_product_url}
                disabled={isSaving}
                onChange={(value) => updateDraft("supplier_product_url", value)}
              />
            </div>
          </SetupSection>

          <SetupSection title="Product source details">
            <SetupField
              label="Supplier product description"
              value={draft.supplier_product_description}
              multiline
              textareaSize="supplierDescription"
              disabled={isSaving}
              onChange={(value) =>
                updateDraft("supplier_product_description", value)
              }
            />
          </SetupSection>

          <SetupSection title="Competitor facts">
            <SetupField
              label="Primary competitor URL"
              value={draft.primary_competitor_url}
              disabled={isSaving}
              onChange={(value) => updateDraft("primary_competitor_url", value)}
            />
            <SetupField
              label="Additional competitor URLs"
              value={draft.additional_competitor_urls}
              multiline
              textareaSize="urls"
              disabled={isSaving}
              onChange={(value) =>
                updateDraft("additional_competitor_urls", value)
              }
            />
            <SetupField
              label="Closest competitor product description"
              value={draft.closest_competitor_product_description}
              multiline
              textareaSize="competitorDescription"
              disabled={isSaving}
              onChange={(value) =>
                updateDraft("closest_competitor_product_description", value)
              }
            />
          </SetupSection>

          <SetupSection
            title="Research assumptions"
            description="Optional seeds only. Preferred tone does not override research-derived tone."
          >
            <div className="setup-research-grid">
              <SetupField
                label="Initial problem hypothesis"
                value={draft.initial_problem_hypothesis}
                multiline
                textareaSize="hypothesis"
                disabled={isSaving}
                onChange={(value) =>
                  updateDraft("initial_problem_hypothesis", value)
                }
              />
              <SetupField
                label="Initial customer hypothesis"
                value={draft.initial_customer_hypothesis}
                multiline
                textareaSize="hypothesis"
                disabled={isSaving}
                onChange={(value) =>
                  updateDraft("initial_customer_hypothesis", value)
                }
              />
            </div>
            <SetupField
              label="Preferred tone"
              value={draft.preferred_tone}
              disabled={isSaving}
              onChange={(value) => updateDraft("preferred_tone", value)}
            />
          </SetupSection>
        </div>
      </div>
    </form>
  );
}
