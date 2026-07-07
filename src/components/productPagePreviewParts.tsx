import { useRef, type ReactNode } from "react";
import { Pencil, Upload } from "lucide-react";
import type { ProductPageSection } from "../types";
import { renderProductPageSectionLiquid } from "../lib/productPageLiquid";
import { CopyButton } from "./shared";

export function resolvePreviewImageUrl(section: ProductPageSection): string {
  return section.image_url?.trim() || section.shopify_image_url?.trim() || "";
}

/** Wrap accent phrase in span for Westward Reserve h2 styling. */
export function WrHeadline({
  headline,
  accent,
}: {
  headline: string;
  accent?: string;
}) {
  const h = headline.trim();
  const acc = accent?.trim();
  if (!h) return <h2></h2>;
  if (!acc) return <h2>{h}</h2>;

  const lowerH = h.toLowerCase();
  const lowerA = acc.toLowerCase();
  const index = lowerH.indexOf(lowerA);

  if (index < 0) {
    return (
      <h2>
        <span>{acc}</span> {h}
      </h2>
    );
  }

  return (
    <h2>
      {h.slice(0, index)}
      <span>{h.slice(index, index + acc.length)}</span>
      {h.slice(index + acc.length)}
    </h2>
  );
}

export function AccentHeadline({
  headline,
  accent,
}: {
  headline: string;
  accent?: string;
}) {
  const accentText = accent?.trim();
  if (!accentText) return <>{headline}</>;

  const lowerHeadline = headline.toLowerCase();
  const lowerAccent = accentText.toLowerCase();
  const index = lowerHeadline.indexOf(lowerAccent);

  if (index < 0) {
    return (
      <>
        {headline}{" "}
        <span className="ppv-gold">{accentText}</span>
      </>
    );
  }

  return (
    <>
      {headline.slice(0, index)}
      <span className="ppv-gold">
        {headline.slice(index, index + accentText.length)}
      </span>
      {headline.slice(index + accentText.length)}
    </>
  );
}

export function PreviewImage({
  section,
  className = "",
}: {
  section: ProductPageSection;
  className?: string;
}) {
  const src = resolvePreviewImageUrl(section);
  const alt =
    section.image_alt?.trim() ||
    section.headline?.trim() ||
    "Product proof image";
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`ppv-img ${className}`.trim()}
      />
    );
  }

  return (
    <div className={`ppv-img-placeholder ${className}`.trim()}>
      <span>
        Image placeholder — {section.image_role?.trim() || "UGC image"}
      </span>
    </div>
  );
}

export function PreviewCta({ label }: { label?: string }) {
  if (!label?.trim()) return null;
  return (
    <span className="ppv-btn" role="presentation">
      {label}
    </span>
  );
}

export function PreviewSmallPrint({ text }: { text?: string }) {
  if (!text?.trim()) return null;
  return <p className="ppv-small">{text}</p>;
}

export function PreviewCheckList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="ppv-checklist">
      {items.map((item, index) => (
        <li key={index}>
          <span className="ppv-check" aria-hidden>
            ✓
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

interface PreviewSectionShellProps {
  section: ProductPageSection;
  disabled?: boolean;
  onEdit: () => void;
  onUpload: (file: File) => void;
  children: ReactNode;
  className?: string;
}

export function PreviewSectionShell({
  section,
  disabled = false,
  onEdit,
  onUpload,
  children,
  className = "",
}: PreviewSectionShellProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={`ppv-section-shell ${className}`.trim()}
      data-section-type={section.section_type}
    >
      <div className="ppv-section-toolbar">
        <button
          type="button"
          className="ppv-toolbar-btn"
          disabled={disabled}
          onClick={onEdit}
        >
          <Pencil size={12} />
          Edit
        </button>
        {section.image_prompt?.trim() ? (
          <CopyButton
            text={section.image_prompt}
            label="Prompt"
            variant="default"
          />
        ) : null}
        {section.image_required ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="sr-only"
              disabled={disabled}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              className="ppv-toolbar-btn"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              <Upload size={12} />
              Upload
            </button>
          </>
        ) : null}
        <CopyButton
          text={renderProductPageSectionLiquid(section)}
          label="Liquid"
          variant="default"
        />
      </div>
      {children}
    </div>
  );
}

export function PreviewStars() {
  return (
    <span className="ppv-stars" aria-hidden>
      ★★★★★
    </span>
  );
}
