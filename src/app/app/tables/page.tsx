import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Table2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listTables } from "@/features/global-tables/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { NewTableButton } from "@/features/global-tables/new-table-button";
import { formatRelative } from "@/lib/utils";

export const metadata: Metadata = { title: "Global Tables" };
export const dynamic = "force-dynamic";

export default async function TablesPage() {
  const [tables, user] = await Promise.all([Promise.resolve(listTables()), getCurrentUser()]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Global Tables"
        description="Sumber data dinamis. Setiap field menjadi variabel yang dapat disisipkan ke template."
        actions={user?.role === "admin" ? <NewTableButton /> : null}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        {tables.length === 0 ? (
          <EmptyState
            icon={Table2}
            title="Belum ada tabel data"
            description="Mulai dengan tabel data induk seperti Pegawai atau Kegiatan."
            action={user?.role === "admin" ? <NewTableButton /> : null}
          />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {tables.map((table) => (
              <Link
                key={table.id}
                href={`/app/tables/${table.id}`}
                className="group rounded-[10px] border border-line bg-canvas p-3.5 transition-colors hover:border-line-strong hover:bg-warm/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-line bg-warm text-muted">
                    <Table2 className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <h2 className="mt-2.5 text-[13.5px] font-semibold text-ink">{table.name}</h2>
                <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted">
                  {table.description || "Tanpa deskripsi."}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Badge tone="neutral">{table.fieldCount ?? 0} field</Badge>
                  <Badge tone="blue">{table.recordCount ?? 0} baris</Badge>
                  <span className="ml-auto text-[10px] text-faint">
                    {formatRelative(table.updatedAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-6 rounded-[10px] border border-line bg-warm/50 p-3.5">
          <p className="text-[11.5px] font-medium text-ink">Cara kerja singkat</p>
          <p className="mt-1 max-w-3xl text-[11.5px] leading-relaxed text-muted">
            Field tabel dipakai sebagai variabel <code className="rounded bg-canvas px-1">{"{{pegawai.nama}}"}</code>{" "}
            atau <code className="rounded bg-canvas px-1">{"{{nama}}"}</code> di dalam loop. Nama field sebaiknya
            tidak diubah setelah template memakainya, kecuali ekspresi ikut diperbarui.
          </p>
        </div>
      </div>
    </div>
  );
}
