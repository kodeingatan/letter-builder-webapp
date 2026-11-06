"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Files, MoreHorizontal, Save, SlidersHorizontal, Trash2 } from "lucide-react";
import { DEFAULT_PAGE, type DocumentContent } from "@/lib/documents/types";
import type { ComponentRecord } from "@/lib/entities";
import type { TableWithFields } from "@/features/global-tables/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { TextField, TextareaField, Select } from "@/components/ui/input";
import { DropdownMenu } from "@/components/ui/menu";
import { DrawerEmpty, DrawerItem, RightDrawer } from "@/components/ui/drawer";
import { PageHeader, SearchInput } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { DocumentEditor } from "@/components/editor/document-editor";
import { formatRelative } from "@/lib/utils";

interface ComponentListItem {
  id: string;
  name: string;
  category: string;
  updatedAt: string;
  usageCount: number;
}

export function ComponentWorkspace({
  component,
  components,
  tables,
  letterFields,
  canEdit,
  usageCount = 0,
}: {
  usageCount?: number;
  component: ComponentRecord;
  components: ComponentListItem[];
  tables: TableWithFields[];
  letterFields: Array<{ key: string; label: string; type: string }>;
  canEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState(component.name);
  const [category, setCategory] = useState(component.category);
  const [description, setDescription] = useState(component.description);
  const [tableId, setTableId] = useState<string | null>(component.tableId);
  const [content, setContent] = useState<DocumentContent>(component.content);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return components.filter(
      (item) =>
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term),
    );
  }, [components, query]);

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/components/${component.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, description, tableId, content }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Gagal menyimpan component.");
        return;
      }
      setDirty(false);
      toast.success("Component tersimpan", "Semua template yang memakainya ikut diperbarui.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/components/${component.id}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string; details?: Array<{ name: string }> };
      if (!response.ok) {
        toast.error(
          payload.error ?? "Gagal menghapus component.",
          payload.details?.map((item) => item.name).join(", "),
        );
        return;
      }
      toast.success("Component dihapus");
      router.push("/app/components");
    } finally {
      setDeleting(false);
    }
  };

  const navigateTo = (href: string) => {
    if (dirty) setPendingHref(href);
    else router.push(href);
  };

  return (
    <div className="flex h-[calc(100vh-56px)] min-h-0 flex-col">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {name}
            {dirty ? <Badge tone="amber">Belum disimpan</Badge> : null}
            <Badge tone="neutral">{usageCount} template</Badge>
          </span>
        }
        description={description || "Blok dokumen reusable."}
        breadcrumb={<span>Components / {component.name}</span>}
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setDrawerOpen(true)}>
              <Files className="h-3.5 w-3.5" />
              Daftar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSettingsOpen(true)} disabled={!canEdit}>
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Pengaturan
            </Button>
            <Button size="sm" variant="primary" onClick={save} loading={saving} disabled={!canEdit}>
              <Save className="h-3.5 w-3.5" />
              Simpan
            </Button>
            {canEdit ? (
              <DropdownMenu
                align="right"
                minWidth={180}
                trigger={<MoreHorizontal className="h-4 w-4 text-muted" />}
                triggerClassName="rounded-[5px] p-1.5 hover:bg-warm"
                items={[
                  {
                    label: "Hapus component",
                    icon: Trash2,
                    danger: true,
                    onSelect: () => setDeleteOpen(true),
                  },
                ]}
              />
            ) : null}
          </>
        }
      />

      <DocumentEditor
        key={component.id}
        initialValue={content}
        onChange={(next) => {
          setContent(next);
          setDirty(true);
        }}
        page={DEFAULT_PAGE}
        onPageChange={() => undefined}
        components={components.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
        }))}
        tables={tables}
        letterFields={letterFields}
        activeTableId={tableId}
        readOnly={!canEdit}
        allowPageSettings={false}
      />

      <RightDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Components"
        subtitle={`${components.length} component`}
        filters={<SearchInput value={query} onChange={setQuery} placeholder="Cari component…" />}
      >
        {filtered.length === 0 ? (
          <DrawerEmpty>Tidak ada component yang cocok.</DrawerEmpty>
        ) : (
          filtered.map((item) => (
            <DrawerItem
              key={item.id}
              active={item.id === component.id}
              onClick={() => item.id !== component.id && navigateTo(`/app/components/${item.id}`)}
              title={item.name}
              meta={`${item.category} · ${formatRelative(item.updatedAt)}`}
              trailing={<span className="text-[10px] text-faint">{item.usageCount}</span>}
            />
          ))
        )}
      </RightDrawer>

      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Pengaturan component"
        size="sm"
        footer={
          <Button
            variant="primary"
            onClick={() => {
              setDirty(true);
              setSettingsOpen(false);
            }}
          >
            Terapkan
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <TextField label="Nama" value={name} onChange={(event) => setName(event.target.value)} />
          <TextField
            label="Kategori"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />
          <TextareaField
            label="Deskripsi"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
          />
          <div>
            <label className="text-[12px] font-medium text-muted">Sumber data utama (opsional)</label>
            <Select
              value={tableId ?? ""}
              onChange={(event) => setTableId(event.target.value || null)}
              className="mt-1.5"
            >
              <option value="">Tanpa sumber data</option>
              {tables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[11px] text-faint">
              Membantu editor menampilkan variabel baris aktif.
            </p>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        title="Hapus component?"
        description="Component yang sedang dipakai template tidak dapat dihapus."
        confirmLabel="Hapus component"
        destructive
        loading={deleting}
        onConfirm={remove}
        onClose={() => setDeleteOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(pendingHref)}
        title="Tinggalkan perubahan?"
        description="Perubahan component yang belum disimpan akan hilang."
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
