"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { paperDimensions } from "@/components/document/document-view";
import type { PageConfig } from "@/lib/documents/types";

const MM_TO_PX = 96 / 25.4;

/**
 * Keeps the A4 sheet readable on narrow screens by zooming the whole paper
 * instead of letting it overflow horizontally.
 */
export function PreviewPaper({ page, children }: { page: PageConfig; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const paperWidth = paperDimensions(page).width * MM_TO_PX;

    const update = () => {
      const available = element.clientWidth - 32;
      setZoom(Math.min(1, Math.max(0.35, available / paperWidth)));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [page]);

  return (
    <div ref={ref} className="flex w-full justify-center">
      <div style={{ zoom }}>{children}</div>
    </div>
  );
}
