"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Files,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings2,
  Table2,
  Trash2,
} from "lucide-react";
import type { GlobalField, GlobalFieldType, GlobalRecord, GlobalTable } from "@/lib/entities";
import { formatRelative } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Select, TextField, TextareaField } from "@/components/ui/input";
import { DropdownMenu } from "@/components/ui/menu";
import { DrawerEmpty, DrawerItem, RightDrawer } from "@/components/ui/drawer";
import { EmptyState, PageHeader, SearchInput, Tabs } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { NewTableButton } from "./new-table-button";

type Tab = "structure" | "data";

const FIELD_TYPES: Array<{ value: GlobalFieldType; label: string }> = [
  { value: "text", label: "Teks" },
  { value: "number", label: "Angka" },
  { value: "date", label: "Tanggal" },
  { value: "select", label: "Pilihan" },
  { value: "boolean", label: "Ya / Tidak" },
  { value: "email", label: "Surel" },
];

export function TableWorkspace({
  table,
  fields: initialFields,
  records: initialRecords,
  tables,
  canEdit,
}: {
  table: GlobalTable;
  fields: GlobalField[];
  records: GlobalRecord[];
  tables: GlobalTable[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState(table.name);
  const [description, setDescription] = useState(table.description);
  const [fields, setFields] = useState(initialFields);
  const [records, setRecords] = useState(initialRecords);
  const [tab, setTab] = useState<Tab>("structure");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerQuery, setDrawerQuery] = useState("");
  const [recordQuery, setRecordQuery] = useState("");

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fieldDialog, setFieldDialog] = useState<{ open: boolean; field: GlobalField | null }>({
    open: false,
    field: null,
  });
  const [deleteField, setDeleteField] = useState<GlobalField | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<GlobalRecord | null>(null);
  const [deleteTableOpen, setDeleteTableOpen] = useState(false);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const filteredRecords = useMemo(() => {
    const term = recordQuery.trim().toLowerCase();
    if (!term) return records;
    return records.filter((record) =>
      Object.values(record.data).some((value) =>
        String(value ?? "").toLowerCase().includes(term),
      ),
    );
  }, [records, recordQuery]);

  const filteredTables = tables.filter(
    (item) => !drawerQuery || item.name.toLowerCase().includes(drawerQuery.toLowerCase()),
  );

  const saveTableSettings = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/tables/${table.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, icon: table.icon }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Gagal menyimpan tabel.");
        return;
      }
      setSettingsOpen(false);
      toast.success("Tabel diperbarui");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const removeTable = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/tables/${table.id}`, { method: "DELETE" });
      const payload = (await response.json()) as {
        error?: string;
        details?: Array<{ name: string; kind: string }>;
      };
      if (!response.ok) {
        toast.error(
          payload.error ?? "Gagal menghapus tabel.",
          payload.details?.map((item) => item.name).join(", "),
        );
        return;
      }
      toast.success("Tabel dihapus");
      router.push("/app/tables");
    } finally {
      setBusy(false);
    }
  };

  const saveRecord = async (record: GlobalRecord, data: Record<string, string | number | boolean | null>) => {
    const previous = records;
    setRecords((current) =>
      current.map((item) => (item.id === record.id ? { ...item, data } : item)),
    );
    try {
      const response = await fetch(`/api/tables/${table.id}/records/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setRecords(previous);
        toast.error(payload.error ?? "Gagal menyimpan baris.");
      }
    } catch {
      setRecords(previous);
      toast.error("Koneksi gagal", "Perubahan baris dibatalkan.");
    }
  };

  const removeRecord = async () => {
    if (!deleteRecord) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/tables/${table.id}/records/${deleteRecord.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Gagal menghapus baris.");
        return;
      }
      setRecords((current) => current.filter((item) => item.id !== deleteRecord.id));
      setDeleteRecord(null);
      toast.success("Baris dihapus");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-56px)] min-h-0 flex-col">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {name}
            <Badge tone="neutral">{fields.length} field</Badge>
            <Badge tone="blue">{records.length} baris</Badge>
          </span>
        }
        description={description || "Tabel data dinamis."}
        breadcrumb={<span>Global Tables / {table.name}</span>}
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setDrawerOpen(true)}>
              <Files className="h-3.5 w-3.5" />
              Daftar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSettingsOpen(true)} disabled={!canEdit}>
              <Settings2 className="h-3.5 w-3.5" />
              Pengaturan
            </Button>
            {canEdit ? (
              <DropdownMenu
                align="right"
                minWidth={180}
                trigger={<MoreHorizontal className="h-4 w-4 text-muted" />}
                triggerClassName="rounded-[5px] p-1.5 hover:bg-warm"
                items={[
                  {
                    label: "Hapus tabel",
                    icon: Trash2,
                    danger: true,
                    onSelect: () => setDeleteTableOpen(true),
                  },
                ]}
              />
            ) : null}
          </>
        }
      />

      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "structure", label: "Struktur", count: fields.length },
            { value: "data", label: "Data", count: records.length },
          ]}
        />
        {tab === "structure" ? (
          <Button
            size="xs"
            variant="secondary"
            disabled={!canEdit}
            onClick={() => setFieldDialog({ open: true, field: null })}
          >
            <Plus className="h-3 w-3" />
            Field
          </Button>
        ) : (
          <div className="flex items-center gap-1.5">
            <SearchInput
              value={recordQuery}
              onChange={setRecordQuery}
              placeholder="Cari baris…"
              className="w-40 sm:w-56"
            />
            <Button
              size="xs"
              variant="secondary"
              disabled={!canEdit || fields.length === 0}
              onClick={() => setRecordDialogOpen(true)}
            >
              <Plus className="h-3 w-3" />
              Baris
            </Button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {tab === "structure" ? (
          fields.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Table2}
                compact
                title="Belum ada field"
                description="Tambahkan field seperti nama, nip, atau unit_kerja."
                action={
                  canEdit ? (
                    <Button size="sm" onClick={() => setFieldDialog({ open: true, field: null })}>
                      <Plus className="h-3.5 w-3.5" /> Tambah field
                    </Button>
                  ) : null
                }
              />
            </div>
          ) : (
            <table className="w-full border-collapse text-[12px]">
              <thead className="sticky top-0 z-10 bg-warm/95 text-left text-[10.5px] uppercase tracking-[0.05em] text-faint backdrop-blur">
                <tr>
                  <th className="border-b border-line px-3 py-2 font-medium">Label</th>
                  <th className="border-b border-line px-3 py-2 font-medium">Nama variabel</th>
                  <th className="border-b border-line px-3 py-2 font-medium">Tipe</th>
                  <th className="border-b border-line px-3 py-2 font-medium">Wajib</th>
                  <th className="border-b border-line px-3 py-2 font-medium">Pilihan</th>
                  <th className="border-b border-line px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {fields.map((field) => (
                  <tr key={field.id} className="group hover:bg-warm/40">
                    <td className="border-b border-line px-3 py-1.5 font-medium text-ink">
                      {field.label}
                    </td>
                    <td className="border-b border-line px-3 py-1.5">
                      <code className="rounded-[3px] bg-warm px-1 py-0.5 text-[11px] text-muted">
                        {field.name}
                      </code>
                    </td>
                    <td className="border-b border-line px-3 py-1.5 text-muted">
                      {FIELD_TYPES.find((type) => type.value === field.type)?.label ?? field.type}
                    </td>
                    <td className="border-b border-line px-3 py-1.5 text-muted">
                      {field.required ? "Ya" : "—"}
                    </td>
                    <td className="max-w-[220px] truncate border-b border-line px-3 py-1.5 text-[11px] text-faint">
                      {field.options.length > 0 ? field.options.join(", ") : "—"}
                    </td>
                    <td className="border-b border-line px-2 py-1.5 text-right">
                      {canEdit ? (
                        <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => setFieldDialog({ open: true, field })}
                            className="rounded-[3px] p-1 text-faint hover:bg-warm hover:text-ink"
                            aria-label={`Ubah ${field.label}`}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteField(field)}
                            className="rounded-[3px] p-1 text-faint hover:bg-danger-soft hover:text-danger"
                            aria-label={`Hapus ${field.label}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : fields.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Table2}
              compact
              title="Struktur belum siap"
              description="Tambahkan field terlebih dahulu sebelum mengisi data."
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead className="sticky top-0 z-10 bg-warm/95 text-left text-[10.5px] uppercase tracking-[0.05em] text-faint backdrop-blur">
                  <tr>
                    <th className="w-10 border-b border-line px-2 py-2 text-center font-medium">#</th>
                    {fields.map((field) => (
                      <th key={field.id} className="min-w-[140px] border-b border-line px-2 py-2 font-medium">
                        {field.label}
                        {field.required ? <span className="ml-0.5 text-danger">*</span> : null}
                      </th>
                    ))}
                    <th className="w-10 border-b border-line px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record, index) => (
                    <tr key={record.id} className="group hover:bg-warm/30">
                      <td className="border-b border-line px-2 py-1 text-center text-[10.5px] text-faint">
                        {index + 1}
                      </td>
                      {fields.map((field) => (
                        <td key={field.id} className="border-b border-line px-1 py-1 align-top">
                          <RecordCell
                            field={field}
                            value={record.data[field.name] ?? null}
                            readOnly={!canEdit}
                            onSave={(value) =>
                              saveRecord(record, { ...record.data, [field.name]: value })
                            }
                          />
                        </td>
                      ))}
                      <td className="border-b border-line px-1 py-1 text-right">
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => setDeleteRecord(record)}
                            className="rounded-[3px] p-1 text-faint opacity-0 transition-opacity hover:bg-danger-soft hover:text-danger group-hover:opacity-100"
                            aria-label="Hapus baris"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={fields.length + 2} className="px-3 py-10 text-center text-[12px] text-faint">
                        Tidak ada baris yang cocok.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-[10.5px] text-faint">
              <span>
                {filteredRecords.length} dari {records.length} baris · perubahan sel tersimpan otomatis
              </span>
              <span>Diperbarui {formatRelative(table.updatedAt)}</span>
            </div>
          </>
        )}
      </div>

      <RightDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpen={() => setDrawerOpen(true)}
        title="Global Tables"
        subtitle={`${tables.length} tabel`}
        filters={<SearchInput value={drawerQuery} onChange={setDrawerQuery} placeholder="Cari tabel…" />}
        footer={<NewTableButton />}
      >
        {filteredTables.length === 0 ? (
          <DrawerEmpty>Tidak ada tabel yang cocok.</DrawerEmpty>
        ) : (
          filteredTables.map((item) => (
            <DrawerItem
              key={item.id}
              active={item.id === table.id}
              onClick={() => item.id !== table.id && router.push(`/app/tables/${item.id}`)}
              title={item.name}
              meta={`${item.fieldCount ?? 0} field · ${item.recordCount ?? 0} baris`}
            />
          ))
        )}
      </RightDrawer>

      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Pengaturan tabel"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSettingsOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={saveTableSettings} loading={busy}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <TextField label="Nama tabel" value={name} onChange={(event) => setName(event.target.value)} />
          <TextareaField
            label="Deskripsi"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
          />
        </div>
      </Dialog>

      <FieldDialog
        open={fieldDialog.open}
        field={fieldDialog.field}
        tableId={table.id}
        onClose={() => setFieldDialog({ open: false, field: null })}
        onSaved={(field, mode) => {
          setFields((current) =>
            mode === "create"
              ? [...current, field]
              : current.map((item) => (item.id === field.id ? field : item)),
          );
          setFieldDialog({ open: false, field: null });
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteField)}
        title={`Hapus field ${deleteField?.label ?? ""}?`}
        description="Nilai field pada semua baris ikut dihapus. Ekspresi template yang masih memakai field ini akan tampil sebagai penanda merah."
        confirmLabel="Hapus field"
        destructive
        loading={busy}
        onConfirm={async () => {
          if (!deleteField) return;
          setBusy(true);
          try {
            const response = await fetch(`/api/tables/${table.id}/fields/${deleteField.id}`, {
              method: "DELETE",
            });
            const payload = (await response.json()) as { error?: string; usage?: number };
            if (!response.ok) {
              toast.error(payload.error ?? "Gagal menghapus field.");
              return;
            }
            setFields((current) => current.filter((item) => item.id !== deleteField.id));
            setRecords((current) =>
              current.map((record) => {
                const data = { ...record.data };
                delete data[deleteField.name];
                return { ...record, data };
              }),
            );
            toast.success(
              "Field dihapus",
              payload.usage ? `${payload.usage} dokumen masih mereferensikan field ini.` : undefined,
            );
            router.refresh();
          } finally {
            setBusy(false);
            setDeleteField(null);
          }
        }}
        onClose={() => setDeleteField(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteRecord)}
        title="Hapus baris data?"
        description="Baris yang sudah dipakai surat tidak dapat dihapus. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus baris"
        destructive
        loading={busy}
        onConfirm={removeRecord}
        onClose={() => setDeleteRecord(null)}
      />

      <ConfirmDialog
        open={deleteTableOpen}
        title={`Hapus tabel ${name}?`}
        description="Seluruh field, baris, dan referensi akan dihapus. Tabel yang masih dipakai component, template, atau administrasi akan ditolak."
        confirmLabel="Hapus tabel"
        destructive
        loading={busy}
        onConfirm={removeTable}
        onClose={() => setDeleteTableOpen(false)}
      />

      <AddRecordDialog
        open={recordDialogOpen}
        fields={fields}
        onClose={() => setRecordDialogOpen(false)}
        onCreated={(record) => {
          setRecords((current) => [...current, record]);
          setRecordDialogOpen(false);
          router.refresh();
        }}
        tableId={table.id}
      />
    </div>
  );
}

function RecordCell({
  field,
  value,
  readOnly,
  onSave,
}: {
  field: GlobalField;
  value: string | number | boolean | null;
  readOnly: boolean;
  onSave: (value: string | number | boolean | null) => void;
}) {
  const [local, setLocal] = useState(value);
  const baseClass =
    "w-full rounded-[3px] border border-transparent bg-transparent px-1.5 py-1 text-[12px] hover:border-line focus:border-brand focus:bg-canvas focus:outline-none";

  if (readOnly) {
    return (
      <span className="block px-1.5 py-1 text-[12px] text-muted">
        {field.type === "boolean" ? (value ? "Ya" : "Tidak") : String(value ?? "—")}
      </span>
    );
  }

  if (field.type === "select") {
    return (
      <select
        className={baseClass}
        value={String(value ?? "")}
        onChange={(event) => {
          setLocal(event.target.value);
          onSave(event.target.value);
        }}
        aria-label={field.label}
      >
        <option value="">—</option>
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "boolean") {
    return (
      <label className="flex items-center justify-center py-1">
        <Checkbox
          checked={Boolean(value)}
          onChange={(event) => {
            setLocal(event.target.checked);
            onSave(event.target.checked);
          }}
          aria-label={field.label}
        />
      </label>
    );
  }

  return (
    <input
      type={field.type === "date" ? "date" : field.type === "number" ? "number" : field.type === "email" ? "email" : "text"}
      className={baseClass}
      defaultValue={String(value ?? "")}
      onBlur={(event) => {
        const next = event.target.value;
        if (String(local ?? "") === next) return;
        setLocal(next);
        onSave(next);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      aria-label={field.label}
    />
  );
}

function FieldDialog({
  open,
  field,
  tableId,
  onClose,
  onSaved,
}: {
  open: boolean;
  field: GlobalField | null;
  tableId: string;
  onClose: () => void;
  onSaved: (field: GlobalField, mode: "create" | "update") => void;
}) {
  const toast = useToast();
  const [label, setLabel] = useState(field?.label ?? "");
  const [name, setName] = useState(field?.name ?? "");
  const [type, setType] = useState<GlobalFieldType>(field?.type ?? "text");
  const [options, setOptions] = useState(field?.options.join(", ") ?? "");
  const [required, setRequired] = useState(field?.required ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoName, setAutoName] = useState(!field);

  // Reset the form when a different field is opened.
  const [lastKey, setLastKey] = useState(`${open}:${field?.id ?? "new"}`);
  const currentKey = `${open}:${field?.id ?? "new"}`;
  if (currentKey !== lastKey) {
    setLastKey(currentKey);
    setLabel(field?.label ?? "");
    setName(field?.name ?? "");
    setType(field?.type ?? "text");
    setOptions(field?.options.join(", ") ?? "");
    setRequired(field?.required ?? false);
    setAutoName(!field);
    setError(null);
  }

  const submit = async () => {
    const finalName = autoName
      ? label
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .slice(0, 40)
      : name.trim();

    if (label.trim().length < 2) {
      setError("Label minimal 2 karakter.");
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(finalName)) {
      setError("Nama variabel harus huruf kecil, angka, atau garis bawah.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        field ? `/api/tables/${tableId}/fields/${field.id}` : `/api/tables/${tableId}/fields`,
        {
          method: field ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: finalName,
            label: label.trim(),
            type,
            required,
            options: options
              .split(",")
              .map((option) => option.trim())
              .filter(Boolean),
          }),
        },
      );
      const payload = (await response.json()) as { field?: GlobalField; error?: string };
      if (!response.ok || !payload.field) {
        setError(payload.error ?? "Gagal menyimpan field.");
        return;
      }
      onSaved(payload.field, field ? "update" : "create");
      toast.success(field ? "Field diperbarui" : "Field ditambahkan");
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={field ? "Ubah field" : "Field baru"}
      description="Nama variabel dipakai pada ekspresi dokumen, mis. {{pegawai.nama}}."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" onClick={submit} loading={loading}>
            <Check className="h-3.5 w-3.5" />
            Simpan
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <TextField
          label="Label"
          required
          value={label}
          autoFocus
          onChange={(event) => {
            setLabel(event.target.value);
            if (autoName) {
              setName(
                event.target.value
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .replace(/[^a-z0-9]+/g, "_")
                  .replace(/^_+|_+$/g, "")
                  .slice(0, 40),
              );
            }
          }}
          placeholder="Nama Lengkap"
          error={error}
        />
        <div>
          <label className="text-[12px] font-medium text-muted">Nama variabel</label>
          <Input
            value={name}
            onChange={(event) => {
              setAutoName(false);
              setName(event.target.value);
            }}
            placeholder="nama"
            className="mt-1.5 font-mono text-[12px]"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[12px] font-medium text-muted">Tipe</label>
            <Select
              value={type}
              onChange={(event) => setType(event.target.value as GlobalFieldType)}
              className="mt-1.5"
            >
              {FIELD_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-[12px] text-muted">
              <Checkbox checked={required} onChange={(event) => setRequired(event.target.checked)} />
              Wajib diisi
            </label>
          </div>
        </div>
        {type === "select" ? (
          <Field label="Pilihan (pisahkan dengan koma)" hint="mis. PNS, PPPK, Honorer">
            <Input value={options} onChange={(event) => setOptions(event.target.value)} />
          </Field>
        ) : null}
      </div>
    </Dialog>
  );
}

function AddRecordDialog({
  open,
  fields,
  tableId,
  onClose,
  onCreated,
}: {
  open: boolean;
  fields: GlobalField[];
  tableId: string;
  onClose: () => void;
  onCreated: (record: GlobalRecord) => void;
}) {
  const toast = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tables/${tableId}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: values }),
      });
      const payload = (await response.json()) as { record?: GlobalRecord; error?: string };
      if (!response.ok || !payload.record) {
        setError(payload.error ?? "Gagal menambah baris.");
        return;
      }
      setValues({});
      onCreated(payload.record);
      toast.success("Baris ditambahkan");
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Baris data baru"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" onClick={submit} loading={loading}>
            Simpan baris
          </Button>
        </>
      }
    >
      <div className="grid max-h-[52vh] gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.id}>
            <label className="text-[12px] font-medium text-muted">
              {field.label}
              {field.required ? <span className="ml-0.5 text-danger">*</span> : null}
            </label>
            {field.type === "select" ? (
              <Select
                value={values[field.name] ?? ""}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field.name]: event.target.value }))
                }
                className="mt-1.5"
              >
                <option value="">—</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            ) : field.type === "boolean" ? (
              <label className="mt-2 flex items-center gap-2 text-[12px] text-muted">
                <Checkbox
                  checked={values[field.name] === "true"}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [field.name]: event.target.checked ? "true" : "false",
                    }))
                  }
                />
                Ya
              </label>
            ) : (
              <Input
                type={field.type === "date" ? "date" : field.type === "number" ? "number" : field.type === "email" ? "email" : "text"}
                value={values[field.name] ?? ""}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field.name]: event.target.value }))
                }
                className="mt-1.5"
              />
            )}
          </div>
        ))}
      </div>
      {error ? <p className="mt-2 text-[11.5px] text-danger">{error}</p> : null}
    </Dialog>
  );
}
