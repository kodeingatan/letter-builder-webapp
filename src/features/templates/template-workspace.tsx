"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Copy,
  Download,
  FilePlus2,
  Files,
  MoreHorizontal,
  Save,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import type { DocumentContent, PageConfig } from "@/lib/documents/types";
import type { TemplateRecord, TemplateVersion } from "@/lib/entities";
import { blocksToText } from "@/lib/documents/blocks";
import { formatDateTime, formatRelative } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { TextField, TextareaField } from "@/components/ui/input";
import { DropdownMenu } from "@/components/ui/menu";
import { SearchInput, Tabs, EmptyState } from "@/components/ui/misc";
import { RightDrawer, DrawerItem, DrawerEmpty } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/ui/misc";
import { DocumentEditor } from "@/components/editor/document-editor";
import type { ComponentOption, LetterFieldOption, TableOption } from "@/components/editor/types";

interface TemplateListItem {
  id: string;
  name: string;
  updatedAt: string;
  usageCount: number;
}

interface TemplateWorkspaceProps {
  template: TemplateRecord;
  templates: TemplateListItem[];
  components: ComponentOption[];
  tables: TableOption[];
  letterFields: LetterFieldOption[];
  canEdit: boolean;
}

type UsageFilter = "all" | "used" | "unused";

export function TemplateWorkspace({
  template,
  templates,
  components,
  tables,
  letterFields,
  canEdit,
}: TemplateWorkspaceProps) {
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description);
  const [content, setContent] = useState<DocumentContent>(template.content);
  const [page, setPage] = useState<PageConfig>(template.page);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [usage, setUsage] = useState<UsageFilter>("all");
  const [sort, setSort] = useState<"recent" | "name">("recent");

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

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
    const list = templates
      .filter((item) => !term || item.name.toLowerCase().includes(term))
      .filter((item) =>
        usage === "all" ? true : usage === "used" ? item.usageCount > 0 : item.usageCount === 0,
      );
    return sort === "recent"
      ? list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      : list.sort((a, b) => a.name.localeCompare(b.name));
  }, [templates, query, usage, sort]);

  const markChanged = (next: { content?: DocumentContent; page?: PageConfig }) => {
    if (next.content) setContent(next.content);
    if (next.page) setPage(next.page);
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          content,
          page,
          createVersion: true,
        }),
      });
      const payload = (await response.json()) as { error?: string; details?: unknown };
      if (!response.ok) {
        toast.error(payload.error ?? "Gagal menyimpan template.");
        return;
      }
      setDirty(false);
      toast.success("Template tersimpan", "Versi baru dibuat di riwayat.");
      router.refresh();
    } catch {
      toast.error("Koneksi gagal", "Periksa jaringan lalu coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  const openVersions = async () => {
    setVersionsOpen(true);
    setVersionsLoading(true);
    try {
      const response = await fetch(`/api/templates/${template.id}/versions`);
      const payload = (await response.json()) as { versions?: TemplateVersion[]; error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Gagal memuat riwayat versi.");
        return;
      }
      setVersions(payload.versions ?? []);
    } finally {
      setVersionsLoading(false);
    }
  };

  const restore = async (version: number) => {
    const response = await fetch(`/api/templates/${template.id}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version }),
    });
    const payload = (await response.json()) as {
      template?: TemplateRecord;
      versions?: TemplateVersion[];
      error?: string;
    };
    if (!response.ok || !payload.template) {
      toast.error(payload.error ?? "Gagal memulihkan versi.");
      return;
    }
    setContent(payload.template.content);
    setPage(payload.template.page);
    setName(payload.template.name);
    setDirty(false);
    setVersions(payload.versions ?? versions);
    toast.success(`Versi ${version} dipulihkan`, "Pemulihan dibuat sebagai versi baru.");
    router.refresh();
  };

  const remove = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/templates/${template.id}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Gagal menghapus template.");
        return;
      }
      toast.success("Template dihapus");
      router.push("/app/templates");
    } finally {
      setDeleting(false);
    }
  };

  const createTemplate = async () => {
    setCreating(true);
    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Template baru",
          description: "",
          content: {
            version: 1,
            blocks: [
              {
                id: `blk_${Math.random().toString(36).slice(2, 12)}`,
                type: "paragraph",
                content: [{ type: "text", text: "" }],
              },
            ],
          },
          page,
        }),
      });
      const payload = (await response.json()) as { template?: TemplateRecord; error?: string };
      if (!response.ok || !payload.template) {
        toast.error(payload.error ?? "Gagal membuat template.");
        return;
      }
      router.push(`/app/templates/${payload.template.id}`);
      router.refresh();
    } finally {
      setCreating(false);
    }
  };

  const navigateTo = (href: string) => {
    if (dirty) {
      setPendingHref(href);
      return;
    }
    router.push(href);
  };

  return (
    <div className="flex h-[calc(100vh-56px)] min-h-0 flex-col">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {name}
            {dirty ? <Badge tone="amber">Belum disimpan</Badge> : null}
          </span>
        }
        description={description || "Dokumen template — variabel, loop, dan kondisi dievaluasi saat surat dibuat."}
        breadcrumb={<span>Templates / {template.name}</span>}
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setDrawerOpen(true)}>
              <Files className="h-3.5 w-3.5" />
              Daftar
            </Button>
            <Button size="sm" variant="ghost" onClick={openVersions}>
              <Clock className="h-3.5 w-3.5" />
              Versi
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
                minWidth={190}
                trigger={<MoreHorizontal className="h-4 w-4 text-muted" />}
                triggerClassName="rounded-[5px] p-1.5 hover:bg-warm"
                items={[
                  {
                    label: "Duplikat template",
                    icon: Copy,
                    onSelect: async () => {
                      const response = await fetch(`/api/templates/${template.id}/duplicate`, {
                        method: "POST",
                      });
                      const payload = (await response.json()) as { template?: { id: string }; error?: string };
                      if (!response.ok || !payload.template) {
                        toast.error(payload.error ?? "Gagal menduplikasi template.");
                        return;
                      }
                      router.push(`/app/templates/${payload.template.id}`);
                      router.refresh();
                    },
                  },
                  {
                    label: "Hapus template",
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

      <DocumentEditor
        key={template.id}
        initialValue={content}
        onChange={(next) => markChanged({ content: next })}
        page={page}
        onPageChange={(next) => markChanged({ page: next })}
        components={components}
        tables={tables}
        letterFields={letterFields}
        readOnly={!canEdit}
      />

      <RightDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Templates"
        subtitle={`${templates.length} template`}
        filters={
          <div className="flex flex-col gap-2">
            <SearchInput value={query} onChange={setQuery} placeholder="Cari template…" />
            <div className="flex items-center justify-between gap-2">
              <Tabs
                value={usage}
                onChange={setUsage}
                tabs={[
                  { value: "all", label: "Semua" },
                  { value: "used", label: "Dipakai" },
                  { value: "unused", label: "Belum" },
                ]}
              />
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as typeof sort)}
                className="h-7 rounded-[4px] border border-line bg-canvas px-1 text-[11px] text-muted"
                aria-label="Urutkan"
              >
                <option value="recent">Terbaru</option>
                <option value="name">Nama</option>
              </select>
            </div>
          </div>
        }
        footer={
          <Button
            size="sm"
            variant="primary"
            className="w-full"
            onClick={createTemplate}
            loading={creating}
            disabled={!canEdit}
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            Template baru
          </Button>
        }
      >
        {filtered.length === 0 ? (
          <DrawerEmpty>Tidak ada template yang cocok.</DrawerEmpty>
        ) : (
          filtered.map((item) => (
            <DrawerItem
              key={item.id}
              active={item.id === template.id}
              onClick={() => {
                if (item.id === template.id) return;
                navigateTo(`/app/templates/${item.id}`);
              }}
              title={item.name}
              meta={`${formatRelative(item.updatedAt)} · ${item.usageCount} administrasi`}
            />
          ))
        )}
      </RightDrawer>

      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Pengaturan template"
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
          <TextField
            label="Nama template"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
          />
          <TextareaField
            label="Deskripsi"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={240}
            rows={3}
          />
          <div className="rounded-[6px] border border-line bg-warm/60 px-2.5 py-2 text-[11px] leading-relaxed text-muted">
            Perubahan nama dan deskripsi ikut tersimpan saat tombol <strong>Simpan</strong> ditekan.
          </div>
        </div>
      </Dialog>

      <Dialog
        open={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        title="Riwayat versi"
        description="Setiap penyimpanan membuat versi baru. Memulihkan versi lama tidak menghapus riwayat."
        size="lg"
      >
        {versionsLoading ? (
          <p className="py-8 text-center text-[12px] text-muted">Memuat versi…</p>
        ) : versions.length === 0 ? (
          <EmptyState
            icon={Clock}
            compact
            title="Belum ada versi"
            description="Simpan template untuk membuat versi pertama."
          />
        ) : (
          <div className="max-h-[420px] divide-y divide-line overflow-y-auto">
            {versions.map((version) => (
              <div key={version.id} className="flex items-start gap-3 py-2.5">
                <Badge tone={version.version === versions[0]?.version ? "green" : "neutral"}>
                  v{version.version}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium text-ink">
                    {version.version === versions[0]?.version ? "Versi terbaru" : `Versi ${version.version}`}
                  </p>
                  <p className="mt-0.5 text-[11px] text-faint">
                    {formatDateTime(version.createdAt)} · {version.createdByName ?? "Sistem"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted">
                    {blocksToText(version.content.blocks).slice(0, 180) || "Dokumen kosong"}
                  </p>
                </div>
                {canEdit && version.version !== versions[0]?.version ? (
                  <Button size="xs" variant="secondary" onClick={() => restore(version.version)}>
                    <Download className="h-3 w-3" />
                    Pulihkan
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingHref)}
        title="Tinggalkan perubahan?"
        description="Perubahan template yang belum disimpan akan hilang."
        confirmLabel="Tinggalkan"
        destructive
        onConfirm={() => {
          if (pendingHref) router.push(pendingHref);
          setPendingHref(null);
        }}
        onClose={() => setPendingHref(null)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Hapus template?"
        description="Template yang dipakai administrasi tidak dapat dihapus. Tindakan ini permanen."
        confirmLabel="Hapus template"
        destructive
        loading={deleting}
        onConfirm={remove}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}
