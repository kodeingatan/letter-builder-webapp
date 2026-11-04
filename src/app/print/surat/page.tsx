import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSuratWorkspace } from "@/features/surat/server";
import { renderDocument } from "@/lib/documents/engine";
import { DocumentView } from "@/components/document/document-view";
import { PrintToolbar } from "@/features/surat/print-toolbar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cetak surat terpilih",
  robots: { index: false, follow: false },
};

export default async function BulkPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { ids } = await searchParams;
  const requested = (ids ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 30);

  if (requested.length === 0) redirect("/app/surat");

  const workspaces = requested
    .map((id) => getSuratWorkspace(id))
    .filter((workspace): workspace is NonNullable<typeof workspace> => Boolean(workspace));

  if (workspaces.length === 0) redirect("/app/surat");

  return (
    <div className="min-h-screen">
      <PrintToolbar
        title={`${workspaces.length} surat terpilih`}
        subtitle="Gunakan dialog cetak untuk menyimpan semua halaman sebagai satu PDF."
        backHref="/app/surat"
      />
      <div className="mx-auto flex w-full max-w-[900px] flex-col items-center gap-6 px-2 py-6 print:gap-0 print:p-0">
        {workspaces.map((workspace) => {
          const components = new Map(
            workspace.components.map((component) => [component.id, component]),
          );
          return (
            <div key={workspace.surat.id} className="print-break w-full">
              {workspace.steps.map((step) => {
                const blocks = renderDocument({
                  content: step.overrideContent ?? step.content,
                  context: workspace.context,
                  components,
                  primarySourceId: workspace.source.tableId ?? undefined,
                });
                return (
                  <DocumentView
                    key={step.id}
                    blocks={blocks}
                    page={step.page}
                    chrome={false}
                    className="mx-auto"
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
