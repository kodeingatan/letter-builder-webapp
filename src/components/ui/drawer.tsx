"use client";

import { useEffect, type ReactNode } from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface RightDrawerProps {
  open: boolean;
  onClose: () => void;
  onOpen?: () => void;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  filters?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  width?: number;
}

/**
 * Shared right-side drawer used by Templates, Components, Administrasi and
 * Global Tables. It floats above the workspace so the editor never reflows.
 */
export function RightDrawer({
  open,
  onClose,
  onOpen,
  title,
  subtitle,
  actions,
  filters,
  footer,
  children,
  width = 320,
}: RightDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return onOpen ? (
      <button
        type="button"
        onClick={onOpen}
        title={`Buka panel ${title.toLowerCase()}`}
        className="fixed right-3 top-16 z-20 hidden items-center gap-1.5 rounded-[6px] border border-line bg-canvas px-2.5 py-1.5 text-[12px] font-medium text-muted shadow-[var(--shadow-card)] transition-colors hover:bg-warm hover:text-ink xl:flex"
      >
        <PanelRightOpen className="h-3.5 w-3.5" />
        {title}
      </button>
    ) : null;
  }

  return (
    <aside
      aria-label={title}
      style={{ width }}
      className="fixed right-0 top-14 bottom-0 z-30 flex max-w-[92vw] flex-col border-l border-line bg-canvas shadow-[-12px_0_32px_rgba(0,0,0,0.06)] animate-in"
    >
      <div className="flex items-start justify-between gap-2 border-b border-line px-3.5 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-semibold text-ink">{title}</h2>
          {subtitle ? <div className="mt-0.5 text-[11.5px] text-faint">{subtitle}</div> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup panel"
          className="rounded-[4px] p-1 text-faint transition-colors hover:bg-warm hover:text-ink"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      {filters ? <div className="border-b border-line px-3.5 py-2.5">{filters}</div> : null}
      {actions ? <div className="border-b border-line px-3.5 py-2">{actions}</div> : null}

      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

      {footer ? <div className="border-t border-line px-3.5 py-2.5">{footer}</div> : null}
    </aside>
  );
}

export function DrawerEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 py-10 text-center text-[12px] leading-relaxed text-faint">{children}</div>
  );
}

export function DrawerItem({
  active,
  onClick,
  title,
  meta,
  trailing,
  className,
}: {
  active?: boolean;
  onClick: () => void;
  title: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-start gap-2 border-l-2 px-3.5 py-2 text-left transition-colors",
        active
          ? "border-brand bg-brand-soft/60"
          : "border-transparent hover:bg-warm",
        className,
      )}
    >
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[12.5px]",
            active ? "font-semibold text-ink" : "font-medium text-ink",
          )}
        >
          {title}
        </span>
        {meta ? <span className="mt-0.5 block truncate text-[11px] text-faint">{meta}</span> : null}
      </span>
      {trailing}
    </button>
  );
}
