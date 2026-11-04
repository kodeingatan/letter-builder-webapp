"use client";

import type { ReactNode } from "react";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
      <div className="min-w-0">
        {breadcrumb ? (
          <div className="mb-1 flex items-center gap-1.5 text-[11px] text-faint">{breadcrumb}</div>
        ) : null}
        <h1 className="truncate text-[17px] font-semibold tracking-[-0.02em] text-ink">{title}</h1>
        {description ? (
          <p className="mt-0.5 max-w-2xl text-[12px] leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[10px] border border-dashed border-line bg-warm/40 text-center",
        compact ? "px-4 py-8" : "px-6 py-14",
      )}
    >
      {Icon ? (
        <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-canvas text-muted">
          <Icon className="h-4 w-4" />
        </div>
      ) : null}
      <p className="text-[13px] font-medium text-ink">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-3.5">{action}</div> : null}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin text-muted", className)} />;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Cari…",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-8 w-full rounded-[5px] border border-line bg-canvas pl-7 pr-2 text-[12.5px] text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
      />
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: Array<{ value: T; label: string; count?: number }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-[12.5px] font-medium transition-colors",
            value === tab.value
              ? "bg-warm text-ink ring-1 ring-inset ring-line"
              : "text-muted hover:bg-warm/70 hover:text-ink",
          )}
        >
          {tab.label}
          {typeof tab.count === "number" ? (
            <span className="text-[10.5px] text-faint">{tab.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[5px] bg-warm-deep", className)} />;
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-[3px] border border-line bg-warm px-1 py-[1px] font-sans text-[10px] font-medium text-muted">
      {children}
    </kbd>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-[10px] border border-line bg-canvas", className)}>
      {title ? (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3.5 py-2.5">
          <div>
            <h2 className="text-[12.5px] font-semibold text-ink">{title}</h2>
            {description ? <p className="mt-0.5 text-[11.5px] text-muted">{description}</p> : null}
          </div>
          {actions}
        </header>
      ) : null}
      <div className={cn("px-3.5 py-3", bodyClassName)}>{children}</div>
    </section>
  );
}
