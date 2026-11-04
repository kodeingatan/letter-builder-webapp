"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TextField, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export function NewAdministrasiButton({
  templates,
}: {
  templates?: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState(templates?.[0]?.id ?? "");
  const [options, setOptions] = useState(templates ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openDialog = async () => {
    setOpen(true);
    if (options.length === 0) {
      const response = await fetch("/api/templates");
      if (response.ok) {
        const payload = (await response.json()) as { templates?: Array<{ id: string; name: string }> };
        setOptions(payload.templates ?? []);
        if (payload.templates?.[0]) setTemplateId(payload.templates[0].id);
      }
    }
  };

  const create = async () => {
    if (name.trim().length < 2) {
      setError("Nama administrasi minimal 2 karakter.");
      return;
    }
    if (!templateId) {
      setError("Pilih template untuk step pertama.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/administrasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: "",
          status: "draft",
          dataSourceTableId: null,
          filter: [],
          numberPattern: "SP-{seq}/LS/{romanMonth}/{year}",
          fields: [
            { key: "nomor", label: "Nomor Surat", type: "text", scope: "shared", required: true },
            { key: "tanggal", label: "Tanggal Surat", type: "date", scope: "shared", required: true },
          ],
          steps: [{ name: "Step 1", templateId }],
        }),
      });
      const payload = (await response.json()) as { administrasi?: { id: string }; error?: string };
      if (!response.ok || !payload.administrasi) {
        setError(payload.error ?? "Gagal membuat administrasi.");
        return;
      }
      setOpen(false);
      router.push(`/app/administrasi/${payload.administrasi.id}`);
      router.refresh();
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="primary" onClick={openDialog}>
        <Plus className="h-3.5 w-3.5" />
        Administrasi baru
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Administrasi baru"
        description="Paket alur dimulai dengan satu step. Tambahkan step berikutnya setelah tersimpan."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={create} loading={loading}>
              Buat alur
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <TextField
            label="Nama administrasi"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="mis. Surat Perintah Perjalanan Dinas"
            error={error}
            autoFocus
          />
          <div>
            <label className="text-[12px] font-medium text-muted">Template step pertama</label>
            <Select
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value)}
              className="mt-1.5"
            >
              {options.length === 0 ? <option value="">Belum ada template</option> : null}
              {options.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Dialog>
    </>
  );
}
