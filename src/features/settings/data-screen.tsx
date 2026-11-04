"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  DatabaseBackup,
  Download,
  FileJson,
  RotateCcw,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { formatDateTime, todayIso } from "@/lib/utils";

interface BackupSummary {
  version: number;
  tables: number;
  records: number;
  templates: number;
  letters: number;
  exportedAt: string | null;
}

export function DataScreen({
  counts,
  lastBackupHint,
}: {
  counts: { tables: number; records: number; templates: number; letters: number; components: number };
  lastBackupHint?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [importFile, setImportFile] = useState<{ name: string; payload: unknown; summary: BackupSummary } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFile = async (file: File) => {
    setError(null);
    if (file.size > 20 * 1024 * 1024) {
      setError("Berkas terlalu besar (maks. 20 MB).");
      return;
    }
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as Record<string, unknown>;
      if (payload.version !== 1) {
        setError("Versi berkas cadangan tidak didukung.");
        return;
      }
      const arrayLength = (key: string) =>
        Array.isArray(payload[key]) ? (payload[key] as unknown[]).length : 0;

      setImportFile({
        name: file.name,
        payload,
        summary: {
          version: Number(payload.version),
          tables: arrayLength("tables"),
          records: arrayLength("records"),
          templates: arrayLength("templates"),
          letters: arrayLength("surat"),
          exportedAt: typeof payload.exportedAt === "string" ? payload.exportedAt : null,
        },
      });
      setImportOpen(true);
    } catch {
      setError("Berkas bukan JSON cadangan Aksara yang valid.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const runImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const response = await fetch("/api/data/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: importFile.payload }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Gagal memuat cadangan.");
        return;
      }
      toast.success("Cadangan dipulihkan", "Data ruang kerja diganti dengan isi berkas.");
      setImportOpen(false);
      setImportFile(null);
      router.refresh();
      setTimeout(() => window.location.reload(), 400);
    } finally {
      setImporting(false);
    }
  };

  const runReset = async () => {
    setResetting(true);
    try {
      const response = await fetch("/api/data/reset", { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Gagal mereset data.");
        return;
      }
      toast.success("Ruang kerja direset", "Semua data dokumen dihapus. Akun pengguna tetap ada.");
      setResetOpen(false);
      setResetConfirm("");
      router.push("/app");
      router.refresh();
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-3 p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          { label: "Tabel", value: counts.tables },
          { label: "Baris", value: counts.records },
          { label: "Component", value: counts.components },
          { label: "Template", value: counts.templates },
          { label: "Surat", value: counts.letters },
        ].map((item) => (
          <div key={item.label} className="rounded-[8px] border border-line bg-canvas px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.05em] text-faint">{item.label}</p>
            <p className="mt-0.5 text-[18px] font-semibold tracking-[-0.02em] text-ink">
              {item.value.toLocaleString("id-ID")}
            </p>
          </div>
        ))}
      </div>

      <SectionCard
        title="Ekspor cadangan"
        description="Satu berkas JSON berisi tabel, component, template, administrasi, surat, dan pengaturan."
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-[11.5px] leading-relaxed text-muted">
            Simpan berkas di tempat aman. Berkas ini memuat seluruh isi ruang kerja dan dapat dimuat
            kembali kapan saja. Akun pengguna dan kata sandi tidak disertakan.
          </p>
          <a
            href="/api/data/export"
            className="inline-flex h-8 items-center gap-1.5 rounded-[5px] border border-line bg-canvas px-2.5 text-[12.5px] font-medium text-ink transition-colors hover:bg-warm"
          >
            <Download className="h-3.5 w-3.5" />
            Unduh cadangan
          </a>
        </div>
        <p className="mt-1 text-[10.5px] text-faint">
          {lastBackupHint ?? `Disarankan mencadangkan secara berkala, mis. setiap akhir bulan (${todayIso()}).`}
        </p>
      </SectionCard>

      <SectionCard
        title="Impor cadangan"
        description="Mengganti seluruh data dokumen saat ini dengan isi berkas. Akun pengguna tidak berubah."
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <FileJson className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
            <p className="max-w-xl text-[11.5px] leading-relaxed text-muted">
              Pilih berkas <code className="rounded bg-warm px-1">aksara-backup-*.json</code> hasil ekspor.
              Tindakan ini tidak dapat dibatalkan — unduh cadangan terbaru terlebih dahulu.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void pickFile(file);
              }}
            />
            <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" />
              Pilih berkas
            </Button>
          </div>
        </div>
        {error ? <p className="mt-2 text-[11.5px] text-danger">{error}</p> : null}
      </SectionCard>

      <SectionCard
        title="Reset ruang kerja"
        description="Menghapus semua tabel, template, administrasi, dan surat. Akun pengguna tetap tersimpan."
        className="border-danger/30"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-[11.5px] leading-relaxed text-muted">
            Gunakan hanya saat memulai dari nol atau setelah menguji data contoh. Pengaturan instansi
            dikembalikan ke nilai awal.
          </p>
          <Button size="sm" variant="danger" onClick={() => setResetOpen(true)}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset data
          </Button>
        </div>
      </SectionCard>

      <Dialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Muat cadangan?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setImportOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={runImport} loading={importing}>
              <DatabaseBackup className="h-3.5 w-3.5" />
              Pulihkan data
            </Button>
          </>
        }
      >
        {importFile ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2 rounded-[6px] border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11.5px] leading-relaxed text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Data saat ini akan diganti seluruhnya. Pastikan Anda sudah mengekspor cadangan terbaru.
            </div>
            <div>
              <p className="text-[12px] font-medium text-ink">{importFile.name}</p>
              <p className="mt-0.5 text-[11px] text-faint">
                {importFile.summary.exportedAt
                  ? `Diekspor ${formatDateTime(importFile.summary.exportedAt)}`
                  : "Tanggal ekspor tidak tercatat"}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-y-1 text-[11.5px]">
              <dt className="text-muted">Tabel</dt>
              <dd className="text-right text-ink">{importFile.summary.tables}</dd>
              <dt className="text-muted">Baris data</dt>
              <dd className="text-right text-ink">{importFile.summary.records}</dd>
              <dt className="text-muted">Template</dt>
              <dd className="text-right text-ink">{importFile.summary.templates}</dd>
              <dt className="text-muted">Surat</dt>
              <dd className="text-right text-ink">{importFile.summary.letters}</dd>
            </dl>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={resetOpen}
        onClose={() => {
          setResetOpen(false);
          setResetConfirm("");
        }}
        title="Reset seluruh data?"
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setResetOpen(false);
                setResetConfirm("");
              }}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={runReset}
              loading={resetting}
              disabled={resetConfirm.trim().toUpperCase() !== "HAPUS"}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset permanen
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2 rounded-[6px] border border-red-200 bg-danger-soft px-2.5 py-2 text-[11.5px] leading-relaxed text-danger">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Semua data dokumen dihapus permanen. Tindakan ini tidak dapat dibatalkan.
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-muted">
              Ketik <span className="font-semibold text-ink">HAPUS</span> untuk melanjutkan
            </span>
            <Input
              value={resetConfirm}
              onChange={(event) => setResetConfirm(event.target.value)}
              placeholder="HAPUS"
              autoFocus
            />
          </label>
        </div>
      </Dialog>
    </div>
  );
}
