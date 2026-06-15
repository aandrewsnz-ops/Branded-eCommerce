import { useMemo, useState } from "react";
import {
  Check,
  Globe,
  ImageIcon,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Share2,
  Star,
  ThumbsUp,
  X,
} from "lucide-react";
import type {
  AdCopySet,
  AdVariation,
  DesireConceptSet,
  MarketingAngle,
  MassDesire,
  ProductProject,
} from "../types";
import {
  flattenViewAds,
  finalAdKey,
  type FinalAd,
} from "../lib/finalAds";
import { displayYourStoreUrl } from "../lib/projectSetupFields";
import {
  saveFinalAdCopy,
  toggleFinalAdPublishStar,
  type AdCopyDraft,
} from "../lib/saveFinalAdCopy";

interface ViewAdsWorkspaceProps {
  project: ProductProject;
  desires: MassDesire[];
  angles: MarketingAngle[];
  copySets: AdCopySet[];
  conceptSets: DesireConceptSet[];
  onGoToReviewAds: () => void;
  onSaveCopyPack: (
    copySet: AdCopySet,
    adVariations: AdVariation[]
  ) => Promise<AdCopySet>;
  onUpdateTofConceptCopy: (
    conceptId: string,
    copy: AdCopyDraft
  ) => Promise<void>;
}

function storeDisplayName(project: ProductProject): string {
  return project.your_store_name?.trim() || "Your store";
}

function storeSiteLabel(project: ProductProject): string {
  const display = displayYourStoreUrl(project.your_store_url);
  return display || "yourstore.com";
}

function storeInitial(project: ProductProject): string {
  const name = storeDisplayName(project);
  return name.charAt(0).toUpperCase() || "Y";
}

function previewAdFromDraft(ad: FinalAd, draft: AdCopyDraft): FinalAd {
  return {
    ...ad,
    primary: draft.primary,
    headline: draft.headline,
    description: draft.description,
  };
}

interface FacebookAdPreviewProps {
  ad: FinalAd;
  project: ProductProject;
}

function FacebookAdPreview({ ad, project }: FacebookAdPreviewProps) {
  const storeName = storeDisplayName(project);
  const siteLabel = storeSiteLabel(project);
  const logoUrl = project.your_store_logo_url?.trim();

  return (
    <article className="fb-ad-preview" aria-label={`Ad preview: ${ad.ad_name}`}>
      <header className="fb-ad-header">
        <div className="fb-ad-header-left">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="fb-ad-avatar fb-ad-avatar-img"
            />
          ) : (
            <span className="fb-ad-avatar fb-ad-avatar-fallback" aria-hidden>
              {storeInitial(project)}
            </span>
          )}
          <div className="fb-ad-header-text">
            <span className="fb-ad-store-name">{storeName}</span>
            <span className="fb-ad-sponsored">
              <span>Ad</span>
              <span className="fb-ad-sponsored-dot" aria-hidden>
                ·
              </span>
              <Globe size={11} strokeWidth={2} aria-hidden />
            </span>
          </div>
        </div>
        <div className="fb-ad-header-actions" aria-hidden>
          <MoreHorizontal size={14} strokeWidth={2} />
          <X size={14} strokeWidth={2} />
        </div>
      </header>

      {ad.primary.trim() ? (
        <p className="fb-ad-primary">{ad.primary}</p>
      ) : null}

      <div className="fb-ad-image-wrap">
        <img
          src={ad.image_url}
          alt=""
          className="fb-ad-image"
          loading="lazy"
        />
      </div>

      <div className="fb-ad-link-preview">
        <div className="fb-ad-link-text">
          <span className="fb-ad-site-url">{siteLabel.toUpperCase()}</span>
          {ad.headline.trim() ? (
            <span className="fb-ad-headline">{ad.headline}</span>
          ) : null}
          {ad.description.trim() ? (
            <span className="fb-ad-description">{ad.description}</span>
          ) : null}
        </div>
        <span className="fb-ad-shop-btn">Shop now</span>
      </div>

      <div className="fb-ad-divider" aria-hidden />

      <footer className="fb-ad-actions">
        <span className="fb-ad-action">
          <ThumbsUp size={12} strokeWidth={2} />
          Like
        </span>
        <span className="fb-ad-action">
          <MessageCircle size={12} strokeWidth={2} />
          Comment
        </span>
        <span className="fb-ad-action">
          <Share2 size={12} strokeWidth={2} />
          Share
        </span>
      </footer>

      <div className="fb-ad-spacer" aria-hidden />
    </article>
  );
}

interface ViewAdEditPanelProps {
  draft: AdCopyDraft;
  saving: boolean;
  error: string | null;
  saved: boolean;
  onChange: (draft: AdCopyDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}

function ViewAdEditPanel({
  draft,
  saving,
  error,
  saved,
  onChange,
  onSave,
  onCancel,
}: ViewAdEditPanelProps) {
  return (
    <div className="view-ads-edit-panel" role="region" aria-label="Edit ad copy">
      <div className="view-ads-edit-fields">
        <label className="view-ads-edit-field">
          <span className="view-ads-edit-label">Primary</span>
          <textarea
            className="view-ads-edit-textarea"
            rows={4}
            value={draft.primary}
            disabled={saving}
            onChange={(e) =>
              onChange({ ...draft, primary: e.target.value })
            }
          />
        </label>
        <label className="view-ads-edit-field">
          <span className="view-ads-edit-label">Headline</span>
          <input
            type="text"
            className="view-ads-edit-input"
            value={draft.headline}
            disabled={saving}
            onChange={(e) =>
              onChange({ ...draft, headline: e.target.value })
            }
          />
        </label>
        <label className="view-ads-edit-field">
          <span className="view-ads-edit-label">Description</span>
          <textarea
            className="view-ads-edit-textarea view-ads-edit-textarea-sm"
            rows={2}
            value={draft.description}
            disabled={saving}
            onChange={(e) =>
              onChange({ ...draft, description: e.target.value })
            }
          />
        </label>
      </div>
      <div className="view-ads-edit-actions">
        <button
          type="button"
          className="btn btn-primary btn-sm view-ads-edit-save"
          disabled={saving}
          onClick={onSave}
        >
          {saving ? (
            <Loader2 size={13} className="spin" />
          ) : (
            <Check size={13} strokeWidth={2.5} />
          )}
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm view-ads-edit-cancel"
          disabled={saving}
          onClick={onCancel}
        >
          <X size={13} strokeWidth={2.5} />
          Cancel
        </button>
        {saved ? (
          <span className="view-ads-edit-saved" role="status">
            Saved
          </span>
        ) : null}
      </div>
      {error ? (
        <p className="view-ads-edit-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ViewAdsWorkspace({
  project,
  desires,
  angles,
  copySets,
  conceptSets,
  onGoToReviewAds,
  onSaveCopyPack,
  onUpdateTofConceptCopy,
}: ViewAdsWorkspaceProps) {
  const previewAds = useMemo(
    () => flattenViewAds(desires, angles, copySets, conceptSets),
    [desires, angles, copySets, conceptSets]
  );

  const copySetById = useMemo(() => {
    const map = new Map<string, AdCopySet>();
    for (const set of copySets) map.set(set.id, set);
    return map;
  }, [copySets]);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<AdCopyDraft | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [starringKey, setStarringKey] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  function startEditing(ad: FinalAd) {
    const key = finalAdKey(ad);
    setEditingKey(key);
    setEditDraft({
      primary: ad.primary,
      headline: ad.headline,
      description: ad.description,
    });
    setSaveError(null);
    setSavedKey(null);
  }

  function cancelEditing() {
    setEditingKey(null);
    setEditDraft(null);
    setSaveError(null);
    setSavedKey(null);
  }

  async function handleSave(ad: FinalAd) {
    if (!editDraft) return;
    const key = finalAdKey(ad);
    setSavingKey(key);
    setSaveError(null);
    setSavedKey(null);
    try {
      await saveFinalAdCopy(ad, editDraft, {
        copySetById,
        onSaveCopyPack,
        onUpdateTofConceptCopy,
      });
      setSavedKey(key);
      setEditingKey(null);
      setEditDraft(null);
      window.setTimeout(() => {
        setSavedKey((current) => (current === key ? null : current));
      }, 2000);
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save ad copy."
      );
    } finally {
      setSavingKey(null);
    }
  }

  async function handleToggleStar(ad: FinalAd) {
    const key = finalAdKey(ad);
    setStarringKey(key);
    setActionError(null);
    try {
      await toggleFinalAdPublishStar(ad, {
        copySetById,
        onSaveCopyPack,
      });
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Failed to update star."
      );
    } finally {
      setStarringKey(null);
    }
  }

  return (
    <div className="workspace workspace-full view-ads-workspace">
      <div className="workspace-head">
        <div>
          <h2 className="workspace-title">View Ads</h2>
          <p className="workspace-sub">
            Static feed-style previews using Your store branding and saved ad
            copy. Not connected to Meta.
          </p>
        </div>
      </div>

      {actionError ? (
        <div className="banner banner-error" role="alert">
          {actionError}
        </div>
      ) : null}

      {previewAds.length === 0 ? (
        <div className="empty-state">
          <ImageIcon size={32} strokeWidth={1.5} />
          <p>No ad previews yet.</p>
          <p className="empty-state-sub">
            Upload images in Review Ads first.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onGoToReviewAds}
          >
            Go to Review Ads
          </button>
        </div>
      ) : (
        <>
          <p className="view-ads-summary">
            {previewAds.length} ad preview
            {previewAds.length === 1 ? "" : "s"} · {storeDisplayName(project)} ·{" "}
            {storeSiteLabel(project)}
          </p>
          <div className="view-ads-grid">
            {previewAds.map((ad) => {
              const key = finalAdKey(ad);
              const isEditing = editingKey === key;
              const isSaving = savingKey === key;
              const isStarring = starringKey === key;
              const showSaved = savedKey === key && !isEditing;
              const controlsDisabled =
                (editingKey !== null && editingKey !== key) ||
                (starringKey !== null && starringKey !== key);
              const displayAd =
                isEditing && editDraft ? previewAdFromDraft(ad, editDraft) : ad;

              return (
                <div key={key} className="view-ads-item">
                  <div className="view-ads-item-head">
                    <p className="view-ads-label">{ad.ad_name}</p>
                    {!isEditing ? (
                      <div className="view-ads-title-actions">
                        {showSaved ? (
                          <span className="view-ads-saved-badge" role="status">
                            Saved
                          </span>
                        ) : null}
                        {ad.source_type === "angle" ? (
                          <button
                            type="button"
                            className={`view-ads-icon-btn view-ads-star-btn${
                              ad.is_winner ? " is-starred" : ""
                            }`}
                            title={
                              ad.is_winner
                                ? "Selected for publish"
                                : "Star for publish"
                            }
                            aria-label={
                              ad.is_winner
                                ? "Selected for publish"
                                : "Star for publish"
                            }
                            aria-pressed={ad.is_winner}
                            disabled={controlsDisabled || isStarring}
                            onClick={() => void handleToggleStar(ad)}
                          >
                            {isStarring ? (
                              <Loader2 size={14} strokeWidth={2.5} className="spin" />
                            ) : (
                              <Star
                                size={14}
                                strokeWidth={2}
                                fill={ad.is_winner ? "currentColor" : "none"}
                              />
                            )}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="view-ads-icon-btn view-ads-edit-icon-btn"
                          title="Edit copy"
                          aria-label="Edit copy"
                          disabled={controlsDisabled}
                          onClick={() => startEditing(ad)}
                        >
                          <Pencil size={14} strokeWidth={2} />
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {isEditing && editDraft ? (
                    <ViewAdEditPanel
                      draft={editDraft}
                      saving={isSaving}
                      error={saveError}
                      saved={false}
                      onChange={setEditDraft}
                      onSave={() => void handleSave(ad)}
                      onCancel={cancelEditing}
                    />
                  ) : null}

                  <FacebookAdPreview ad={displayAd} project={project} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
