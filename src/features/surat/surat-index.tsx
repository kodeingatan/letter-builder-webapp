"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  FileArchive,
  FileText,
  Plus,
  Printer,
  Search,
  Send,
} from "lucide-react";
import type { AdministrasiRecord } from "@/lib/entities";
import type { SuratListRow } from "./server";
import type { SourceRecordRow as SourceRow } from "./source";
import { formatDate, formatRelative, todayIso } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox, Input, Select } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, PageHeader, Tabs } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "draft" | "completed";

interface Group {
  administrasi: AdministrasiRecord;
  letters: SuratListRow[];
}

export function SuratIndex({
  groups,
  defaultAdministrasiId,
}: {
  groups: Group[];
  defaultAdministrasiId?: string;
}) {
  const router = useRouter();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const activeAdministrasi = groups
    .map((group) => group.administrasi)
    .filter((item) => item.status === "active");

  const filteredGroups = useMemo(() => {
    const term = query.trim().toLowerCase();
    return groups
      .map((group) => ({
        administrasi: group.administrasi,
        letters: group.letters.filter((letter) => {
          const matchesStatus = status === "all" || letter.status === status;
          const matchesQuery =
            !term ||
            letter.number.toLowerCase().includes(term) ||
            (letter.recordLabel ?? "").toLowerCase().includes(term) ||
            group.administrasi.name.toLowerCase().includes(term);
          return matchesStatus && matchesQuery;
        }),
      }))
      .filter((group) => group.letters.length > 0 || (!term && status === "all"));
  }, [groups, query, status]);

  const totalLetters = groups.reduce((total, group) => total + group.letters.length, 0);

  useEffect(() => {
    if (defaultAdministrasiId && activeAdministrasi.some((item) => item.id === defaultAdministrasiId)) {
      setCreateOpen(true);
    }
  }, [defaultAdministrasiId, activeAdministrasi]);

  const toggleSelected = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedIds = Array.from(selected);

  const downloadZip = async () => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      const response = await fetch("/api/surat/bulk-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        toast.error(payload.error ?? "Gagal membuat arsip DOCX.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `arsip-surat-${todayIso()}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(`${selectedIds.length} dokumen DOCX diunduh`);
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-56px)] min-h-0 flex-col">
      <PageHeader
        title="Surat"
        description="Surat dikelompokkan per administrasi. Satu baris data menghasilkan satu surat dengan nomor otomatis."
        actions={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setCreateOpen(true)}
            disabled={activeAdministrasi.length === 0}
          >
            <Plus className="h-3.5 w-3.5" />
            Buat surat
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-1.5">
        <Tabs
          value={status}
          onChange={setStatus}
          tabs={[
            { value: "all", label: "Semua", count: totalLetters },
            {
              value: "draft",
              label: "Draft",
              count: groups.reduce((n, g) => n + g.letters.filter((l) => l.status === "draft").length, 0),
            },
            {
              value: "completed",
              label: "Selesai",
              count: groups.reduce(
                (n, g) => n + g.letters.filter((l) => l.status === "completed").length,
                0,
              ),
            },
          ]}
        />
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nomor atau baris data…"
            className="h-8 w-full rounded-[5px] border border-line bg-canvas pl-7 pr-2 text-[12px] text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 sm:w-[280px]"
            aria-label="Cari surat"
          />
        </div>
      </div>

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-brand-soft/50 px-3 py-1.5 text-[12px]">
          <span className="font-medium text-ink">{selectedIds.length} surat dipilih</span>
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              size="xs"
              variant="outline"
              onClick={() =>
                window.open(`/print/surat?ids=${selectedIds.join(",")}`, "_blank", "noopener")
              }
            >
              <Printer className="h-3 w-3" />
              Cetak
            </Button>
            <Button size="xs" variant="outline" onClick={downloadZip} loading={bulkLoading}>
              <FileArchive className="h-3 w-3" />
              DOCX (.zip)
            </Button>
            <Button size="xs" variant="ghost" onClick={() => setSelected(new Set())}>
              Bersihkan
            </Button>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        {totalLetters === 0 ? (
          <EmptyState
            icon={Send}
            title="Belum ada surat"
            description="Pilih administrasi dan baris data untuk membuat surat pertama. Nomor surat dibuat otomatis."
            action={
              <Button size="sm" variant="primary" onClick={() => setCreateOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Buat surat
              </Button>
            }
          />
        ) : filteredGroups.length === 0 ? (
          <EmptyState icon={Search} compact title="Tidak ada surat yang cocok" description="Ubah kata kunci atau filter status." />
        ) : (
          <div className="flex flex-col gap-3">
            {filteredGroups.map((group) => {
              const isCollapsed = collapsed[group.administrasi.id];
              return (
                <section key={group.administrasi.id} className="overflow-hidden rounded-[10px] border border-line bg-canvas">
                  <div className="flex flex-wrap items-center gap-2 border-b border-line bg-warm/40 px-3 py-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsed((current) => ({
                          ...current,
                          [group.administrasi.id]: !current[group.administrasi.id],
                        }))
                      }
                      className="flex items-center gap-1 text-muted hover:text-ink"
                      aria-label={isCollapsed ? "Buka grup" : "Tutup grup"}
                    >
                      {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    <div className="min-w-0">
                      <h2 className="truncate text-[12.5px] font-semibold text-ink">
                        {group.administrasi.name}
                      </h2>
                      <p className="text-[10.5px] text-faint">
                        {group.administrasi.stepCount ?? 0} step · {group.administrasi.numberPattern}
                      </p>
                    </div>
                    <Badge tone="neutral" className="ml-1">
                      {group.letters.length} surat
                    </Badge>
                    <div className="ml-auto flex items-center gap-1.5">
                      {group.administrasi.status === "active" ? (
                        <Link
                          href={`/app/surat?administrasi=${group.administrasi.id}`}
                          onClick={(event) => {
                            event.preventDefault();
                            setCreateOpen(true);
                          }}
                          className="inline-flex h-7 items-center gap-1 rounded-[4px] border border-line bg-canvas px-2 text-[11.5px] font-medium text-muted transition-colors hover:text-ink"
                        >
                          <Plus className="h-3 w-3" />
                          Buat
                        </Link>
                      ) : (
                        <Badge tone="amber">Tidak aktif</Badge>
                      )}
                    </div>
                  </div>

                  {!isCollapsed ? (
                    group.letters.length === 0 ? (
                      <div className="px-3 py-5 text-center text-[12px] text-faint">
                        Belum ada surat pada alur ini.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] border-collapse text-[12px]">
                          <thead className="text-left text-[10px] uppercase tracking-[0.05em] text-faint">
                            <tr>
                              <th className="w-8 px-2 py-1.5">
                                <Checkbox
                                  checked={
                                    group.letters.length > 0 &&
                                    group.letters.every((letter) => selected.has(letter.id))
                                  }
                                  onChange={(event) => {
                                    setSelected((current) => {
                                      const next = new Set(current);
                                      group.letters.forEach((letter) => {
                                        if (event.target.checked) next.add(letter.id);
                                        else next.delete(letter.id);
                                      });
                                      return next;
                                    });
                                  }}
                                  aria-label="Pilih semua pada grup"
                                />
                              </th>
                              <th className="px-2 py-1.5 font-medium">Nomor</th>
                              <th className="px-2 py-1.5 font-medium">Baris data</th>
                              <th className="px-2 py-1.5 font-medium">Tanggal</th>
                              <th className="px-2 py-1.5 font-medium">Status</th>
                              <th className="px-2 py-1.5 font-medium">Diperbarui</th>
                              <th className="px-2 py-1.5" />
                            </tr>
                          </thead>
                          <tbody>
                            {group.letters.map((letter) => (
                              <tr key={letter.id} className="group border-t border-line hover:bg-warm/30">
                                <td className="px-2 py-1.5">
                                  <Checkbox
                                    checked={selected.has(letter.id)}
                                    onChange={() => toggleSelected(letter.id)}
                                    aria-label={`Pilih surat ${letter.number}`}
                                  />
                                </td>
                                <td className="px-2 py-1.5">
                                  <Link
                                    href={`/app/surat/${letter.id}`}
                                    className="font-medium text-ink hover:text-brand hover:underline"
                                  >
                                    {letter.number || "(tanpa nomor)"}
                                  </Link>
                                </td>
                                <td className="max-w-[260px] truncate px-2 py-1.5 text-muted">
                                  {letter.recordLabel ?? "—"}
                                </td>
                                <td className="whitespace-nowrap px-2 py-1.5 text-muted">
                                  {formatDate(letter.letterDate)}
                                </td>
                                <td className="px-2 py-1.5">
                                  <Badge tone={letter.status === "completed" ? "green" : "amber"} dot>
                                    {letter.status === "completed" ? "Selesai" : "Draft"}
                                  </Badge>
                                </td>
                                <td className="whitespace-nowrap px-2 py-1.5 text-[11px] text-faint">
                                  {formatRelative(letter.updatedAt)}
                                </td>
                                <td className="px-2 py-1.5 text-right">
                                  <Link
                                    href={`/app/surat/${letter.id}`}
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium text-muted",
                                      "opacity-0 transition-opacity hover:bg-warm hover:text-ink group-hover:opacity-100",
                                    )}
                                  >
                                    <FileText className="h-3 w-3" />
                                    Buka
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  ) : null}
                </section>
              );
            })}
          </div>
        )}
      </div>

      <CreateSuratDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        administrasiOptions={activeAdministrasi}
        defaultAdministrasiId={defaultAdministrasiId}
        onCreated={(id) => {
          router.push(`/app/surat/${id}`);
          router.refresh();
        }}
      />
    </div>
  );
}

function CreateSuratDialog({
  open,
  onClose,
  administrasiOptions,
  defaultAdministrasiId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  administrasiOptions: AdministrasiRecord[];
  defaultAdministrasiId?: string;
  onCreated: (id: string) => void;
}) {
  const toast = useToast();
  const [administrasiId, setAdministrasiId] = useState(defaultAdministrasiId ?? administrasiOptions[0]?.id ?? "");
  const [rows, setRows] = useState<SourceRow[]>([]);
  const [fields, setFields] = useState<Array<{ name: string; label: string; type: string }>>([]);
  const [tableName, setTableName] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [date, setDate] = useState(todayIso());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open || !administrasiId) return;
    setLoading(true);
    setSelected(new Set());
    fetch(`/api/administrasi/${administrasiId}/records`)
      .then(async (response) => {
        const payload = (await response.json()) as {
          rows?: SourceRow[];
          fields?: Array<{ name: string; label: string; type: string }>;
          tableName?: string;
          error?: string;
        };
        if (payload.rows) {
          setRows(payload.rows);
          setFields(payload.fields ?? []);
          setTableName(payload.tableName ?? "");
        }
      })
      .catch(() => toast.error("Gagal memuat data."))
      .finally(() => setLoading(false));
  }, [open, administrasiId, toast]);

  const filtered = rows.filter(
    (row) =>
      !query.trim() ||
      row.label.toLowerCase().includes(query.trim().toLowerCase()) ||
      Object.values(row.data).some((value) =>
        String(value ?? "").toLowerCase().includes(query.trim().toLowerCase()),
      ),
  );

  const create = async () => {
    if (selected.size === 0) {
      toast.error("Pilih minimal satu baris data.");
      return;
    }
    setCreating(true);
    try {
      const response = await fetch("/api/surat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administrasiId,
          recordIds: Array.from(selected),
          data: { tanggal: date },
        }),
      });
      const payload = (await response.json()) as { firstId?: string; error?: string };
      if (!response.ok || !payload.firstId) {
        toast.error(payload.error ?? "Gagal membuat surat.");
        return;
      }
      toast.success(`${selected.size} surat dibuat`, "Nomor surat dibuat otomatis sesuai pola.");
      onClose();
      onCreated(payload.firstId);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Buat surat"
      description="Pilih alur administrasi dan baris data. Setiap baris menjadi satu surat dengan nomor otomatis."
      size="lg"
      footer={
        <>
          <span className="mr-auto text-[11.5px] text-faint">
            {selected.size > 0 ? `${selected.size} baris dipilih` : "Belum ada baris dipilih"}
          </span>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" onClick={create} loading={creating} disabled={selected.size === 0}>
            Buat {selected.size > 0 ? `${selected.size} ` : ""}surat
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="text-[12px] font-medium text-muted">Administrasi</label>
            <Select
              value={administrasiId}
              onChange={(event) => setAdministrasiId(event.target.value)}
              className="mt-1.5"
            >
              {administrasiOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-[12px] font-medium text-muted">Tanggal surat</label>
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Cari baris ${tableName || "data"}…`}
              className="h-8 w-full rounded-[5px] border border-line bg-canvas pl-7 pr-2 text-[12px] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
            />
          </div>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              const ids = filtered.filter((row) => !row.suratId).map((row) => row.id);
              setSelected(new Set(ids));
            }}
          >
            Pilih semua yang belum dibuat
          </Button>
        </div>

        <div className="max-h-[320px] overflow-y-auto rounded-[6px] border border-line">
          {loading ? (
            <p className="px-3 py-8 text-center text-[12px] text-muted">Memuat baris data…</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-[12px] text-faint">
              Tidak ada baris data pada sumber ini.
            </p>
          ) : (
            <table className="w-full border-collapse text-[12px]">
              <thead className="sticky top-0 bg-warm/95 text-left text-[10px] uppercase tracking-[0.05em] text-faint backdrop-blur">
                <tr>
                  <th className="w-8 px-2 py-1.5" />
                  <th className="px-2 py-1.5 font-medium">Baris</th>
                  {fields.slice(1, 4).map((field) => (
                    <th key={field.name} className="px-2 py-1.5 font-medium">
                      {field.label}
                    </th>
                  ))}
                  <th className="px-2 py-1.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-t border-line hover:bg-warm/30">
                    <td className="px-2 py-1.5">
                      <Checkbox
                        checked={selected.has(row.id)}
                        onChange={(event) =>
                          setSelected((current) => {
                            const next = new Set(current);
                            if (event.target.checked) next.add(row.id);
                            else next.delete(row.id);
                            return next;
                          })
                        }
                        aria-label={`Pilih ${row.label}`}
                      />
                    </td>
                    <td className="px-2 py-1.5 font-medium text-ink">{row.label}</td>
                    {fields.slice(1, 4).map((field) => (
                      <td key={field.name} className="max-w-[160px] truncate px-2 py-1.5 text-muted">
                        {String(row.data[field.name] ?? "—")}
                      </td>
                    ))}
                    <td className="px-2 py-1.5">
                      {row.status === "none" ? (
                        <span className="text-[11px] text-faint">Belum dibuat</span>
                      ) : (
                        <Badge tone={row.status === "completed" ? "green" : "amber"}>
                          {row.status === "completed" ? "Selesai" : "Draft"}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-[10.5px] leading-relaxed text-faint">
          Nomor surat mengikuti pola administrasi dan dibuat berurutan. Baris yang sudah memiliki surat
          dapat dipilih kembali, namun nomornya akan dibuat baru.
        </p>
      </div>
    </Dialog>
  );
}
