import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSuratWorkspace } from "@/features/surat/server";
import { renderDocument } from "@/lib/documents/engine";
import { DocumentView } from "@/components/document/document-view";
import { PrintToolbar } from "@/features/surat/print-toolbar";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const workspace = getSuratWorkspace(id);
  return {
    title: workspace?.surat.number ? `${workspace.surat.number} — Cetak` : "Cetak surat",
    robots: { index: false, follow: false },
  };
}

export default async function PrintSuratPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const workspace = getSuratWorkspace(id);
  if (!workspace) notFound();

  const components = new Map(workspace.components.map((component) => [component.id, component]));

  return (
    <div className="min-h-screen">
      <PrintToolbar
        title={workspace.surat.number || "Surat tanpa nomor"}
        subtitle={`${workspace.administrasi.name} · ${workspace.recordLabel || "tanpa baris data"}`}
        backHref={`/app/surat/${workspace.surat.id}`}
      />
      <div className="mx-auto flex w-full max-w-[900px] flex-col items-center gap-6 px-2 py-6 print:gap-0 print:p-0">
        {workspace.steps.map((step) => {
          const blocks = renderDocument({
            content: step.overrideContent ?? step.content,
            context: workspace.context,
            components,
            primarySourceId: workspace.source.tableId ?? undefined,
          });
          return (
            <div key={step.id} className="print-break w-full">
              <DocumentView blocks={blocks} page={step.page} chrome={false} className="mx-auto" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
