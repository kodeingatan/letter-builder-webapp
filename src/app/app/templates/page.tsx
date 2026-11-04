import type { Metadata } from "next";
import Link from "next/link";
import { FileText, FilePlus2 } from "lucide-react";
import { listTemplates } from "@/features/templates/server";
import { PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { formatRelative } from "@/lib/utils";
import { NewTemplateButton } from "@/features/templates/new-template-button";

export const metadata: Metadata = { title: "Templates" };
export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = listTemplates();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Templates"
        description="Dokumen lengkap yang menyusun teks, variabel, dan component. Dipakai oleh step administrasi."
        actions={<NewTemplateButton />}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        {templates.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Belum ada template"
            description="Buat template pertama, lalu susun kop surat, isi, dan blok tanda tangan."
            action={<NewTemplateButton />}
          />
        ) : (
          <div className="grid gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <Link
                key={template.id}
                href={`/app/templates/${template.id}`}
                className="group flex flex-col gap-3 bg-canvas p-4 transition-colors hover:bg-warm/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-line bg-warm text-muted">
                    <FileText className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  {(template.usageCount ?? 0) > 0 ? (
                    <Badge tone="blue">{template.usageCount} step</Badge>
                  ) : (
                    <Badge tone="neutral">Belum dipakai</Badge>
                  )}
                </div>
                <div>
                  <h2 className="text-[13.5px] font-semibold text-ink">{template.name}</h2>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted">
                    {template.description || "Tanpa deskripsi."}
                  </p>
                </div>
                <p className="mt-auto text-[10.5px] text-faint">
                  Diperbarui {formatRelative(template.updatedAt)} · {template.page.paper}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
