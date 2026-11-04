import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONES = {
  neutral: "bg-warm text-muted border-line",
  blue: "bg-brand-soft text-[#097fe8] border-[#d8ecfb]",
  green: "bg-success-soft text-success border-[#d3eeda]",
  amber: "bg-warning-soft text-warning border-[#f7e2c8]",
  red: "bg-danger-soft text-danger border-[#f6d8d5]",
} as const;

export type BadgeTone = keyof typeof TONES;

export function Badge({
  children,
  tone = "neutral",
  className,
  dot,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-[2px] text-[11px] font-semibold tracking-[0.01em]",
        TONES[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}
