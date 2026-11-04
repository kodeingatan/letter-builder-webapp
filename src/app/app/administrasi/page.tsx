import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Workflow } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listAdministrasi } from "@/features/administrasi/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { NewAdministrasiButton } from "@/features/administrasi/new-administrasi-button";
import { formatRelative } from "@/lib/utils";

export const metadata: Metadata = { title: "Administrasi" };
export const dynamic = "force-dynamic";

const STATUS_TONE = { active: "green", draft: "amber", archived: "neutral" } as const;
const STATUS_LABEL = { active: "Aktif", draft: "Draft", archived: "Arsip" } as const;

export default async function AdministrasiPage() {
  const [items, user] = await Promise.all([Promise.resolve(listAdministrasi()), getCurrentUser()]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Administrasi"
        description="Paket alur surat: beberapa step berurutan, masing-masing memakai satu template."
        actions={user?.role === "admin" ? <NewAdministrasiButton /> : null}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        {items.length === 0 ? (
          <EmptyState
            icon={Workflow}
            title="Belum ada administrasi"
            description="Susun alur seperti SPPD: surat perintah, laporan, lalu berita acara."
            action={user?.role === "admin" ? <NewAdministrasiButton /> : null}
          />
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/app/administrasi/${item.id}`}
                className="group rounded-[10px] border border-line bg-canvas p-4 transition-colors hover:border-line-strong hover:bg-warm/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <Badge tone={STATUS_TONE[item.status]} dot>
                    {STATUS_LABEL[item.status]}
                  </Badge>
                  <ArrowUpRight className="h-3.5 w-3.5 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <h2 className="mt-2.5 text-[13.5px] font-semibold text-ink">{item.name}</h2>
                <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted">
                  {item.description || "Tanpa deskripsi."}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10.5px] text-faint">
                  <Badge tone="neutral">{item.stepCount ?? 0} step</Badge>
                  <Badge tone="blue">{item.letterCount ?? 0} surat</Badge>
                  <span className="ml-auto">{formatRelative(item.updatedAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
