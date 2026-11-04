"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TextField, TextareaField } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export function NewTableButton() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    if (name.trim().length < 2) {
      setError("Nama tabel minimal 2 karakter.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), icon: "table" }),
      });
      const payload = (await response.json()) as { table?: { id: string }; error?: string };
      if (!response.ok || !payload.table) {
        setError(payload.error ?? "Gagal membuat tabel.");
        return;
      }
      setOpen(false);
      router.push(`/app/tables/${payload.table.id}`);
      router.refresh();
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="primary" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        Tabel baru
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Tabel data baru"
        description="Global Table menjadi sumber variabel untuk semua komponen dan template."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={create} loading={loading}>
              Buat tabel
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <TextField
            label="Nama tabel"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="mis. Pegawai"
            error={error}
            autoFocus
          />
          <TextareaField
            label="Deskripsi"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Untuk apa data ini dipakai?"
            rows={3}
          />
        </div>
      </Dialog>
    </>
  );
}
