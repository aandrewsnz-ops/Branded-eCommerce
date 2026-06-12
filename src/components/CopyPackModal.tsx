import { useMemo, useState } from "react";
import {
  Check,
  Image as ImageIcon,
  Loader2,
  Lock,
  LockOpen,
  Pencil,
  RefreshCw,
  Trophy,
  X,
} from "lucide-react";
import type {
  AdCopySet,
  AdVariation,
  MarketingAngle,
  MassDesire,
  RegenerateMode,
} from "../types";
import { readAdImageFields } from "../lib/adImageStorage";
import { resolveAdNaming } from "../lib/finalAds";
import { AdImageUpload } from "./AdImageUpload";
import { CopyButton } from "./shared";

interface CopyPackModalProps {
  copySet: AdCopySet;
  angleName: string;
  desires: MassDesire[];
  angles: MarketingAngle[];
  massDesire?: string;
  offer?: string;
  product?: string;
  onSave: (copySet: AdCopySet, adVariations: AdVariation[]) => Promise<AdCopySet>;
  onRegenerate: (
    copySet: AdCopySet,
    adIndex: number,
    mode: RegenerateMode
  ) => Promise<AdCopySet>;
  onClose: () => void;
}

const AD_COUNT = 5;

const EMPTY_AD: AdVariation = {
  primary: "",
  headline: "",
  description: "",
  visual_strategy: "",
  image_prompt: "",
};

/**
 * Resolve the ad variations from a copy set. New copy packs store
 * `ad_variations` directly (with visual_strategy + image_prompt); older
 * quick-copy rows are reconstructed from the legacy arrays so they still show.
 */
function resolveAdVariations(copySet: AdCopySet): AdVariation[] {
  if (copySet.ad_variations && copySet.ad_variations.length > 0) {
    return copySet.ad_variations.map((ad, i) => ({
      primary: ad.primary ?? "",
      headline: ad.headline ?? "",
      description: ad.description ?? "",
      visual_strategy: ad.visual_strategy ?? "",
      image_prompt: ad.image_prompt ?? copySet.image_prompts?.[i] ?? "",
      locked: Boolean(ad.locked),
      is_winner: Boolean(ad.is_winner),
      last_regenerated_at: ad.last_regenerated_at,
      revision_count:
        typeof ad.revision_count === "number" ? ad.revision_count : 0,
      ...readAdImageFields(ad),
    }));
  }
  const primaries = copySet.short_primary_texts ?? [];
  const headlines = copySet.headlines ?? [];
  const descriptions = copySet.descriptions ?? [];
  const prompts = copySet.image_prompts ?? [];
  const count = Math.max(
    primaries.length,
    headlines.length,
    descriptions.length,
    prompts.length
  );
  const ads: AdVariation[] = [];
  for (let i = 0; i < count; i += 1) {
    ads.push({
      primary: primaries[i]?.text ?? "",
      headline: headlines[i]?.text ?? "",
      description: descriptions[i]?.text ?? "",
      visual_strategy: "",
      image_prompt: prompts[i] ?? "",
    });
  }
  return ads;
}

/** Pad/truncate to exactly AD_COUNT so edit mode always has 5 ads. */
function toFiveAds(ads: AdVariation[]): AdVariation[] {
  const next = ads.slice(0, AD_COUNT).map((ad) => ({ ...ad }));
  while (next.length < AD_COUNT) next.push({ ...EMPTY_AD });
  return next;
}

function formatWinnerAd(ad: AdVariation, index: number): string {
  return [
    `Winner Ad ${index + 1}`,
    `Primary: ${ad.primary}`,
    `Headline: ${ad.headline}`,
    `Description: ${ad.description}`,
    ad.visual_strategy ? `Visual Strategy: ${ad.visual_strategy}` : null,
    ad.image_prompt ? `Image Prompt: ${ad.image_prompt}` : null,
    ad.image_url ? `Image URL: ${ad.image_url}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatWinnersOnly(angleName: string, ads: AdVariation[]): string {
  const winners = ads
    .map((ad, i) => ({ ad, i }))
    .filter(({ ad }) => ad.is_winner);
  const parts = [`Copy Pack - ${angleName} (Winners Only)`, ""];
  winners.forEach(({ ad, i }) => {
    parts.push(formatWinnerAd(ad, i), "");
  });
  return parts.join("\n").trim();
}

function formatAd(ad: AdVariation, index: number): string {
  return [
    `Ad ${index + 1}`,
    `Primary: ${ad.primary}`,
    `Headline: ${ad.headline}`,
    `Description: ${ad.description}`,
    ad.visual_strategy ? `Visual Strategy: ${ad.visual_strategy}` : null,
    ad.image_prompt ? `Image Prompt: ${ad.image_prompt}` : null,
    ad.image_url ? `Image URL: ${ad.image_url}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatAllImagePrompts(ads: AdVariation[]): string {
  return ads
    .map((ad, i) => `Image Prompt ${i + 1}:\n${ad.image_prompt}`)
    .join("\n\n");
}

function formatAllPrimaries(ads: AdVariation[]): string {
  return ads.map((ad, i) => `Ad ${i + 1} Primary:\n${ad.primary}`).join("\n\n");
}

function formatAllHeadlines(ads: AdVariation[]): string {
  return ads.map((ad, i) => `Ad ${i + 1} Headline: ${ad.headline}`).join("\n");
}

function formatAllDescriptions(ads: AdVariation[]): string {
  return ads
    .map((ad, i) => `Ad ${i + 1} Description: ${ad.description}`)
    .join("\n");
}

function formatFullPack(angleName: string, ads: AdVariation[]): string {
  const parts = [`Copy Pack - ${angleName}`, ""];
  ads.forEach((ad, i) => {
    parts.push(formatAd(ad, i), "");
  });
  return parts.join("\n").trim();
}

export function CopyPackModal({
  copySet,
  angleName,
  desires,
  angles,
  massDesire,
  offer,
  product,
  onSave,
  onRegenerate,
  onClose,
}: CopyPackModalProps) {
  const savedAds = useMemo(() => resolveAdVariations(copySet), [copySet]);

  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<AdVariation[]>(() => toFiveAds(savedAds));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  // Per-ad in-flight action: which ad index and what kind of work.
  const [busy, setBusy] = useState<{
    index: number;
    kind: RegenerateMode | "lock" | "winner" | "upload";
  } | null>(null);

  // Note: the parent passes key={copySet.id} so this component remounts (and
  // re-initializes all local state above) whenever a different pack is opened.

  // Ads currently shown / copied: edited drafts while editing, else saved.
  const ads = editing ? drafts : savedAds;
  const winnerAds = ads.filter((ad) => ad.is_winner);
  const hasWinners = winnerAds.length > 0;
  const winnersOnlyText = hasWinners
    ? formatWinnersOnly(angleName, ads)
    : "";
  const hasImagePrompts = ads.some((ad) => ad.image_prompt.trim().length > 0);
  const fullPack = formatFullPack(angleName, ads);

  const contextRows: { label: string; value: string }[] = [
    { label: "Mass Desire", value: massDesire ?? "" },
    { label: "Angle", value: angleName },
    { label: "Offer", value: offer ?? "" },
    { label: "Product", value: product ?? "" },
  ].filter((row) => row.value.trim().length > 0);

  function startEditing() {
    setDrafts(toFiveAds(savedAds));
    setSaveError(null);
    setSaveSuccess(false);
    setEditing(true);
  }

  function cancelEditing() {
    setDrafts(toFiveAds(savedAds));
    setSaveError(null);
    setEditing(false);
  }

  function updateDraft(index: number, field: keyof AdVariation, value: string) {
    setDrafts((prev) =>
      prev.map((ad, i) => (i === index ? { ...ad, [field]: value } : ad))
    );
    setSaveSuccess(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await onSave(copySet, drafts);
      setEditing(false);
      setSaveSuccess(true);
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save copy pack."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRegen(index: number, mode: RegenerateMode) {
    setBusy({ index, kind: mode });
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await onRegenerate(copySet, index, mode);
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to regenerate."
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleToggleLock(index: number) {
    const nextAds = toFiveAds(savedAds).map((ad, i) =>
      i === index ? { ...ad, locked: !ad.locked } : ad
    );
    setBusy({ index, kind: "lock" });
    setSaveError(null);
    try {
      await onSave(copySet, nextAds);
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to update lock."
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleToggleWinner(index: number) {
    const nextAds = toFiveAds(savedAds).map((ad, i) =>
      i === index ? { ...ad, is_winner: !ad.is_winner } : ad
    );
    setBusy({ index, kind: "winner" });
    setSaveError(null);
    try {
      await onSave(copySet, nextAds);
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to update winner."
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleAdImageUpdate(index: number, updatedAd: AdVariation) {
    const nextAds = toFiveAds(savedAds).map((ad, i) =>
      i === index ? updatedAd : ad
    );
    setBusy({ index, kind: "upload" });
    setSaveError(null);
    try {
      await onSave(copySet, nextAds);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save uploaded image.";
      setSaveError(message);
      throw err;
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Copy Pack - ${angleName}`}
      onClick={editing ? undefined : onClose}
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div className="modal-head-main">
            <h3 className="modal-title">
              Copy Pack — {angleName}
              {copySet.is_edited ? (
                <span className="modal-edited-badge">Edited</span>
              ) : null}
            </h3>
            <p className="modal-subtitle">
              Conversion-first raw draft. Review before publishing.
            </p>
            {contextRows.length > 0 ? (
              <dl className="modal-context">
                {contextRows.map((row) => (
                  <div key={row.label} className="modal-context-item">
                    <dt className="modal-context-label">{row.label}</dt>
                    <dd className="modal-context-value">{row.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="modal-toolbar">
          {editing ? (
            <>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 size={14} strokeWidth={2.5} className="spin" />
                ) : (
                  <Check size={14} strokeWidth={2.5} />
                )}
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel Editing
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={startEditing}
            >
              <Pencil size={14} strokeWidth={2.5} />
              Edit Copy Pack
            </button>
          )}
          <span className="modal-toolbar-divider" aria-hidden />
          {hasWinners ? (
            <CopyButton text={winnersOnlyText} label="Copy Winners Only" />
          ) : (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled
              title="Mark at least one ad as a winner to copy winners only"
            >
              Copy Winners Only
            </button>
          )}
          <CopyButton text={fullPack} label="Copy Full Pack" />
          <CopyButton
            text={formatAllPrimaries(ads)}
            label="Copy All Primary Texts"
          />
          <CopyButton
            text={formatAllHeadlines(ads)}
            label="Copy All Headlines"
          />
          <CopyButton
            text={formatAllDescriptions(ads)}
            label="Copy All Descriptions"
          />
          {hasImagePrompts ? (
            <CopyButton
              text={formatAllImagePrompts(ads)}
              label="Copy All Image Prompts"
            />
          ) : null}
        </div>

        {saveError ? (
          <div className="modal-banner modal-banner-error" role="alert">
            {saveError}
          </div>
        ) : null}
        {saveSuccess && !editing ? (
          <div className="modal-banner modal-banner-success">
            Copy pack saved.
          </div>
        ) : null}

        <div className="modal-body">
          {ads.length > 0 ? (
            <div className="copy-pack-ads">
              {ads.map((ad, i) => (
                <article
                  key={i}
                  className={`copy-pack-ad${ad.locked ? " is-locked" : ""}${
                    ad.is_winner ? " is-winner" : ""
                  }${busy?.index === i ? " is-busy" : ""}`}
                >
                  <div className="copy-pack-ad-head">
                    <div className="copy-pack-ad-title-row">
                      <h4 className="copy-pack-ad-title">Ad {i + 1}</h4>
                      {ad.is_winner ? (
                        <span className="copy-pack-winner-badge">
                          <Trophy size={11} /> Winner
                        </span>
                      ) : null}
                      {ad.locked ? (
                        <span className="copy-pack-lock-badge">
                          <Lock size={11} /> Locked
                        </span>
                      ) : null}
                          {busy?.index === i ? (
                        <span className="copy-pack-busy">
                          <Loader2 size={12} className="spin" />
                          {busy.kind === "lock" ||
                          busy.kind === "winner" ||
                          busy.kind === "upload"
                            ? "Saving…"
                            : "Regenerating…"}
                        </span>
                      ) : null}
                    </div>
                    <div className="copy-pack-ad-actions">
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
                      <CopyButton
                        text={formatAd(ad, i)}
                        label={`Copy Ad ${i + 1}`}
                      />
                      <CopyButton
                        text={ad.image_prompt}
                        label="Copy for ChatGPT Image"
                      />
                      {ad.image_url ? (
                        <CopyButton
                          text={ad.image_url}
                          label="Copy Image URL"
                        />
                      ) : null}
                    </div>
                  </div>

                  <div className="copy-pack-ad-tools">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleRegen(i, "full_ad")}
                      disabled={editing || ad.locked || busy !== null}
                      title={
                        editing
                          ? "Save or cancel editing before regenerating"
                          : ad.locked
                            ? "Unlock this ad to regenerate"
                            : undefined
                      }
                    >
                      <RefreshCw size={13} strokeWidth={2.5} />
                      Regenerate Ad
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleRegen(i, "image_prompt_only")}
                      disabled={editing || ad.locked || busy !== null}
                      title={
                        editing
                          ? "Save or cancel editing before regenerating"
                          : ad.locked
                            ? "Unlock this ad to regenerate"
                            : undefined
                      }
                    >
                      <ImageIcon size={13} strokeWidth={2.5} />
                      Regenerate Image Prompt
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm${ad.is_winner ? " copy-pack-winner-btn is-active" : " btn-secondary"}`}
                      onClick={() => handleToggleWinner(i)}
                      disabled={editing || busy !== null}
                      title={
                        editing
                          ? "Save or cancel editing before marking winners"
                          : undefined
                      }
                    >
                      <Trophy size={13} strokeWidth={2.5} />
                      {ad.is_winner ? "Winner" : "Mark as Winner"}
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm${ad.locked ? " angle-quick-btn is-active-good" : " btn-secondary"}`}
                      onClick={() => handleToggleLock(i)}
                      disabled={editing || busy !== null}
                      title={
                        editing
                          ? "Save or cancel editing before locking"
                          : undefined
                      }
                    >
                      {ad.locked ? (
                        <>
                          <LockOpen size={13} strokeWidth={2.5} />
                          Unlock Ad
                        </>
                      ) : (
                        <>
                          <Lock size={13} strokeWidth={2.5} />
                          Lock Ad
                        </>
                      )}
                    </button>
                  </div>
                  <div className="copy-pack-ad-grid">
                    <div className="copy-pack-col">
                      {editing ? (
                        <>
                          <EditField
                            label="Primary"
                            value={ad.primary}
                            rows={5}
                            onChange={(v) => updateDraft(i, "primary", v)}
                          />
                          <EditField
                            label="Headline"
                            value={ad.headline}
                            single
                            onChange={(v) => updateDraft(i, "headline", v)}
                          />
                          <EditField
                            label="Description"
                            value={ad.description}
                            rows={2}
                            onChange={(v) => updateDraft(i, "description", v)}
                          />
                        </>
                      ) : (
                        <>
                          <ReadField label="Primary" value={ad.primary} />
                          <ReadField label="Headline" value={ad.headline} />
                          <ReadField
                            label="Description"
                            value={ad.description}
                          />
                        </>
                      )}
                    </div>
                    <div className="copy-pack-col copy-pack-col-visual">
                      {editing ? (
                        <>
                          <EditField
                            label="Visual Strategy"
                            value={ad.visual_strategy}
                            rows={3}
                            onChange={(v) =>
                              updateDraft(i, "visual_strategy", v)
                            }
                          />
                          <EditField
                            label="Image Prompt"
                            value={ad.image_prompt}
                            rows={6}
                            onChange={(v) => updateDraft(i, "image_prompt", v)}
                          />
                        </>
                      ) : (
                        <>
                          <ReadField
                            label="Visual Strategy"
                            value={ad.visual_strategy}
                          />
                          <ReadField
                            label="Image Prompt"
                            value={ad.image_prompt}
                          />
                        </>
                      )}
                      <AdImageUpload
                        adIndex={i}
                        ad={ad}
                        projectId={copySet.project_id}
                        safeFilename={
                          resolveAdNaming(desires, angles, copySet, ad, i)
                            .safeFilename
                        }
                        disabled={editing || busy !== null}
                        onUpdate={(updatedAd) => handleAdImageUpdate(i, updatedAd)}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="copy-pack-empty">This copy pack has no ad variations.</p>
          )}
        </div>

        <footer className="modal-foot">
          {editing ? (
            <>
              {saveError ? (
                <span className="modal-foot-error">{saveError}</span>
              ) : null}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel Editing
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 size={14} strokeWidth={2.5} className="spin" />
                ) : (
                  <Check size={14} strokeWidth={2.5} />
                )}
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
            >
              Close
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div className="copy-pack-field">
      <span className="copy-pack-label">{label}</span>
      <p className="copy-pack-value">{value || "—"}</p>
    </div>
  );
}

interface EditFieldProps {
  label: string;
  value: string;
  rows?: number;
  single?: boolean;
  onChange: (value: string) => void;
}

function EditField({ label, value, rows = 3, single, onChange }: EditFieldProps) {
  return (
    <div className="copy-pack-field">
      <span className="copy-pack-label">{label}</span>
      {single ? (
        <input
          type="text"
          className="copy-pack-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <textarea
          className="copy-pack-textarea"
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
