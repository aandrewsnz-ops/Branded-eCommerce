import { useMemo, useState } from "react";
import { Check, Copy, ImageIcon, Layers, Loader2, Send } from "lucide-react";
import type { AdCopySet, MarketingAngle, MassDesire } from "../types";
import { flattenPublishAds, downloadImageAs } from "../lib/finalAds";

type PublishCopyField = "title" | "primary" | "headline" | "description";

const PUBLISH_COPY_VARIANT_CLASS = {
  default: "btn-copy",
  primary: "btn-copy btn-copy-field btn-copy-primary",
  headline: "btn-copy btn-copy-field btn-copy-headline",
  description: "btn-copy btn-copy-field btn-copy-description",
} as const;

interface PublishCopyButtonProps {
  text: string;
  label: string;
  variant: keyof typeof PUBLISH_COPY_VARIANT_CLASS;
  isCopied: boolean;
  onCopied: () => void;
}

function PublishCopyButton({
  text,
  label,
  variant,
  isCopied,
  onCopied,
}: PublishCopyButtonProps) {
  async function handleCopy() {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      onCopied();
    } catch {
      // Clipboard API may be unavailable; fail silently.
    }
  }

  return (
    <button
      type="button"
      className={`${PUBLISH_COPY_VARIANT_CLASS[variant]}${isCopied ? " is-copied" : ""}`}
      onClick={() => void handleCopy()}
      disabled={!text.trim()}
    >
      {isCopied ? <Check size={12} /> : <Copy size={12} />}
      {isCopied ? "Copied" : label}
    </button>
  );
}

interface PublishAdsWorkspaceProps {
  desires: MassDesire[];
  angles: MarketingAngle[];
  copySets: AdCopySet[];
  onGoToReviewAds: () => void;
}

export function PublishAdsWorkspace({
  desires,
  angles,
  copySets,
  onGoToReviewAds,
}: PublishAdsWorkspaceProps) {
  const publishAds = useMemo(
    () => flattenPublishAds(desires, angles, copySets),
    [desires, angles, copySets]
  );

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedKeys, setCopiedKeys] = useState<Set<string>>(() => new Set());

  function markCopied(adKey: string, field: PublishCopyField) {
    const key = `${adKey}:${field}`;
    setCopiedKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }

  function isFieldCopied(adKey: string, field: PublishCopyField): boolean {
    return copiedKeys.has(`${adKey}:${field}`);
  }

  async function handleDownload(
    adKey: string,
    imageUrl: string,
    filename: string
  ) {
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

  return (
    <div className="workspace workspace-full publish-ads-workspace">
      <div className="workspace-head">
        <div>
          <h2 className="workspace-title">Publish Ads</h2>
          <p className="workspace-sub">
            Copy selected ads into Meta Ads Manager quickly.
          </p>
          {publishAds.length > 0 ? (
            <p className="publish-ads-summary">
              {publishAds.length} selected ad
              {publishAds.length === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>
      </div>

      {actionError ? (
        <div className="banner banner-error" role="alert">
          {actionError}
        </div>
      ) : null}

      {publishAds.length === 0 ? (
        <div className="empty-state">
          <Send size={32} strokeWidth={1.5} />
          <p>No ads selected for publish yet.</p>
          <p className="empty-state-sub">
            Go to Review Ads and star the ads you want to use.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onGoToReviewAds}
          >
            <Layers size={14} strokeWidth={2.5} />
            Go to Review Ads
          </button>
        </div>
      ) : (
        <div className="publish-ads-table-wrap">
          <div className="publish-ads-table-head" aria-hidden>
            <span className="publish-ads-col publish-ads-col-image">Image</span>
            <span className="publish-ads-col publish-ads-col-title">Ad</span>
            <span className="publish-ads-col publish-ads-col-action">Download</span>
            <span className="publish-ads-col publish-ads-col-action">Title</span>
            <span className="publish-ads-col publish-ads-col-action">Primary</span>
            <span className="publish-ads-col publish-ads-col-action">Headline</span>
            <span className="publish-ads-col publish-ads-col-action">Description</span>
          </div>
          <ul className="publish-ads-list">
            {publishAds.map((ad) => {
              const adKey = `${ad.copy_set_id}-${ad.ad_variation_index}`;
              const downloading = downloadingId === adKey;

              return (
                <li key={adKey} className="publish-ads-row">
                  <div className="publish-ads-col publish-ads-col-image">
                    <img
                      src={ad.image_url}
                      alt=""
                      className="publish-ads-thumb"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="publish-ads-col publish-ads-col-title">
                    <span className="publish-ads-title" title={ad.ad_name}>
                      {ad.ad_name}
                    </span>
                  </div>
                  <div className="publish-ads-col publish-ads-col-action">
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs publish-ads-btn"
                      disabled={downloading}
                      onClick={() =>
                        void handleDownload(adKey, ad.image_url, ad.safe_filename)
                      }
                    >
                      {downloading ? (
                        <Loader2 size={12} className="spin" />
                      ) : (
                        <ImageIcon size={12} strokeWidth={2.5} />
                      )}
                      Download
                    </button>
                  </div>
                  <div className="publish-ads-col publish-ads-col-action">
                    <PublishCopyButton
                      text={ad.ad_name}
                      label="Title"
                      variant="default"
                      isCopied={isFieldCopied(adKey, "title")}
                      onCopied={() => markCopied(adKey, "title")}
                    />
                  </div>
                  <div className="publish-ads-col publish-ads-col-action">
                    <PublishCopyButton
                      text={ad.primary}
                      label="Primary"
                      variant="primary"
                      isCopied={isFieldCopied(adKey, "primary")}
                      onCopied={() => markCopied(adKey, "primary")}
                    />
                  </div>
                  <div className="publish-ads-col publish-ads-col-action">
                    <PublishCopyButton
                      text={ad.headline}
                      label="Headline"
                      variant="headline"
                      isCopied={isFieldCopied(adKey, "headline")}
                      onCopied={() => markCopied(adKey, "headline")}
                    />
                  </div>
                  <div className="publish-ads-col publish-ads-col-action">
                    <PublishCopyButton
                      text={ad.description}
                      label="Description"
                      variant="description"
                      isCopied={isFieldCopied(adKey, "description")}
                      onCopied={() => markCopied(adKey, "description")}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
