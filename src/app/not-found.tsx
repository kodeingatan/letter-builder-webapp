import Link from "next/link";
import type { Metadata } from "next";
import { BrandMark } from "@/components/layout/brand";

export const metadata: Metadata = {
  title: "Halaman tidak ditemukan",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-warm px-6 text-center">
      <BrandMark className="h-9 w-9" />
      <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.1em] text-faint">404</p>
      <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-ink">
        Halaman tidak ditemukan
      </h1>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted">
        Tautan mungkin sudah berubah atau dokumen telah dihapus. Kembali ke ruang kerja untuk
        melanjutkan.
      </p>
      <div className="mt-5 flex items-center gap-2">
        <Link
          href="/"
          className="inline-flex h-8 items-center rounded-[5px] border border-line bg-canvas px-3 text-[12.5px] font-medium text-muted transition-colors hover:text-ink"
        >
          Beranda
        </Link>
        <Link
          href="/app"
          className="inline-flex h-8 items-center rounded-[5px] bg-brand px-3 text-[12.5px] font-medium text-white transition-colors hover:bg-brand-strong"
        >
          Ruang kerja
        </Link>
      </div>
    </main>
  );
}
