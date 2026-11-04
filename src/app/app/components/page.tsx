import type { Metadata } from "next";
import Link from "next/link";
import { Blocks } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listComponents } from "@/features/components/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/utils";
import { NewComponentButton } from "@/features/components/new-component-button";

export const metadata: Metadata = { title: "Components" };
export const dynamic = "force-dynamic";

const CATEGORY_TONE: Record<string, "blue" | "green" | "amber" | "neutral"> = {
  "Kop & Identitas": "blue",
  Pengesahan: "amber",
  Tabel: "green",
};

export default async function ComponentsPage() {
  const [components, user] = await Promise.all([
    Promise.resolve(listComponents()),
    getCurrentUser(),
  ]);
  const canEdit = user?.role === "admin";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Components"
        description="Blok dokumen reusable — kop surat, tanda tangan, atau tabel dinamis. Perubahan berlaku sebagai referensi."
        actions={canEdit ? <NewComponentButton /> : null}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        {components.length === 0 ? (
          <EmptyState
            icon={Blocks}
            title="Belum ada component"
            description="Component memungkinkan satu blok dipakai di banyak template tanpa duplikasi."
            action={canEdit ? <NewComponentButton /> : null}
          />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {components.map((component) => (
              <Link
                key={component.id}
                href={`/app/components/${component.id}`}
                className="group flex flex-col rounded-[10px] border border-line bg-canvas p-3.5 transition-colors hover:border-line-strong hover:bg-warm/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <Badge tone={CATEGORY_TONE[component.category] ?? "neutral"}>
                    {component.category}
                  </Badge>
                  <span className="text-[10.5px] text-faint">
                    {component.usageCount} template
                  </span>
                </div>
                <h2 className="mt-2.5 text-[13px] font-semibold text-ink">{component.name}</h2>
                <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted">
                  {component.description || "Tanpa deskripsi."}
                </p>
                <p className="mt-3 text-[10.5px] text-faint">
                  Diperbarui {formatRelative(component.updatedAt)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
