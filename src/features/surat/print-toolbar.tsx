"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

export function PrintToolbar({
  title,
  subtitle,
  backHref,
}: {
  title: string;
  subtitle?: string;
  backHref: string;
}) {
  return (
    <div className="no-print sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-line bg-canvas/95 px-4 py-2 backdrop-blur">
      <Link
        href={backHref}
        className="inline-flex h-8 items-center gap-1.5 rounded-[5px] border border-line px-2 text-[12.5px] font-medium text-muted transition-colors hover:bg-warm hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Kembali
      </Link>
      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-semibold text-ink">{title}</p>
        {subtitle ? <p className="truncate text-[10.5px] text-faint">{subtitle}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => window.print()}
        className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-[5px] bg-brand px-3 text-[12.5px] font-medium text-white transition-colors hover:bg-brand-strong"
      >
        <Printer className="h-3.5 w-3.5" />
        Cetak / Simpan PDF
      </button>
    </div>
  );
}
