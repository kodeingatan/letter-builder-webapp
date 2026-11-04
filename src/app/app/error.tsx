"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md rounded-[10px] border border-line bg-canvas p-6 text-center">
        <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-danger-soft text-danger">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <h1 className="mt-3 text-[15px] font-semibold text-ink">Terjadi kesalahan</h1>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">
          Halaman gagal dimuat. Data yang sudah tersimpan tetap aman. Coba muat ulang halaman ini.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-[10.5px] text-faint">Kode: {error.digest}</p>
        ) : null}
        <div className="mt-4 flex items-center justify-center gap-1.5">
          <Button size="sm" variant="outline" onClick={() => window.location.assign("/app")}>
            Ke ringkasan
          </Button>
          <Button size="sm" variant="primary" onClick={reset}>
            Coba lagi
          </Button>
        </div>
      </div>
    </div>
  );
}
