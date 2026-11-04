"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileDown,
  Files,
  History,
  Pencil,
  Printer,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import type { DocumentContent, RenderContext } from "@/lib/documents/types";
import type { LetterFieldOption, TableOption } from "@/components/editor/types";
import type { SuratVersion } from "@/lib/entities";
import { renderDocument } from "@/lib/documents/engine";
import { DocumentView } from "@/components/document/document-view";
import { DocumentEditor } from "@/components/editor/document-editor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { DropdownMenu } from "@/components/ui/menu";
import { DrawerEmpty, DrawerItem, RightDrawer } from "@/components/ui/drawer";
import { PageHeader } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { cn, downloadBlob, formatDate, formatDateTime, formatRelative } from "@/lib/utils";
import { PreviewPaper } from "./preview-paper";
import type { SuratWorkspacePayload } from "./server";

type SaveState = "saved" | "dirty" | "saving" | "error";

export function SuratWizard({
  workspace,
  versions: initialVersions,
  canAdmin,
  tables,
  letterFields,
}: {
  workspace: SuratWorkspacePayload;
  versions: SuratVersion[];
  canAdmin: boolean;
  tables: TableOption[];
  letterFields: LetterFieldOption[];
}) {
  const router = useRouter();
  const toast = useToast();
  const { surat, administrasi, steps, source, neighbors } = workspace;

  const initialData = useMemo<Record<string, string>>(
    () => ({
      ...surat.data,
      nomor: surat.number,
      tanggal: surat.letterDate,
    }),
    [surat.data, surat.number, surat.letterDate],
  );

  const [data, setData] = useState(initialData);
  const [activeStepId, setActiveStepId] = useState(
    surat.currentStepId && steps.some((step) => step.id === surat.currentStepId)
      ? surat.currentStepId
      : (steps[0]?.id ?? ""),
  );
  const [overrides, setOverrides] = useState<Record<string, DocumentContent | null>>(() =>
    Object.fromEntries(steps.map((step) => [step.id, step.overrideContent])),
  );
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [status, setStatus] = useState(surat.status);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [updatedAt, setUpdatedAt] = useState(surat.updatedAt);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versions, setVersions] = useState(initialVersions);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetOverrideOpen, setResetOverrideOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const savedOverrides = useRef<Record<string, string>>(
    Object.fromEntries(steps.map((step) => [step.id, JSON.stringify(step.overrideContent)])),
  );
  const savedData = useRef(JSON.stringify(initialData));
  const latest = useRef({ data, activeStepId, overrides });
  latest.current = { data, activeStepId, overrides };

  const readOnly = status === "completed";
  const activeStep = steps.find((step) => step.id === activeStepId) ?? steps[0];
  const activeContent = activeStep
    ? (overrides[activeStep.id] ?? activeStep.content)
    : { version: 1 as const, blocks: [] };

  const context = useMemo<RenderContext>(
    () => ({
      ...workspace.context,
      letter: { ...workspace.context.letter, ...data },
    }),
    [workspace.context, data],
  );

  const componentMap = useMemo(
    () => new Map(workspace.components.map((component) => [component.id, component])),
    [workspace.components],
  );

  const blocks = useMemo(
    () =>
      renderDocument({
        content: activeContent,
        context,
        components: componentMap,
        primarySourceId: workspace.source.tableId ?? undefined,
      }),
    [activeContent, context, componentMap, workspace.source.tableId],
  );

  const persist = useCallback(
    async (options: { version?: boolean; stepId?: string; override?: DocumentContent | null; silent?: boolean }) => {
      const snapshot = latest.current;
      const stepId = options.stepId ?? snapshot.activeStepId;
      const override =
        options.override !== undefined ? options.override : (snapshot.overrides[stepId] ?? null);

      setSaveState("saving");
      try {
        const response = await fetch(`/api/surat/${surat.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: snapshot.data,
            currentStepId: snapshot.activeStepId || undefined,
            stepId: stepId || undefined,
            overrideContent: stepId ? override : undefined,
            createVersion: options.version ?? false,
          }),
        });
        const payload = (await response.json()) as {
          surat?: { updatedAt: string; number: string };
          error?: string;
        };
        if (!response.ok) {
          setSaveState("error");
          if (!options.silent) toast.error(payload.error ?? "Gagal menyimpan surat.");
          return;
        }
        if (stepId) savedOverrides.current[stepId] = JSON.stringify(override);
        savedData.current = JSON.stringify(snapshot.data);
        if (payload.surat?.updatedAt) setUpdatedAt(payload.surat.updatedAt);
        setSaveState("saved");
        if (options.version) {
          toast.success("Versi surat dicatat");
          void refreshVersions();
        }
      } catch {
        setSaveState("error");
        if (!options.silent) toast.error("Koneksi gagal", "Perubahan belum tersimpan.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [surat.id, toast],
  );

  const refreshVersions = useCallback(async () => {
    const response = await fetch(`/api/surat/${surat.id}/versions`);
    if (!response.ok) return;
    const payload = (await response.json()) as { versions?: SuratVersion[] };
    if (payload.versions) setVersions(payload.versions);
  }, [surat.id]);

  useEffect(() => {
    const serialized = JSON.stringify(data);
    if (serialized === savedData.current) return;
    setSaveState("dirty");
    const timer = setTimeout(() => {
      void persist({ silent: true });
    }, 900);
    return () => clearTimeout(timer);
  }, [data, persist]);

  useEffect(() => {
    if (!activeStepId) return;
    const serialized = JSON.stringify(overrides[activeStepId] ?? null);
    if (serialized === savedOverrides.current[activeStepId]) return;
    setSaveState("dirty");
    const timer = setTimeout(() => {
      void persist({
        stepId: activeStepId,
        override: overrides[activeStepId] ?? null,
        silent: true,
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [overrides, activeStepId, persist]);

  const switchStep = (nextId: string) => {
    if (nextId === activeStepId) return;
    const currentSerialized = JSON.stringify(overrides[activeStepId] ?? null);
    if (currentSerialized !== savedOverrides.current[activeStepId]) {
      void persist({
        stepId: activeStepId,
        override: overrides[activeStepId] ?? null,
        silent: true,
      });
    }
    setActiveStepId(nextId);
    setMode("preview");
  };

  const setField = (key: string, value: string) => {
    setData((current) => ({ ...current, [key]: value }));
  };

  const saveManual = async () => {
    await persist({ version: true });
  };

  const complete = async () => {
    const missing = administrasi.fields
      .filter((field) => field.required && field.scope === "shared")
      .filter((field) => !String(data[field.key] ?? "").trim())
      .map((field) => field.label);

    if (missing.length > 0) {
      setCompleteOpen(false);
      toast.error("Data wajib belum lengkap", missing.join(", "));
      return;
    }

    setBusy(true);
    try {
      await persist({ silent: true });
      const response = await fetch(`/api/surat/${surat.id}/complete`, { method: "POST" });
      const payload = (await response.json()) as { surat?: { status: string }; error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Gagal menyelesaikan surat.");
        return;
      }
      setStatus("completed");
      setCompleteOpen(false);
      toast.success("Surat diselesaikan", "Snapshot data tersimpan di riwayat versi.");
      void refreshVersions();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const reopen = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/surat/${surat.id}/reopen`, { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Gagal membuka kembali surat.");
        return;
      }
      setStatus("draft");
      setReopenOpen(false);
      toast.success("Surat dibuka kembali", "Data snapshot tetap tersimpan pada versi.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/surat/${surat.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        toast.error(payload.error ?? "Gagal menghapus surat.");
        return;
      }
      toast.success("Surat dihapus");
      router.push("/app/surat");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const restoreVersion = async (version: number) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/surat/${surat.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Gagal memulihkan versi.");
        return;
      }
      toast.success(`Versi ${version} dipulihkan`);
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  const exportDocx = async () => {
    setExporting(true);
    try {
      const response = await fetch(`/api/surat/${surat.id}/export?format=docx`);
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        toast.error(payload.error ?? "Gagal membuat DOCX.");
        return;
      }
      const blob = await response.blob();
      downloadBlob(blob, `${(surat.number || "surat").replace(/[\\/:*?"<>|]/g, "-")}.docx`);
      toast.success("DOCX diunduh", "Buka di Word untuk penyesuaian akhir.");
    } finally {
      setExporting(false);
    }
  };

  const sharedFields = administrasi.fields.filter(
    (field) => field.scope === "shared" && field.key !== "nomor" && field.key !== "tanggal",
  );
  const recordFields = administrasi.fields.filter((field) => field.scope === "record");

  const saveLabel: Record<SaveState, string> = {
    saved: `Tersimpan ${formatRelative(updatedAt)}`,
    saving: "Menyimpan…",
    dirty: "Perubahan belum tersimpan",
    error: "Gagal menyimpan",
  };

  return (
    <div className="flex h-[calc(100vh-56px)] min-h-0 flex-col">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {surat.number || "Surat tanpa nomor"}
            <Badge tone={status === "completed" ? "green" : "amber"} dot>
              {status === "completed" ? "Selesai" : "Draft"}
            </Badge>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span>{administrasi.name}</span>
            <span className="text-faint">·</span>
            <span>{workspace.recordLabel || "Tanpa baris data"}</span>
            <span className="text-faint">·</span>
            <span className={cn(saveState === "error" && "text-danger")}>{saveLabel[saveState]}</span>
          </span>
        }
        breadcrumb={
          <span className="flex items-center gap-1">
            <Link href="/app/surat" className="hover:text-ink">
              Surat
            </Link>
            <span>/</span>
            <span className="truncate">{administrasi.name}</span>
          </span>
        }
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setDrawerOpen(true)}>
              <Files className="h-3.5 w-3.5" />
              Daftar surat
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setVersionsOpen(true);
                void refreshVersions();
              }}
            >
              <History className="h-3.5 w-3.5" />
              Riwayat
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(`/print/surat/${surat.id}`, "_blank", "noopener")}
            >
              <Printer className="h-3.5 w-3.5" />
              Cetak
            </Button>
            <Button size="sm" variant="ghost" onClick={exportDocx} loading={exporting}>
              <FileDown className="h-3.5 w-3.5" />
              DOCX
            </Button>
            {status === "completed" ? (
              canAdmin ? (
                <Button size="sm" variant="outline" onClick={() => setReopenOpen(true)}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Buka kembali
                </Button>
              ) : null
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={saveManual}
                  loading={saveState === "saving"}
                  disabled={!activeStep}
                >
                  <Save className="h-3.5 w-3.5" />
                  Simpan
                </Button>
                <Button size="sm" variant="primary" onClick={() => setCompleteOpen(true)}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Selesaikan
                </Button>
              </>
            )}
            <DropdownMenu
              align="right"
              minWidth={190}
              trigger={<span className="px-1 text-[13px] font-medium text-muted">Lainnya</span>}
              triggerClassName="rounded-[5px] border border-line px-1.5 py-1.5 hover:bg-warm"
              items={[
                {
                  label: "Catat versi sekarang",
                  icon: Save,
                  onSelect: () => void persist({ version: true }),
                },
                {
                  label: "Reset isi ke template",
                  icon: RotateCcw,
                  disabled: readOnly || !overrides[activeStepId],
                  onSelect: () => setResetOverrideOpen(true),
                },
                ...(canAdmin
                  ? [
                      {
                        label: "Hapus surat",
                        icon: Trash2,
                        danger: true,
                        separatorBefore: true,
                        onSelect: () => setDeleteOpen(true),
                      },
                    ]
                  : []),
              ]}
            />
          </>
        }
      />

      <div className="flex items-center gap-1 overflow-x-auto border-b border-line px-3 py-1.5">
        {steps.map((step, index) => {
          const isActive = step.id === activeStep?.id;
          const isEdited = overrides[step.id] !== null;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => switchStep(step.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-[5px] border px-2.5 py-1 text-[12px] transition-colors",
                isActive
                  ? "border-line-strong bg-canvas font-medium text-ink shadow-[var(--shadow-card)]"
                  : "border-transparent text-muted hover:bg-warm hover:text-ink",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full text-[9.5px] font-semibold",
                  isActive ? "bg-brand text-white" : "bg-warm text-muted",
                )}
              >
                {index + 1}
              </span>
              {step.name}
              {isEdited ? <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Isi diubah" /> : null}
            </button>
          );
        })}
        <div className="ml-auto flex shrink-0 items-center gap-1 pl-2">
          {readOnly ? (
            <span className="text-[11px] text-faint">Dokumen terkunci</span>
          ) : (
            <div className="flex items-center rounded-[5px] border border-line p-0.5">
              <button
                type="button"
                onClick={() => setMode("preview")}
                className={cn(
                  "flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[11.5px]",
                  mode === "preview" ? "bg-warm font-medium text-ink" : "text-muted hover:text-ink",
                )}
              >
                <Eye className="h-3 w-3" />
                Pratinjau
              </button>
              <button
                type="button"
                onClick={() => setMode("edit")}
                disabled={!activeStep}
                className={cn(
                  "flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[11.5px]",
                  mode === "edit" ? "bg-warm font-medium text-ink" : "text-muted hover:text-ink",
                )}
              >
                <Pencil className="h-3 w-3" />
                Ubah isi
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-warm/40">
        <div className="mx-auto grid w-full max-w-[1440px] gap-3 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            {!activeStep ? (
              <div className="rounded-[10px] border border-line bg-canvas p-8 text-center">
                <p className="text-[13px] font-medium text-ink">Belum ada step dokumen</p>
                <p className="mt-1 text-[12px] text-muted">
                  Tambahkan step dan template pada administrasi terlebih dahulu.
                </p>
              </div>
            ) : mode === "edit" && !readOnly ? (
              <div className="overflow-hidden rounded-[10px] border border-line bg-canvas">
                <div className="flex items-center justify-between gap-2 border-b border-line bg-amber-50/60 px-3 py-1.5">
                  <p className="text-[11px] text-amber-800">
                    Mengubah isi khusus surat ini — template tidak berubah.
                  </p>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setResetOverrideOpen(true)}
                    disabled={!overrides[activeStep.id]}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </Button>
                </div>
                <DocumentEditor
                  key={activeStep.id}
                  initialValue={activeContent}
                  onChange={(content) => {
                    setOverrides((current) => ({ ...current, [activeStep.id]: content }));
                  }}
                  page={activeStep.page}
                  onPageChange={() => undefined}
                  components={workspace.components.map((component) => ({
                    id: component.id,
                    name: component.name,
                    category: "",
                  }))}
                  tables={tables}
                  letterFields={letterFields}
                  activeTableId={workspace.source.tableId}
                  allowPageSettings={false}
                  className="min-h-[70vh]"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                {overrides[activeStep.id] ? (
                  <div className="flex w-full items-center justify-between gap-2 rounded-[6px] border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Isi step ini diubah dari template asli.
                    </span>
                    {readOnly || !canAdmin ? null : (
                      <button
                        type="button"
                        onClick={() => setResetOverrideOpen(true)}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        Kembalikan
                      </button>
                    )}
                  </div>
                ) : null}
                <PreviewPaper page={activeStep.page}>
                  <DocumentView blocks={blocks} page={activeStep.page} />
                </PreviewPaper>
                <p className="pb-2 text-[10.5px] text-faint">
                  {activeStep.templateName} · {blocks.length} blok dirender
                </p>
              </div>
            )}
          </div>

          <aside className="flex min-w-0 flex-col gap-2.5">
            {readOnly ? (
              <div className="rounded-[8px] border border-green-200 bg-green-50 px-3 py-2 text-[11.5px] leading-relaxed text-green-800">
                Surat selesai dan terkunci. Buka kembali untuk mengubah data atau isi.
              </div>
            ) : null}

            <section className="rounded-[10px] border border-line bg-canvas">
              <header className="border-b border-line px-3 py-2">
                <h2 className="text-[12px] font-semibold text-ink">Data surat</h2>
              </header>
              <div className="flex flex-col gap-2.5 px-3 py-2.5">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium text-muted">Nomor surat</span>
                  <Input
                    value={data.nomor ?? ""}
                    onChange={(event) => setField("nomor", event.target.value)}
                    disabled={readOnly}
                    className="h-8 font-mono text-[11.5px]"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium text-muted">Tanggal surat</span>
                  <Input
                    type="date"
                    value={data.tanggal ?? ""}
                    onChange={(event) => setField("tanggal", event.target.value)}
                    disabled={readOnly}
                    className="h-8 text-[11.5px]"
                  />
                </label>

                {sharedFields.map((field) => (
                  <label key={field.key} className="flex flex-col gap-1">
                    <span className="text-[11px] font-medium text-muted">
                      {field.label}
                      {field.required ? <span className="ml-0.5 text-danger">*</span> : null}
                    </span>
                    {field.type === "textarea" ? (
                      <Textarea
                        value={data[field.key] ?? ""}
                        onChange={(event) => setField(field.key, event.target.value)}
                        rows={2}
                        disabled={readOnly}
                        className="text-[11.5px]"
                      />
                    ) : field.type === "date" ? (
                      <Input
                        type="date"
                        value={data[field.key] ?? ""}
                        onChange={(event) => setField(field.key, event.target.value)}
                        disabled={readOnly}
                        className="h-8 text-[11.5px]"
                      />
                    ) : field.type === "number" ? (
                      <Input
                        type="number"
                        value={data[field.key] ?? ""}
                        onChange={(event) => setField(field.key, event.target.value)}
                        disabled={readOnly}
                        className="h-8 text-[11.5px]"
                      />
                    ) : (
                      <Input
                        value={data[field.key] ?? ""}
                        onChange={(event) => setField(field.key, event.target.value)}
                        disabled={readOnly}
                        placeholder={field.placeholder}
                        className="h-8 text-[11.5px]"
                      />
                    )}
                  </label>
                ))}

                {recordFields.length > 0 ? (
                  <>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-faint">
                        Field per baris
                      </span>
                      <span className="h-px flex-1 bg-line" />
                    </div>
                    {recordFields.map((field) => (
                      <label key={field.key} className="flex flex-col gap-1">
                        <span className="text-[11px] font-medium text-muted">
                          {field.label}
                          {field.required ? <span className="ml-0.5 text-danger">*</span> : null}
                        </span>
                        <Input
                          value={data[field.key] ?? ""}
                          onChange={(event) => setField(field.key, event.target.value)}
                          disabled={readOnly}
                          className="h-8 text-[11.5px]"
                        />
                      </label>
                    ))}
                  </>
                ) : null}
              </div>
            </section>

            {source.rows.length > 0 ? (
              <section className="rounded-[10px] border border-line bg-canvas">
                <header className="flex items-center justify-between border-b border-line px-3 py-2">
                  <h2 className="text-[12px] font-semibold text-ink">Baris {source.tableName}</h2>
                  <span className="text-[10.5px] text-faint">{source.rows.length} baris</span>
                </header>
                <div className="flex items-center gap-1 border-b border-line px-2 py-1.5">
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={neighbors.index <= 0}
                    onClick={() => router.push(`/app/surat/${neighbors.ids[neighbors.index - 1]}`)}
                  >
                    <ChevronLeft className="h-3 w-3" />
                    Sebelumnya
                  </Button>
                  <span className="text-[10.5px] text-faint">
                    {neighbors.index + 1}/{neighbors.ids.length}
                  </span>
                  <Button
                    size="xs"
                    variant="ghost"
                    className="ml-auto"
                    disabled={neighbors.index >= neighbors.ids.length - 1}
                    onClick={() => router.push(`/app/surat/${neighbors.ids[neighbors.index + 1]}`)}
                  >
                    Berikutnya
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
                <ul className="max-h-[240px] overflow-y-auto py-1">
                  {source.rows.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        disabled={!row.suratId}
                        onClick={() => row.suratId && router.push(`/app/surat/${row.suratId}`)}
                        className={cn(
                          "flex w-full items-start gap-2 px-3 py-1.5 text-left text-[11.5px] transition-colors",
                          row.suratId ? "hover:bg-warm" : "cursor-default opacity-70",
                          row.suratId === surat.id && "bg-brand-soft/60",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                            row.status === "completed"
                              ? "bg-green-500"
                              : row.status === "draft"
                                ? "bg-amber-500"
                                : "bg-neutral-300",
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-ink">{row.label}</span>
                          <span className="text-[10px] text-faint">
                            {row.status === "none" ? "Belum ada surat" : row.status === "draft" ? "Draft" : "Selesai"}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="rounded-[10px] border border-line bg-canvas px-3 py-2.5 text-[11px] leading-relaxed text-muted">
              <h2 className="mb-1.5 text-[12px] font-semibold text-ink">Informasi</h2>
              <dl className="grid grid-cols-[88px_1fr] gap-y-1">
                <dt className="text-faint">Administrasi</dt>
                <dd className="truncate">{administrasi.name}</dd>
                <dt className="text-faint">Template</dt>
                <dd className="truncate">{activeStep?.templateName ?? "—"}</dd>
                <dt className="text-faint">Tanggal surat</dt>
                <dd>{formatDate(data.tanggal)}</dd>
                <dt className="text-faint">Dibuat</dt>
                <dd>{formatDateTime(surat.createdAt)}</dd>
              </dl>
            </section>
          </aside>
        </div>
      </div>

      <RightDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpen={() => setDrawerOpen(true)}
        title="Daftar surat"
        subtitle={administrasi.name}
        footer={
          <Link
            href="/app/surat"
            className="text-[11.5px] font-medium text-brand hover:underline"
          >
            Lihat semua surat →
          </Link>
        }
      >
        {source.rows.length === 0 ? (
          <DrawerEmpty>Surat ini tidak terikat pada baris data.</DrawerEmpty>
        ) : (
          source.rows.map((row) => (
            <DrawerItem
              key={row.id}
              active={row.suratId === surat.id}
              onClick={() => row.suratId && router.push(`/app/surat/${row.suratId}`)}
              title={row.label}
              meta={row.status === "none" ? "Belum ada surat" : row.status === "draft" ? "Draft" : "Selesai"}
            />
          ))
        )}
      </RightDrawer>

      <Dialog
        open={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        title="Riwayat versi"
        description="Snapshot dibuat setiap surat diselesaikan atau saat Anda mencatat versi manual."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setVersionsOpen(false)}>
              Tutup
            </Button>
            <Button variant="outline" onClick={() => void persist({ version: true })}>
              <Save className="h-3.5 w-3.5" />
              Catat versi
            </Button>
          </>
        }
      >
        {versions.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-faint">Belum ada versi tersimpan.</p>
        ) : (
          <ol className="flex max-h-[50vh] flex-col gap-1.5 overflow-y-auto pr-1">
            {versions.map((version) => (
              <li
                key={version.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-line px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-ink">
                    Versi {version.version}
                    <span className="ml-2 font-normal text-muted">{version.summary}</span>
                  </p>
                  <p className="text-[10.5px] text-faint">
                    {version.createdByName ?? "Sistem"} · {formatDateTime(version.createdAt)}
                  </p>
                </div>
                {canAdmin ? (
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => void restoreVersion(version.version)}
                    loading={busy}
                  >
                    Pulihkan
                  </Button>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </Dialog>

      <ConfirmDialog
        open={completeOpen}
        title="Selesaikan surat?"
        description="Surat akan terkunci, nomor final, dan snapshot data disimpan pada riwayat versi. Buka kembali jika perlu revisi."
        confirmLabel="Selesaikan"
        loading={busy}
        onConfirm={complete}
        onClose={() => setCompleteOpen(false)}
      />

      <ConfirmDialog
        open={reopenOpen}
        title="Buka kembali surat?"
        description="Surat kembali menjadi draft dan bisa diubah. Nomor tetap sama."
        confirmLabel="Buka kembali"
        loading={busy}
        onConfirm={reopen}
        onClose={() => setReopenOpen(false)}
      />

      <ConfirmDialog
        open={resetOverrideOpen}
        title="Kembalikan ke template?"
        description="Semua perubahan isi khusus pada step ini akan dihapus dan kembali mengikuti template."
        confirmLabel="Kembalikan"
        destructive
        loading={busy}
        onConfirm={async () => {
          if (!activeStep) return;
          setOverrides((current) => ({ ...current, [activeStep.id]: null }));
          await persist({ stepId: activeStep.id, override: null });
          setResetOverrideOpen(false);
          toast.success("Isi step dikembalikan ke template");
        }}
        onClose={() => setResetOverrideOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Hapus surat?"
        description="Surat beserta riwayat versinya dihapus permanen. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus surat"
        destructive
        loading={busy}
        onConfirm={remove}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}
