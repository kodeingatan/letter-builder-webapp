"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { InlineNode } from "@/lib/documents/types";
import { inlineToHtml, parseInlineHtml } from "@/lib/documents/inline-dom";
import { cn } from "@/lib/utils";

interface EditableInlineProps {
  value: InlineNode[];
  onChange: (nodes: InlineNode[]) => void;
  onFocus?: (element: HTMLElement) => void;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "p";
  readOnly?: boolean;
  ariaLabel?: string;
}

/**
 * A single contentEditable text block. The initial HTML is captured once so
 * React re-renders never move the caret; the JSON model is updated on input.
 */
export function EditableInline({
  value,
  onChange,
  onFocus,
  placeholder,
  className,
  style,
  as = "div",
  readOnly,
  ariaLabel,
}: EditableInlineProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [initialHtml] = useState(() => inlineToHtml(value));
  const Tag = as as "div";

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.contentEditable = readOnly ? "false" : "true";
    if (!readOnly) element.spellcheck = true;
  }, [readOnly]);

  const handleInput = () => {
    if (!ref.current || readOnly) return;
    onChange(parseInlineHtml(ref.current));
  };

  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      role="textbox"
      aria-multiline="true"
      aria-label={ariaLabel}
      className={cn(
        "min-h-[1.2em] whitespace-pre-wrap break-words outline-none",
        readOnly && "cursor-default",
        className,
      )}
      style={style}
      data-placeholder={placeholder}
      suppressContentEditableWarning
      onInput={handleInput}
      onBlur={handleInput}
      onPaste={(event) => {
        if (readOnly) return;
        event.preventDefault();
        const text = event.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
      }}
      onFocus={(event) => onFocus?.(event.currentTarget)}
      dangerouslySetInnerHTML={{ __html: initialHtml }}
    />
  );
}
