"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect?: () => void;
  danger?: boolean;
  disabled?: boolean;
  shortcut?: string;
  separatorBefore?: boolean;
  checked?: boolean;
}

interface FloatingMenuProps {
  open: boolean;
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
  header?: ReactNode;
  minWidth?: number;
}

export function FloatingMenu({ open, x, y, items, onClose, header, minWidth = 210 }: FloatingMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const padding = 8;
    const left = Math.min(x, window.innerWidth - rect.width - padding);
    const top =
      y + rect.height > window.innerHeight - padding
        ? Math.max(padding, y - rect.height)
        : y;
    setPosition({ left: Math.max(padding, left), top });
  }, [open, x, y]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      style={{ left: position.left, top: position.top, minWidth }}
      className="fixed z-[60] overflow-hidden rounded-[8px] border border-line bg-canvas py-1 shadow-[var(--shadow-float)] animate-fade"
    >
      {header ? (
        <div className="border-b border-line px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-faint">
          {header}
        </div>
      ) : null}
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div key={`${item.label}-${index}`}>
            {item.separatorBefore ? <div className="my-1 h-px bg-line" /> : null}
            <button
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                item.onSelect?.();
                onClose();
              }}
              className={cn(
                "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[12.5px] transition-colors disabled:opacity-40",
                item.danger
                  ? "text-danger hover:bg-danger-soft"
                  : "text-ink hover:bg-warm",
              )}
            >
              {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-muted" /> : null}
              <span className="flex-1 truncate">{item.label}</span>
              {item.checked ? (
                <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
              ) : null}
              {item.shortcut ? (
                <span className="text-[10.5px] tracking-wide text-faint">{item.shortcut}</span>
              ) : null}
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}

interface DropdownMenuProps {
  trigger: ReactNode;
  items: MenuItem[];
  align?: "left" | "right";
  header?: string;
  minWidth?: number;
  triggerClassName?: string;
}

export function DropdownMenu({
  trigger,
  items,
  align = "right",
  header,
  minWidth,
  triggerClassName,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({
      x: align === "right" ? rect.right - (minWidth ?? 210) : rect.left,
      y: rect.bottom + 4,
    });
    setOpen(true);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={openMenu}
        className={cn("inline-flex items-center", triggerClassName)}
      >
        {trigger}
      </button>
      <FloatingMenu
        open={open}
        x={coords.x}
        y={coords.y}
        items={items}
        onClose={() => setOpen(false)}
        header={header}
        minWidth={minWidth}
      />
    </>
  );
}
