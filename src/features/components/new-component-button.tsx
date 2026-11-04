"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, TextField } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export function NewComponentButton() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Umum");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    if (name.trim().length < 2) {
      setError("Nama component minimal 2 karakter.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/components", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim() || "Umum",
          description: description.trim(),
          tableId: null,
          content: {
            version: 1,
            blocks: [
              {
                id: `blk_${Math.random().toString(36).slice(2, 12)}`,
                type: "paragraph",
                content: [],
              },
            ],
          },
        }),
      });
      const payload = (await response.json()) as { component?: { id: string }; error?: string };
      if (!response.ok || !payload.component) {
        setError(payload.error ?? "Gagal membuat component.");
        return;
      }
      setOpen(false);
      router.push(`/app/components/${payload.component.id}`);
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
        Component baru
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Component baru"
        description="Component adalah blok reusable yang dapat dipakai di banyak template."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={create} loading={loading}>
              Buat component
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <TextField
            label="Nama"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="mis. Kop Surat"
            error={error}
            autoFocus
          />
          <TextField
            label="Kategori"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Kop & Identitas"
          />
          <div>
            <label className="text-[12px] font-medium text-muted">Deskripsi</label>
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1.5"
              placeholder="Deskripsi singkat (opsional)"
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}
