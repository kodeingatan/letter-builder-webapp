"use client";

import { useMemo, useState } from "react";
import { Blocks, CornerDownRight, FileText, Repeat, SplitSquareVertical } from "lucide-react";
import type { Condition, PageConfig } from "@/lib/documents/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { ConditionEditor } from "./condition-editor";
import type { ComponentOption, TableOption, VariableOption } from "./types";

export function VariableDialog({
  open,
  onClose,
  variables,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  variables: VariableOption[];
  onPick: (path: string) => void;
}) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = variables.filter(
      (variable) =>
        !term ||
        variable.label.toLowerCase().includes(term) ||
        variable.path.toLowerCase().includes(term),
    );
    return filtered.reduce<Record<string, VariableOption[]>>((result, variable) => {
      result[variable.group] = result[variable.group] ?? [];
      result[variable.group].push(variable);
      return result;
    }, {});
  }, [variables, query]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Sisipkan variabel"
      description="Pilih field data. Variabel disisipkan di posisi kursor dan tetap menjadi satu chip."
      size="md"
    >
      <SearchInput value={query} onChange={setQuery} placeholder="Cari field atau tabel…" />
      <div className="mt-2.5 max-h-[360px] overflow-y-auto">
        {Object.keys(groups).length === 0 ? (
          <p className="py-8 text-center text-[12px] text-faint">Tidak ada field yang cocok.</p>
        ) : (
          Object.entries(groups).map(([group, items]) => (
            <div key={group} className="mb-2">
              <p className="px-1 py-1 text-[10px] font-semibold uppercase tracking-[0.07em] text-faint">
                {group}
              </p>
              <div className="flex flex-col">
                {items.map((variable) => (
                  <button
                    key={`${group}-${variable.path}`}
                    type="button"
                    onClick={() => {
                      onPick(variable.path);
                      onClose();
                    }}
                    className="flex items-center gap-2 rounded-[4px] px-1.5 py-1.5 text-left transition-colors hover:bg-warm"
                  >
                    <CornerDownRight className="h-3 w-3 shrink-0 text-faint" />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-ink">
                      {variable.label}
                    </span>
                    <code className="shrink-0 rounded-[3px] bg-warm px-1 py-0.5 font-mono text-[10px] text-muted">
                      {variable.path}
                    </code>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </Dialog>
  );
}

export function ComponentDialog({
  open,
  onClose,
  components,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  components: ComponentOption[];
  onPick: (componentId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = components.filter(
    (component) =>
      !query.trim() ||
      component.name.toLowerCase().includes(query.trim().toLowerCase()) ||
      component.category.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Sisipkan component"
      description="Component dimuat sebagai referensi. Perubahan pada component berlaku ke semua template."
      size="md"
    >
      <SearchInput value={query} onChange={setQuery} placeholder="Cari component…" />
      <div className="mt-2.5 max-h-[340px] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-[12px] text-faint">Tidak ada component.</p>
        ) : (
          <div className="grid gap-1">
            {filtered.map((component) => (
              <button
                key={component.id}
                type="button"
                onClick={() => {
                  onPick(component.id);
                  onClose();
                }}
                className="flex items-center gap-2 rounded-[5px] border border-line px-2.5 py-2 text-left transition-colors hover:border-brand/40 hover:bg-brand-soft/40"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-warm text-muted">
                  <Blocks className="h-3 w-3" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium text-ink">
                    {component.name}
                  </span>
                  <span className="block text-[10.5px] text-faint">{component.category}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
}

export function LoopDialog({
  open,
  onClose,
  tables,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  tables: TableOption[];
  onCreate: (config: { source: string; label: string; emptyText: string }) => void;
}) {
  const [source, setSource] = useState("active");
  const [label, setLabel] = useState("");
  const [emptyText, setEmptyText] = useState("Tidak ada data.");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Sisipkan loop"
      description="Ulangi blok untuk setiap baris data. Gunakan {{_index}} untuk nomor urut di dalam loop."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onCreate({ source, label, emptyText });
              onClose();
            }}
          >
            Sisipkan loop
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-[12px] font-medium text-muted">Sumber baris</label>
          <Select value={source} onChange={(event) => setSource(event.target.value)} className="mt-1">
            <option value="active">Baris aktif administrasi</option>
            {tables.map((table) => (
              <option key={table.id} value={table.id}>
                Semua baris {table.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-[12px] font-medium text-muted">Label internal (opsional)</label>
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="mis. Daftar pegawai"
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-[12px] font-medium text-muted">Teks jika data kosong</label>
          <Input
            value={emptyText}
            onChange={(event) => setEmptyText(event.target.value)}
            className="mt-1"
          />
        </div>
        <p className="rounded-[5px] bg-warm px-2.5 py-2 text-[11px] leading-relaxed text-muted">
          <Repeat className="mr-1 inline h-3 w-3" />
          Filter dapat ditambahkan setelah loop dibuat melalui tombol <strong>atur</strong> pada bingkai loop.
        </p>
      </div>
    </Dialog>
  );
}

export function ConditionalDialog({
  open,
  onClose,
  variables,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  variables: VariableOption[];
  onCreate: (config: {
    conditions: Condition[];
    match: "all" | "any";
    withElse: boolean;
  }) => void;
}) {
  const [conditions, setConditions] = useState<Condition[]>([
    { field: variables[0]?.path ?? "", operator: "neq", value: "" },
  ]);
  const [match, setMatch] = useState<"all" | "any">("all");
  const [withElse, setWithElse] = useState(false);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Sisipkan kondisi"
      description="Tampilkan blok hanya ketika data memenuhi kondisi. Gunakan cabang “selain itu” untuk alternatif."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="primary"
            disabled={conditions.length === 0}
            onClick={() => {
              onCreate({ conditions, match, withElse });
              onClose();
            }}
          >
            <SplitSquareVertical className="h-3.5 w-3.5" />
            Sisipkan kondisi
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <ConditionEditor
          conditions={conditions}
          onChange={setConditions}
          match={match}
          onMatchChange={setMatch}
          variables={variables}
        />
        <label className="flex items-center gap-2 text-[12px] text-muted">
          <Checkbox checked={withElse} onChange={(event) => setWithElse(event.target.checked)} />
          Sertakan cabang “selain itu”
        </label>
      </div>
    </Dialog>
  );
}

const FONT_FAMILIES = ["Times New Roman", "Arial", "Georgia", "Calibri", "Cambria", "Verdana"];

export function PageSettingsDialog({
  open,
  onClose,
  page,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  page: PageConfig;
  onApply: (page: PageConfig) => void;
}) {
  const [draft, setDraft] = useState<PageConfig>(page);

  const updateMargin = (key: keyof PageConfig["margins"], value: number) => {
    setDraft((current) => ({ ...current, margins: { ...current.margins, [key]: value } }));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Pengaturan halaman"
      description="Ukuran kertas, margin, dan tipografi yang dipakai preview, cetak, dan ekspor."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            Terapkan
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[12px] font-medium text-muted">Ukuran kertas</label>
          <Select
            value={draft.paper}
            onChange={(event) =>
              setDraft((current) => ({ ...current, paper: event.target.value as PageConfig["paper"] }))
            }
            className="mt-1"
          >
            <option value="A4">A4 — 210 × 297 mm</option>
            <option value="F4">F4 — 215 × 330 mm</option>
            <option value="Letter">Letter — 216 × 279 mm</option>
          </Select>
        </div>
        <div>
          <label className="text-[12px] font-medium text-muted">Orientasi</label>
          <Select
            value={draft.orientation}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                orientation: event.target.value as PageConfig["orientation"],
              }))
            }
            className="mt-1"
          >
            <option value="portrait">Potret</option>
            <option value="landscape">Lanskap</option>
          </Select>
        </div>
        <div>
          <label className="text-[12px] font-medium text-muted">Font dokumen</label>
          <Select
            value={draft.fontFamily}
            onChange={(event) =>
              setDraft((current) => ({ ...current, fontFamily: event.target.value }))
            }
            className="mt-1"
          >
            {FONT_FAMILIES.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-[12px] font-medium text-muted">Ukuran font (pt)</label>
          <Input
            type="number"
            min={7}
            max={24}
            value={draft.fontSize}
            onChange={(event) =>
              setDraft((current) => ({ ...current, fontSize: Number(event.target.value) || 12 }))
            }
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-2">
          <p className="text-[12px] font-medium text-muted">Margin (mm)</p>
          <div className="mt-1 grid grid-cols-4 gap-1.5">
            {(["top", "right", "bottom", "left"] as const).map((side) => (
              <div key={side}>
                <Input
                  type="number"
                  min={5}
                  max={60}
                  value={draft.margins[side]}
                  onChange={(event) => updateMargin(side, Number(event.target.value) || 0)}
                  aria-label={`Margin ${side}`}
                  className="text-center"
                />
                <p className="mt-0.5 text-center text-[10px] capitalize text-faint">{side}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="text-[12px] font-medium text-muted">Jarak baris</label>
          <Input
            type="number"
            min={1}
            max={3}
            step={0.05}
            value={draft.lineHeight}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                lineHeight: Number(event.target.value) || 1.5,
              }))
            }
            className="mt-1 w-24"
          />
        </div>
      </div>
    </Dialog>
  );
}

export function EmptyDocumentHint({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <FileText className="h-5 w-5 text-faint" />
      <p className="text-[12px] text-muted">Dokumen ini masih kosong.</p>
      <Button variant="secondary" size="sm" onClick={onCreate}>
        Tambah paragraf pertama
      </Button>
    </div>
  );
}

export function EditorLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 text-[10px] text-faint", className)}>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-[2px] bg-success/30" /> loop
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-[2px] bg-brand/30" /> kondisi
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-[2px] bg-brand-soft ring-1 ring-brand/30" /> component
      </span>
    </div>
  );
}
