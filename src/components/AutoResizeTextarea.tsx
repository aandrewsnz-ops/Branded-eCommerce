import {
  useCallback,
  useLayoutEffect,
  useRef,
  type TextareaHTMLAttributes,
} from "react";

const HEIGHT_BUFFER_PX = 2;

export interface AutoResizeTextareaProps
  extends Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    "value" | "onChange"
  > {
  value: string;
  onChange: (value: string) => void;
  /** Minimum height in pixels when empty or short content. */
  minHeight?: number;
}

function measureHeight(element: HTMLTextAreaElement, minHeight: number): number {
  element.style.height = "auto";
  return Math.max(minHeight, element.scrollHeight + HEIGHT_BUFFER_PX);
}

export function AutoResizeTextarea({
  value,
  onChange,
  minHeight = 120,
  className,
  disabled,
  placeholder,
  ...rest
}: AutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = `${measureHeight(element, minHeight)}px`;
  }, [minHeight]);

  useLayoutEffect(() => {
    resize();
  }, [value, minHeight, resize]);

  useLayoutEffect(() => {
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  return (
    <textarea
      {...rest}
      ref={textareaRef}
      className={className}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      rows={1}
      style={{ minHeight: `${minHeight}px` }}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
