import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Blocks,
  Check,
  FileText,
  PenLine,
  Plus,
  Send,
  Table2,
  Workflow,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listTables } from "@/features/global-tables/server";
import { listComponents } from "@/features/components/server";
import { listTemplates } from "@/features/templates/server";
import { listAdministrasi } from "@/features/administrasi/server";
import { listSurat } from "@/features/surat/server";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatRelative, pluralize } from "@/lib/utils";

export const metadata: Metadata = { title: "Ringkasan" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [user, tables, components, templates, administrasi, letters] = await Promise.all([
    getCurrentUser(),
    Promise.resolve(listTables()),
    Promise.resolve(listComponents()),
    Promise.resolve(listTemplates()),
    Promise.resolve(listAdministrasi()),
    Promise.resolve(listSurat()),
  ]);

  const drafts = letters.filter((letter) => letter.status === "draft");
  const completed = letters.filter((letter) => letter.status === "completed");
  const recordCount = tables.reduce((total, table) => total + (table.recordCount ?? 0), 0);
  const recent = letters.slice(0, 6);

  const steps = [
    {
      label: "Siapkan Global Table",
      detail: "Data induk seperti pegawai atau kegiatan.",
      done: tables.length > 0,
      href: "/app/tables",
    },
    {
      label: "Susun component",
      detail: "Kop surat, tanda tangan, atau blok berulang.",
      done: components.length > 0,
      href: "/app/components",
    },
    {
      label: "Buat template",
      detail: "Desain dokumen dengan variabel dinamis.",
      done: templates.length > 0,
      href: "/app/templates",
    },
    {
      label: "Aktifkan administrasi",
      detail: "Gabungkan beberapa template menjadi alur.",
      done: administrasi.some((item) => item.status === "active"),
      href: "/app/administrasi",
    },
    {
      label: "Terbitkan surat pertama",
      detail: "Nomor otomatis, pratinjau langsung, ekspor DOCX.",
      done: letters.length > 0,
      href: "/app/surat",
    },
  ];
  const completedSteps = steps.filter((step) => step.done).length;
  const progress = Math.round((completedSteps / steps.length) * 100);

  const stats = [
    { label: "Template", value: templates.length, icon: FileText, href: "/app/templates" },
    { label: "Administrasi", value: administrasi.length, icon: Workflow, href: "/app/administrasi" },
    { label: "Surat", value: letters.length, icon: Send, href: "/app/surat" },
    { label: "Baris data", value: recordCount, icon: Table2, href: "/app/tables" },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-faint">
            {formatDate(new Date())}
          </p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-ink">
            Selamat datang, {user?.name.split(" ")[0] ?? "Rekan"}
          </h1>
          <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-muted">
            Susun data, template, dan alur administrasi sekali — terbitkan surat tanpa menyalin ulang.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href="/app/templates"
            className="inline-flex h-8 items-center gap-1.5 rounded-[5px] border border-line bg-canvas px-2.5 text-[12.5px] font-medium text-muted transition-colors hover:bg-warm hover:text-ink"
          >
            <PenLine className="h-3.5 w-3.5" />
            Template
          </Link>
          <Link
            href="/app/surat"
            className="inline-flex h-8 items-center gap-1.5 rounded-[5px] bg-brand px-2.5 text-[12.5px] font-medium text-white shadow-[var(--shadow-card)] transition-colors hover:bg-brand-strong"
          >
            <Plus className="h-3.5 w-3.5" />
            Buat surat
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="group rounded-[10px] border border-line bg-canvas p-3 transition-colors hover:border-line-strong hover:bg-warm/30"
            >
              <div className="flex items-center justify-between text-faint">
                <span className="text-[11px] font-medium uppercase tracking-[0.05em]">{stat.label}</span>
                <stat.icon className="h-3.5 w-3.5" strokeWidth={1.8} />
              </div>
              <p className="mt-1.5 text-[24px] font-semibold tracking-[-0.03em] text-ink">
                {stat.value.toLocaleString("id-ID")}
              </p>
              <p className="mt-0.5 text-[10.5px] text-faint">
                {stat.label === "Surat"
                  ? `${drafts.length} draft · ${completed.length} selesai`
                  : stat.label === "Administrasi"
                    ? `${administrasi.filter((item) => item.status === "active").length} aktif`
                    : stat.label === "Template"
                      ? "Siap dipakai"
                      : `${tables.length} tabel`}
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="overflow-hidden rounded-[10px] border border-line bg-canvas">
            <header className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
              <div>
                <h2 className="text-[13px] font-semibold text-ink">Surat terbaru</h2>
                <p className="text-[11px] text-faint">Aktivitas terakhir di ruang kerja.</p>
              </div>
              <Link
                href="/app/surat"
                className="inline-flex items-center gap-1 text-[11.5px] font-medium text-brand hover:underline"
              >
                Semua surat <ArrowRight className="h-3 w-3" />
              </Link>
            </header>

            {recent.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Send className="mx-auto h-5 w-5 text-faint" strokeWidth={1.6} />
                <p className="mt-2 text-[12.5px] font-medium text-ink">Belum ada surat</p>
                <p className="mt-0.5 text-[11.5px] text-muted">
                  Buat surat pertama dari alur administrasi yang sudah aktif.
                </p>
                <Link
                  href="/app/surat"
                  className="mt-3 inline-flex h-7 items-center gap-1 rounded-[4px] bg-brand px-2 text-[11.5px] font-medium text-white"
                >
                  <Plus className="h-3 w-3" /> Buat surat
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {recent.map((letter) => (
                  <li key={letter.id}>
                    <Link
                      href={`/app/surat/${letter.id}`}
                      className="group flex items-center gap-3 px-3.5 py-2 transition-colors hover:bg-warm/40"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border border-line bg-warm text-muted">
                        <FileText className="h-3.5 w-3.5" strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[12.5px] font-medium text-ink">
                            {letter.number || "Tanpa nomor"}
                          </span>
                          <Badge tone={letter.status === "completed" ? "green" : "amber"}>
                            {letter.status === "completed" ? "Selesai" : "Draft"}
                          </Badge>
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-faint">
                          {letter.administrasiName}
                          {letter.recordLabel ? ` · ${letter.recordLabel}` : ""}
                        </span>
                      </span>
                      <span className="hidden shrink-0 text-[10.5px] text-faint sm:block">
                        {formatRelative(letter.updatedAt)}
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex flex-col gap-3">
            <section className="rounded-[10px] border border-line bg-canvas">
              <header className="border-b border-line px-3.5 py-2.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-[13px] font-semibold text-ink">Persiapan ruang kerja</h2>
                  <span className="text-[11px] font-medium text-muted">
                    {completedSteps}/{steps.length}
                  </span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-warm">
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </header>
              <ul className="py-1">
                {steps.map((step) => (
                  <li key={step.label}>
                    <Link
                      href={step.href}
                      className="flex items-start gap-2 px-3.5 py-1.5 transition-colors hover:bg-warm/40"
                    >
                      <span
                        className={
                          step.done
                            ? "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-600 text-white"
                            : "mt-0.5 h-4 w-4 shrink-0 rounded-full border border-line bg-canvas"
                        }
                      >
                        {step.done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={
                            step.done
                              ? "block text-[11.5px] text-muted line-through decoration-line"
                              : "block text-[11.5px] font-medium text-ink"
                          }
                        >
                          {step.label}
                        </span>
                        <span className="mt-0.5 block text-[10.5px] leading-relaxed text-faint">
                          {step.detail}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-[10px] border border-line bg-warm/40 p-3.5">
              <h2 className="text-[12px] font-semibold text-ink">Pintasan</h2>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {[
                  { label: "Tabel", href: "/app/tables", icon: Table2 },
                  { label: "Component", href: "/app/components", icon: Blocks },
                  { label: "Template", href: "/app/templates", icon: FileText },
                  { label: "Administrasi", href: "/app/administrasi", icon: Workflow },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-1.5 rounded-[5px] border border-line bg-canvas px-2 py-1.5 text-[11.5px] font-medium text-muted transition-colors hover:text-ink"
                  >
                    <item.icon className="h-3 w-3" />
                    {item.label}
                  </Link>
                ))}
              </div>
              <p className="mt-2 text-[10.5px] leading-relaxed text-faint">
                {pluralize(templates.length, "template")} · {pluralize(administrasi.length, "alur")} ·{" "}
                {pluralize(letters.length, "surat")}
              </p>
            </section>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-line bg-canvas px-3.5 py-2.5">
          <div className="flex items-center gap-2 text-[11.5px] text-muted">
            <span className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-brand-soft text-brand">
              <Check className="h-3.5 w-3.5" />
            </span>
            Semua perubahan tersimpan otomatis di server.
          </div>
          {user?.role === "admin" ? (
            <Link href="/app/settings/data" className="text-[11.5px] font-medium text-brand hover:underline">
              Cadangkan data →
            </Link>
          ) : null}
        </div>

        {letters.length > 0 && drafts.length > 0 ? (
          <p className="mt-2 text-[10.5px] text-faint">
            {drafts.length} surat masih draft — buka dan selesaikan agar nomor final terkunci.
          </p>
        ) : null}
      </div>
    </div>
  );
}
