import { useMemo, useState } from "react";
import {
  ImageIcon,
  Layers,
  Loader2,
  Pencil,
  Star,
  Check,
  X,
} from "lucide-react";
import type { AdCopySet, AdVariation, MarketingAngle, MassDesire } from "../types";
import { flattenFinalAds, downloadImageAs } from "../lib/finalAds";
import { patchAdVariation } from "../lib/copyPackAds";
import { CopyButton } from "./shared";

interface AdsWorkspaceProps {
  desires: MassDesire[];
  angles: MarketingAngle[];
  copySets: AdCopySet[];
  onGoToStrategy: () => void;
  onSaveCopyPack: (
    copySet: AdCopySet,
    adVariations: AdVariation[]
  ) => Promise<AdCopySet>;
  onFixImageFilename: (
    copySetId: string,
    adIndex: number,
    safeFilename: string
  ) => Promise<AdCopySet>;
}

interface EditDraft {
  primary: string;
  headline: string;
  description: string;
}

export function AdsWorkspace({
  desires,
  angles,
  copySets,
  onGoToStrategy,
  onSaveCopyPack,
  onFixImageFilename,
}: AdsWorkspaceProps) {
  const finalAds = useMemo(
    () => flattenFinalAds(desires, angles, copySets),
    [desires, angles, copySets]
  );
  const starredCount = useMemo(
    () => finalAds.filter((ad) => ad.is_winner).length,
    [finalAds]
  );

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [starringId, setStarringId] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const copySetById = useMemo(() => {
    const map = new Map<string, AdCopySet>();
    for (const set of copySets) map.set(set.id, set);
    return map;
  }, [copySets]);

  function startEditing(adKey: string, ad: (typeof finalAds)[number]) {
    setEditingKey(adKey);
    setEditDraft({
      primary: ad.primary,
      headline: ad.headline,
      description: ad.description,
    });
    setActionError(null);
  }

  function cancelEditing() {
    setEditingKey(null);
    setEditDraft(null);
  }

  async function handleSaveEdit(ad: (typeof finalAds)[number]) {
    const copySet = copySetById.get(ad.copy_set_id);
    if (!copySet || !editDraft) return;

    const adKey = `${ad.copy_set_id}-${ad.ad_variation_index}`;
    setSavingId(adKey);
    setActionError(null);
    try {
      const nextAds = patchAdVariation(copySet, ad.ad_variation_index, {
        primary: editDraft.primary,
        headline: editDraft.headline,
        description: editDraft.description,
      });
      await onSaveCopyPack(copySet, nextAds);
      setEditingKey(null);
      setEditDraft(null);
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Failed to save ad copy."
      );
    } finally {
      setSavingId(null);
    }
  }

  async function handleToggleStar(ad: (typeof finalAds)[number]) {
    const copySet = copySetById.get(ad.copy_set_id);
    if (!copySet) return;

    const adKey = `${ad.copy_set_id}-${ad.ad_variation_index}`;
    setStarringId(adKey);
    setActionError(null);
    try {
      const nextAds = patchAdVariation(copySet, ad.ad_variation_index, {
        is_winner: !ad.is_winner,
      });
      await onSaveCopyPack(copySet, nextAds);
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Failed to update star."
      );
    } finally {
      setStarringId(null);
    }
  }

  async function handleDownload(adKey: string, imageUrl: string, filename: string) {
    setDownloadingId(adKey);
    setActionError(null);
    try {
      await downloadImageAs(imageUrl, filename);
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Download failed."
      );
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleFixFilename(
    adKey: string,
    copySetId: string,
    adIndex: number,
    safeFilename: string
  ) {
    setFixingId(adKey);
    setActionError(null);
    try {
      await onFixImageFilename(copySetId, adIndex, safeFilename);
    } catch (err: unknown) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Could not update filename. The image is still available."
      );
    } finally {
      setFixingId(null);
    }
  }

  return (
    <div className="workspace workspace-full review-ads-workspace">
      <div className="workspace-head">
        <div>
          <h2 className="workspace-title">Review Ads</h2>
          <p className="workspace-sub">
            Review final image ads, edit copy, and star the ads you want to
            publish.
          </p>
          {finalAds.length > 0 ? (
            <p className="review-ads-summary">
              {finalAds.length} image ad{finalAds.length === 1 ? "" : "s"}
              {" · "}
              {starredCount} starred for publish
            </p>
          ) : null}
        </div>
      </div>

      {actionError ? (
        <div className="banner banner-error" role="alert">
          {actionError}
        </div>
      ) : null}

      {finalAds.length === 0 ? (
        <div className="empty-state">
          <ImageIcon size={32} strokeWidth={1.5} />
          <p>No image ads to review yet.</p>
          <p className="empty-state-sub">
            Upload images inside a Strategy Copy Pack to review final ads here.
          </p>
          <button type="button" className="btn btn-primary btn-sm" onClick={onGoToStrategy}>
            <Layers size={14} strokeWidth={2.5} />
            Go to Strategy
          </button>
        </div>
      ) : (
        <div className="ads-list">
          {finalAds.map((ad) => {
            const adKey = `${ad.copy_set_id}-${ad.ad_variation_index}`;
            const isEditing = editingKey === adKey;
            const busy =
              downloadingId === adKey ||
              fixingId === adKey ||
              savingId === adKey ||
              starringId === adKey;

            const copyPrimary = isEditing && editDraft ? editDraft.primary : ad.primary;
            const copyHeadline = isEditing && editDraft ? editDraft.headline : ad.headline;
            const copyDescription =
              isEditing && editDraft ? editDraft.description : ad.description;

            return (
              <article
                key={adKey}
                className={`ads-card${ad.is_winner ? " is-starred" : ""}${
                  isEditing ? " is-editing" : ""
                }`}
              >
                <div className="ads-card-image">
                  <h3 className="ads-card-name">{ad.ad_name}</h3>
                  <div className="ads-card-image-stack">
                    <a
                      href={ad.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ads-image-link"
                      title={ad.ad_name}
                    >
                      <div className="ads-image-frame">
                        <img
                          src={ad.image_url}
                          alt={ad.ad_name}
                          className="ads-image-preview"
                        />
                      </div>
                    </a>
                    {ad.needs_filename_fix ? (
                      <p className="ads-filename-note">Filename needs updating</p>
                    ) : null}
                    <div className="ads-image-actions">
                    <button
                      type="button"
                      className={`btn btn-secondary btn-sm review-ad-star-action${
                        ad.is_winner ? " is-starred" : ""
                      }`}
                      disabled={busy}
                      title={
                        ad.is_winner
                          ? "Starred for publish — click to unstar"
                          : "Star for publish"
                      }
                      aria-pressed={ad.is_winner}
                      onClick={() => void handleToggleStar(ad)}
                    >
                      {starringId === adKey ? (
                        <Loader2 size={13} className="spin" />
                      ) : (
                        <Star
                          size={13}
                          strokeWidth={2}
                          fill={ad.is_winner ? "currentColor" : "none"}
                        />
                      )}
                      {ad.is_winner ? "Starred for publish" : "Star for publish"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm ads-download-btn"
                      disabled={busy}
                      onClick={() =>
                        void handleDownload(adKey, ad.image_url, ad.safe_filename)
                      }
                    >
                      {downloadingId === adKey ? (
                        <Loader2 size={13} className="spin" />
                      ) : null}
                      Download Image
                    </button>
                    {ad.needs_filename_fix ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm ads-fix-btn"
                        disabled={busy}
                        onClick={() =>
                          void handleFixFilename(
                            adKey,
                            ad.copy_set_id,
                            ad.ad_variation_index,
                            ad.safe_filename
                          )
                        }
                      >
                        {fixingId === adKey ? (
                          <Loader2 size={13} className="spin" />
                        ) : null}
                        Fix Filename
                      </button>
                    ) : null}
                    </div>
                  </div>
                </div>

                <div className="ads-card-copy">
                  <div className="ads-card-toolbar">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm review-ads-action-btn"
                          disabled={busy}
                          onClick={() => void handleSaveEdit(ad)}
                        >
                          {savingId === adKey ? (
                            <Loader2 size={13} className="spin" />
                          ) : (
                            <Check size={13} strokeWidth={2.5} />
                          )}
                          Save
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm review-ads-action-btn"
                          disabled={busy}
                          onClick={cancelEditing}
                        >
                          <X size={13} strokeWidth={2.5} />
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm review-ads-action-btn"
                        disabled={busy || editingKey !== null}
                        onClick={() => startEditing(adKey, ad)}
                      >
                        <Pencil size={13} strokeWidth={2.5} />
                        Edit
                      </button>
                    )}
                    <CopyButton
                      text={copyPrimary}
                      label="Copy Primary"
                      variant="primary"
                    />
                    <CopyButton
                      text={copyHeadline}
                      label="Copy Headline"
                      variant="headline"
                    />
                    <CopyButton
                      text={copyDescription}
                      label="Copy Description"
                      variant="description"
                    />
                  </div>

                  <div className="ads-card-fields">
                    {isEditing && editDraft ? (
                      <>
                        <div className="copy-pack-field">
                          <span className="copy-pack-label">Primary</span>
                          <textarea
                            className="copy-pack-textarea"
                            rows={5}
                            value={editDraft.primary}
                            onChange={(e) =>
                              setEditDraft((d) =>
                                d ? { ...d, primary: e.target.value } : d
                              )
                            }
                          />
                        </div>
                        <div className="copy-pack-field">
                          <span className="copy-pack-label">Headline</span>
                          <input
                            type="text"
                            className="copy-pack-input"
                            value={editDraft.headline}
                            onChange={(e) =>
                              setEditDraft((d) =>
                                d ? { ...d, headline: e.target.value } : d
                              )
                            }
                          />
                        </div>
                        <div className="copy-pack-field">
                          <span className="copy-pack-label">Description</span>
                          <textarea
                            className="copy-pack-textarea"
                            rows={2}
                            value={editDraft.description}
                            onChange={(e) =>
                              setEditDraft((d) =>
                                d ? { ...d, description: e.target.value } : d
                              )
                            }
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="ads-field">
                          <span className="ads-field-label">Primary</span>
                          <p className="ads-field-value">{ad.primary || "—"}</p>
                        </div>
                        <div className="ads-field">
                          <span className="ads-field-label">Headline</span>
                          <p className="ads-field-value">{ad.headline || "—"}</p>
                        </div>
                        <div className="ads-field">
                          <span className="ads-field-label">Description</span>
                          <p className="ads-field-value">{ad.description || "—"}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
