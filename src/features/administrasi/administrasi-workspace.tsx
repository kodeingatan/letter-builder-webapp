"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Files,
  GripVertical,
  MoreHorizontal,
  Plus,
  Save,
  Send,
  Trash2,
  Workflow,
  X,
} from "lucide-react";
import type {
  AdministrasiRecord,
  AdministrasiStep,
  LetterField,
  LetterFieldType,
} from "@/lib/entities";
import type { Condition } from "@/lib/documents/types";
import { formatLetterNumber } from "@/lib/numbering";
import { formatRelative } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/input";
import { DropdownMenu } from "@/components/ui/menu";
import { DrawerItem, DrawerEmpty, RightDrawer } from "@/components/ui/drawer";
import { PageHeader, SearchInput, SectionCard } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { ConditionEditor } from "@/components/editor/condition-editor";
import type { VariableOption } from "@/components/editor/types";

const STATUSES = [
  { value: "active", label: "Aktif — dapat membuat surat" },
  { value: "draft", label: "Draft — belum dipublikasikan" },
  { value: "archived", label: "Arsip — tidak menerima surat baru" },
] as const;

const FIELD_TYPES: Array<{ value: LetterFieldType; label: string }> = [
  { value: "text", label: "Teks" },
  { value: "textarea", label: "Teks panjang" },
  { value: "date", label: "Tanggal" },
  { value: "number", label: "Angka" },
];

interface AdministrasiListItem {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
  stepCount: number;
  letterCount: number;
}

export function AdministrasiWorkspace({
  administrasi,
  steps: initialSteps,
  templates,
  tables,
  list,
  canEdit,
}: {
  administrasi: AdministrasiRecord;
  steps: AdministrasiStep[];
  templates: Array<{ id: string; name: string }>;
  tables: Array<{ id: string; name: string; slug: string; fields: Array<{ name: string; label: string; type: string }> }>;
  list: AdministrasiListItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState(administrasi.name);
  const [description, setDescription] = useState(administrasi.description);
  const [status, setStatus] = useState(administrasi.status);
  const [dataSourceTableId, setDataSourceTableId] = useState(administrasi.dataSourceTableId ?? "");
  const [numberPattern, setNumberPattern] = useState(administrasi.numberPattern);
  const [filter, setFilter] = useState<Condition[]>(administrasi.filter);
  const [fields, setFields] = useState<LetterField[]>(administrasi.fields);
  const [steps, setSteps] = useState<AdministrasiStep[]>(initialSteps);

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerQuery, setDrawerQuery] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const mark = () => setDirty(true);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const selectedTable = tables.find((table) => table.id === dataSourceTableId);
  const filterVariables = useMemo<VariableOption[]>(() => {
    if (!selectedTable) return [];
    return selectedTable.fields.map((field) => ({
      path: field.name,
      label: field.label,
      group: `Field ${selectedTable.name}`,
    }));
  }, [selectedTable]);

  const preview = formatLetterNumber(numberPattern || "SP-{seq}/{year}", {
    sequence: 1,
    date: new Date(),
  });

  const save = async () => {
    if (name.trim().length < 2) {
      toast.error("Nama administrasi minimal 2 karakter.");
      return;
    }
    if (steps.length === 0) {
      toast.error("Minimal satu step diperlukan.");
      return;
    }
    if (steps.some((step) => !step.templateId)) {
      toast.error("Setiap step harus memiliki template.");
      return;
    }
    const keys = new Set<string>();
    for (const field of fields) {
      if (!/^[a-z][a-z0-9_]*$/.test(field.key)) {
        toast.error(`Key field "${field.label}" tidak valid.`, "Gunakan huruf kecil dan garis bawah.");
        return;
      }
      if (keys.has(field.key)) {
        toast.error(`Key field "${field.key}" ganda.`);
        return;
      }
      keys.add(field.key);
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/administrasi/${administrasi.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          status,
          dataSourceTableId: dataSourceTableId || null,
          filter,
          numberPattern,
          fields,
          steps: steps.map((step) => ({
            id: step.id,
            name: step.name,
            templateId: step.templateId,
          })),
        }),
      });
      const payload = (await response.json()) as { error?: string; details?: unknown };
      if (!response.ok) {
        toast.error(payload.error ?? "Gagal menyimpan administrasi.");
        return;
      }
      setDirty(false);
      toast.success("Administrasi tersimpan");
      router.refresh();
    } catch {
      toast.error("Koneksi gagal", "Periksa jaringan lalu coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/administrasi/${administrasi.id}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Gagal menghapus administrasi.");
        return;
      }
      toast.success("Administrasi dihapus");
      router.push("/app/administrasi");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  };

  const duplicate = async () => {
    const response = await fetch(`/api/administrasi/${administrasi.id}`, { method: "POST" });
    const payload = (await response.json()) as { administrasi?: { id: string }; error?: string };
    if (!response.ok || !payload.administrasi) {
      toast.error(payload.error ?? "Gagal menduplikasi.");
      return;
    }
    toast.success("Administrasi diduplikasi");
    router.push(`/app/administrasi/${payload.administrasi.id}`);
  };

  const navigateTo = (href: string) => {
    if (dirty) setPendingHref(href);
    else router.push(href);
  };

  const addStep = () => {
    setSteps((current) => [
      ...current,
      {
        id: `stp_${Math.random().toString(36).slice(2, 10)}`,
        administrasiId: administrasi.id,
        templateId: templates[0]?.id ?? null,
        name: `Step ${current.length + 1}`,
        position: current.length,
      },
    ]);
    mark();
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    setSteps(next);
    mark();
  };

  const filteredList = list.filter(
    (item) => !drawerQuery || item.name.toLowerCase().includes(drawerQuery.toLowerCase()),
  );

  return (
    <div className="flex h-[calc(100vh-56px)] min-h-0 flex-col">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {name}
            {dirty ? <Badge tone="amber">Belum disimpan</Badge> : null}
          </span>
        }
        description={description || "Paket alur administrasi."}
        breadcrumb={<span>Administrasi / {administrasi.name}</span>}
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setDrawerOpen(true)}>
              <Files className="h-3.5 w-3.5" />
              Daftar
            </Button>
            {status === "active" ? (
              <Link
                href={`/app/surat?administrasi=${administrasi.id}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-[5px] border border-line px-2.5 text-[13px] font-medium text-muted transition-colors hover:bg-warm hover:text-ink"
              >
                <Send className="h-3.5 w-3.5" />
                Buat surat
              </Link>
            ) : null}
            <Button size="sm" variant="primary" onClick={save} loading={saving} disabled={!canEdit}>
              <Save className="h-3.5 w-3.5" />
              Simpan
            </Button>
            {canEdit ? (
              <DropdownMenu
                align="right"
                minWidth={200}
                trigger={<MoreHorizontal className="h-4 w-4 text-muted" />}
                triggerClassName="rounded-[5px] p-1.5 hover:bg-warm"
                items={[
                  { label: "Duplikat alur", icon: Copy, onSelect: duplicate },
                  {
                    label: "Hapus administrasi",
                    icon: Trash2,
                    danger: true,
                    separatorBefore: true,
                    onSelect: () => setDeleteOpen(true),
                  },
                ]}
              />
            ) : null}
          </>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto bg-warm/30">
        <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-3 p-4 sm:p-5">
          <SectionCard title="Identitas alur">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nama administrasi" required>
                <Input
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    mark();
                  }}
                  disabled={!canEdit}
                />
              </Field>
              <Field label="Status">
                <Select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as typeof status);
                    mark();
                  }}
                  disabled={!canEdit}
                >
                  {STATUSES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Deskripsi" className="sm:col-span-2">
                <Textarea
                  value={description}
                  onChange={(event) => {
                    setDescription(event.target.value);
                    mark();
                  }}
                  rows={2}
                  disabled={!canEdit}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            title="Sumber data & penomoran"
            description="Data yang dipilih menjadi baris aktif di wizard surat dan sumber loop."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Global Table sumber"
                hint="Kosongkan jika surat tidak terikat baris data."
              >
                <Select
                  value={dataSourceTableId}
                  onChange={(event) => {
                    setDataSourceTableId(event.target.value);
                    setFilter([]);
                    mark();
                  }}
                  disabled={!canEdit}
                >
                  <option value="">Tanpa sumber data</option>
                  {tables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Pola nomor surat"
                hint={`Contoh hasil: ${preview}`}
              >
                <Input
                  value={numberPattern}
                  onChange={(event) => {
                    setNumberPattern(event.target.value);
                    mark();
                  }}
                  disabled={!canEdit}
                  className="font-mono text-[12px]"
                  placeholder="SP-{seq}/DISPENDIK/{romanMonth}/{year}"
                />
              </Field>
            </div>

            <div className="mt-3 rounded-[6px] border border-line bg-warm/40 p-2.5">
              <p className="mb-1.5 text-[11px] font-medium text-muted">Filter bawaan baris data</p>
              {selectedTable ? (
                <ConditionEditor
                  conditions={filter}
                  onChange={(next) => {
                    setFilter(next);
                    mark();
                  }}
                  match="all"
                  onMatchChange={() => undefined}
                  variables={filterVariables}
                  compact
                  showMatch={false}
                  emptyLabel="Belum ada filter — semua baris data dipakai."
                />
              ) : (
                <p className="text-[11px] text-faint">Pilih sumber data untuk mengatur filter.</p>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-faint">
              <span>
                <code className="rounded bg-warm px-1">{"{seq}"}</code> nomor urut ·{" "}
                <code className="rounded bg-warm px-1">{"{romanMonth}"}</code> bulan romawi ·{" "}
                <code className="rounded bg-warm px-1">{"{year}"}</code>
              </span>
              <span>
                Token lain diisi dari field record, mis. <code className="rounded bg-warm px-1">{"{nip}"}</code>
              </span>
            </div>
          </SectionCard>

          <SectionCard
            title="Step alur"
            description="Urutan dokumen yang dibuat dalam satu surat. Seret atau gunakan tombol panah untuk mengatur urutan."
            actions={
              <Button size="xs" variant="secondary" onClick={addStep} disabled={!canEdit}>
                <Plus className="h-3 w-3" />
                Step
              </Button>
            }
          >
            {steps.length === 0 ? (
              <p className="py-4 text-center text-[12px] text-faint">Belum ada step.</p>
            ) : (
              <ol className="flex flex-col gap-1.5">
                {steps.map((step, index) => (
                  <li
                    key={step.id}
                    draggable={canEdit}
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (dragIndex === null || dragIndex === index) return;
                      const next = [...steps];
                      const [moved] = next.splice(dragIndex, 1);
                      next.splice(index, 0, moved);
                      setSteps(next);
                      setDragIndex(null);
                      mark();
                    }}
                    className="flex flex-wrap items-center gap-1.5 rounded-[6px] border border-line bg-canvas px-2 py-1.5"
                  >
                    <span className="flex items-center gap-1 text-faint">
                      <GripVertical className="h-3.5 w-3.5 cursor-grab" />
                      <span className="flex h-5 w-5 items-center justify-center rounded-[3px] bg-warm text-[10px] font-semibold text-muted">
                        {index + 1}
                      </span>
                    </span>
                    <Input
                      value={step.name}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSteps((current) =>
                          current.map((item) => (item.id === step.id ? { ...item, name: value } : item)),
                        );
                        mark();
                      }}
                      disabled={!canEdit}
                      className="h-7 w-[150px] text-[12px] sm:w-[200px]"
                      aria-label="Nama step"
                    />
                    <Select
                      value={step.templateId ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSteps((current) =>
                          current.map((item) =>
                            item.id === step.id ? { ...item, templateId: value } : item,
                          ),
                        );
                        mark();
                      }}
                      disabled={!canEdit}
                      className="h-7 min-w-[160px] flex-1 text-[12px]"
                      aria-label="Template step"
                    >
                      <option value="">Pilih template</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </Select>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveStep(index, -1)}
                        disabled={index === 0 || !canEdit}
                        className="rounded-[3px] p-1 text-faint hover:bg-warm hover:text-ink disabled:opacity-30"
                        aria-label="Naikkan step"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStep(index, 1)}
                        disabled={index === steps.length - 1 || !canEdit}
                        className="rounded-[3px] p-1 text-faint hover:bg-warm hover:text-ink disabled:opacity-30"
                        aria-label="Turunkan step"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSteps((current) => current.filter((item) => item.id !== step.id));
                          mark();
                        }}
                        disabled={!canEdit}
                        className="rounded-[3px] p-1 text-faint hover:bg-danger-soft hover:text-danger disabled:opacity-30"
                        aria-label="Hapus step"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>

          <SectionCard
            title="Field wizard"
            description="Nilai yang diisi operator saat membuat surat. Gunakan {{surat.key}} di template."
            actions={
              <Button
                size="xs"
                variant="secondary"
                disabled={!canEdit}
                onClick={() => {
                  setFields((current) => [
                    ...current,
                    {
                      key: `field_${current.length + 1}`,
                      label: "Field baru",
                      type: "text",
                      scope: "shared",
                      required: false,
                    },
                  ]);
                  mark();
                }}
              >
                <Plus className="h-3 w-3" />
                Field
              </Button>
            }
          >
            {fields.length === 0 ? (
              <p className="py-3 text-center text-[12px] text-faint">
                Belum ada field wizard. Surat tetap dapat dibuat dengan nomor dan tanggal otomatis.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] border-collapse text-[11.5px]">
                  <thead className="text-left text-[10px] uppercase tracking-[0.05em] text-faint">
                    <tr>
                      <th className="px-1 py-1 font-medium">Key</th>
                      <th className="px-1 py-1 font-medium">Label</th>
                      <th className="px-1 py-1 font-medium">Tipe</th>
                      <th className="px-1 py-1 font-medium">Cakupan</th>
                      <th className="px-1 py-1 text-center font-medium">Wajib</th>
                      <th className="px-1 py-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => (
                      <tr key={index}>
                        <td className="px-1 py-1">
                          <Input
                            value={field.key}
                            onChange={(event) => {
                              const value = event.target.value;
                              setFields((current) =>
                                current.map((item, i) => (i === index ? { ...item, key: value } : item)),
                              );
                              mark();
                            }}
                            disabled={!canEdit}
                            className="h-7 font-mono text-[11px]"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            value={field.label}
                            onChange={(event) => {
                              const value = event.target.value;
                              setFields((current) =>
                                current.map((item, i) => (i === index ? { ...item, label: value } : item)),
                              );
                              mark();
                            }}
                            disabled={!canEdit}
                            className="h-7 text-[11.5px]"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Select
                            value={field.type}
                            onChange={(event) => {
                              const value = event.target.value as LetterFieldType;
                              setFields((current) =>
                                current.map((item, i) => (i === index ? { ...item, type: value } : item)),
                              );
                              mark();
                            }}
                            disabled={!canEdit}
                            className="h-7 text-[11.5px]"
                          >
                            {FIELD_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="px-1 py-1">
                          <Select
                            value={field.scope}
                            onChange={(event) => {
                              const value = event.target.value as "shared" | "record";
                              setFields((current) =>
                                current.map((item, i) => (i === index ? { ...item, scope: value } : item)),
                              );
                              mark();
                            }}
                            disabled={!canEdit}
                            className="h-7 text-[11.5px]"
                          >
                            <option value="shared">Bersama</option>
                            <option value="record">Per baris</option>
                          </Select>
                        </td>
                        <td className="px-1 py-1 text-center">
                          <Checkbox
                            checked={field.required}
                            onChange={(event) => {
                              const value = event.target.checked;
                              setFields((current) =>
                                current.map((item, i) => (i === index ? { ...item, required: value } : item)),
                              );
                              mark();
                            }}
                            disabled={!canEdit}
                          />
                        </td>
                        <td className="px-1 py-1 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setFields((current) => current.filter((_, i) => i !== index));
                              mark();
                            }}
                            disabled={!canEdit}
                            className="rounded-[3px] p-1 text-faint hover:bg-danger-soft hover:text-danger"
                            aria-label="Hapus field"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <div className="flex items-center justify-between pb-4 text-[10.5px] text-faint">
            <span>
              <Workflow className="mr-1 inline h-3 w-3" />
              {steps.length} step · diperbarui {formatRelative(administrasi.updatedAt)}
            </span>
            <span>Simpan setelah selesai mengubah alur.</span>
          </div>
        </div>
      </div>

      <RightDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Administrasi"
        subtitle={`${list.length} paket alur`}
        filters={<SearchInput value={drawerQuery} onChange={setDrawerQuery} placeholder="Cari administrasi…" />}
      >
        {filteredList.length === 0 ? (
          <DrawerEmpty>Tidak ada administrasi yang cocok.</DrawerEmpty>
        ) : (
          filteredList.map((item) => (
            <DrawerItem
              key={item.id}
              active={item.id === administrasi.id}
              onClick={() => item.id !== administrasi.id && navigateTo(`/app/administrasi/${item.id}`)}
              title={item.name}
              meta={`${item.status} · ${item.stepCount} step · ${item.letterCount} surat`}
            />
          ))
        )}
      </RightDrawer>

      <ConfirmDialog
        open={deleteOpen}
        title="Hapus administrasi?"
        description="Administrasi dengan surat terkait tidak dapat dihapus. Tindakan ini permanen."
        confirmLabel="Hapus"
        destructive
        loading={deleting}
        onConfirm={remove}
        onClose={() => setDeleteOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(pendingHref)}
        title="Tinggalkan perubahan?"
        description="Perubahan administrasi yang belum disimpan akan hilang."
        confirmLabel="Tinggalkan"
        destructive
        onConfirm={() => {
          if (pendingHref) router.push(pendingHref);
          setPendingHref(null);
        }}
        onClose={() => setPendingHref(null)}
      />
    </div>
  );
}
