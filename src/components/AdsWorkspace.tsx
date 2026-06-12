import { useMemo, useState } from "react";
import { ImageIcon, Layers, Loader2 } from "lucide-react";
import type { AdCopySet, MarketingAngle, MassDesire } from "../types";
import { flattenFinalAds, downloadImageAs } from "../lib/finalAds";
import { CopyButton } from "./shared";

interface AdsWorkspaceProps {
  desires: MassDesire[];
  angles: MarketingAngle[];
  copySets: AdCopySet[];
  onGoToStrategy: () => void;
  onFixImageFilename: (
    copySetId: string,
    adIndex: number,
    safeFilename: string
  ) => Promise<AdCopySet>;
}

export function AdsWorkspace({
  desires,
  angles,
  copySets,
  onGoToStrategy,
  onFixImageFilename,
}: AdsWorkspaceProps) {
  const finalAds = useMemo(
    () => flattenFinalAds(desires, angles, copySets),
    [desires, angles, copySets]
  );
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
    <div className="workspace workspace-full">
      <div className="workspace-head">
        <div>
          <h2 className="workspace-title">Ads</h2>
          <p className="workspace-sub">
            Final ad units with uploaded images — ready to review and copy into
            Meta.
          </p>
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
          <p>No image ads yet.</p>
          <p className="empty-state-sub">
            Upload images inside a Strategy Copy Pack to see final ads here.
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
            const busy = downloadingId === adKey || fixingId === adKey;
            return (
              <article key={adKey} className="ads-card">
                <div className="ads-card-copy">
                  <h3 className="ads-card-name">{ad.ad_name}</h3>
                  <div className="ads-card-fields">
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
                  </div>
                  <div className="ads-card-actions">
                    <CopyButton
                      text={ad.primary}
                      label="Copy Primary"
                      variant="primary"
                    />
                    <CopyButton
                      text={ad.headline}
                      label="Copy Headline"
                      variant="headline"
                    />
                    <CopyButton
                      text={ad.description}
                      label="Copy Description"
                      variant="description"
                    />
                  </div>
                </div>
                <div className="ads-card-image">
                  <a
                    href={ad.image_url}
                    download={ad.safe_filename}
                    className="ads-image-link"
                    title={ad.ad_name}
                  >
                    <img
                      src={ad.image_url}
                      alt={ad.ad_name}
                      className="ads-image-preview"
                    />
                  </a>
                  {ad.needs_filename_fix ? (
                    <p className="ads-filename-note">Filename needs updating</p>
                  ) : null}
                  <div className="ads-image-actions">
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
