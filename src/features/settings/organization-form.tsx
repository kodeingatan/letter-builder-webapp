"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import type { OrganizationSettings } from "@/lib/entities";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";

export function OrganizationForm({
  settings,
  canEdit,
}: {
  settings: OrganizationSettings;
  canEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof OrganizationSettings, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    if (form.name.trim().length < 2) {
      setError("Nama instansi minimal 2 karakter.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { settings?: OrganizationSettings; error?: string };
      if (!response.ok || !payload.settings) {
        setError(payload.error ?? "Gagal menyimpan pengaturan.");
        return;
      }
      setForm(payload.settings);
      toast.success("Pengaturan instansi tersimpan");
      router.refresh();
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-[1080px] gap-3 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-3">
        <SectionCard
          title="Identitas instansi"
          description="Dipakai pada kop surat dan komponen tanda tangan."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nama instansi" required className="sm:col-span-2">
              <Input
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                disabled={!canEdit}
                placeholder="PEMERINTAH KOTA NUSANTARA"
              />
            </Field>
            <Field label="Unit kerja" className="sm:col-span-2">
              <Input
                value={form.subtitle}
                onChange={(event) => update("subtitle", event.target.value)}
                disabled={!canEdit}
                placeholder="DINAS PENDIDIKAN DAN KEBUDAYAAN"
              />
            </Field>
            <Field label="Alamat" className="sm:col-span-2">
              <Textarea
                value={form.address}
                onChange={(event) => update("address", event.target.value)}
                disabled={!canEdit}
                rows={2}
              />
            </Field>
            <Field label="Kota & kode pos">
              <Input
                value={form.city}
                onChange={(event) => update("city", event.target.value)}
                disabled={!canEdit}
              />
            </Field>
            <Field label="Telepon">
              <Input
                value={form.phone}
                onChange={(event) => update("phone", event.target.value)}
                disabled={!canEdit}
              />
            </Field>
            <Field label="Surel">
              <Input
                type="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                disabled={!canEdit}
              />
            </Field>
            <Field label="Situs web">
              <Input
                value={form.website}
                onChange={(event) => update("website", event.target.value)}
                disabled={!canEdit}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          title="Penanda tangan"
          description="Data default untuk blok tanda tangan pada template."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nama lengkap">
              <Input
                value={form.signerName}
                onChange={(event) => update("signerName", event.target.value)}
                disabled={!canEdit}
              />
            </Field>
            <Field label="Jabatan">
              <Input
                value={form.signerRole}
                onChange={(event) => update("signerRole", event.target.value)}
                disabled={!canEdit}
              />
            </Field>
            <Field label="NIP">
              <Input
                value={form.signerNip}
                onChange={(event) => update("signerNip", event.target.value)}
                disabled={!canEdit}
              />
            </Field>
          </div>
        </SectionCard>

        {error ? <p className="text-[12px] text-danger">{error}</p> : null}

        <div className="flex items-center justify-end gap-2 pb-4">
          <Button variant="primary" onClick={save} loading={saving} disabled={!canEdit}>
            <Save className="h-3.5 w-3.5" />
            Simpan pengaturan
          </Button>
        </div>
      </div>

      <aside className="flex flex-col gap-2.5">
        <section className="rounded-[10px] border border-line bg-canvas p-3.5">
          <h2 className="text-[12px] font-semibold text-ink">Pratinjau kop</h2>
          <div className="mt-2 rounded-[4px] border border-line bg-white p-3 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-[0.06em] text-neutral-800">
              {form.name || "NAMA INSTANSI"}
            </p>
            <p className="text-[8.5px] font-semibold uppercase tracking-[0.04em] text-neutral-800">
              {form.subtitle || "UNIT KERJA"}
            </p>
            <p className="mt-0.5 text-[7.5px] leading-relaxed text-neutral-600">
              {form.address || "Alamat instansi"}
              {form.city ? `, ${form.city}` : ""}
            </p>
            <p className="text-[7.5px] text-neutral-600">
              {[form.phone, form.email, form.website].filter(Boolean).join(" · ") || "Kontak instansi"}
            </p>
            <div className="mt-1.5 h-px bg-neutral-800" />
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-faint">
            Perubahan berlaku pada dokumen yang dirender setelah disimpan.
          </p>
        </section>
        {!canEdit ? (
          <p className="rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
            Hanya admin yang dapat mengubah identitas instansi.
          </p>
        ) : null}
      </aside>
    </div>
  );
}
