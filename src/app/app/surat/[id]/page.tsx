import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSuratWorkspace, listSuratVersions } from "@/features/surat/server";
import { tablesWithFields } from "@/features/global-tables/server";
import { SuratWizard } from "@/features/surat/surat-wizard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const workspace = getSuratWorkspace(id);
  return { title: workspace?.surat.number || "Surat" };
}

export default async function SuratDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [workspace, user] = await Promise.all([Promise.resolve(getSuratWorkspace(id)), getCurrentUser()]);
  if (!workspace) notFound();

  return (
    <SuratWizard
      workspace={workspace}
      versions={listSuratVersions(id)}
      canAdmin={user?.role === "admin"}
      tables={tablesWithFields().map((table) => ({
        id: table.id,
        name: table.name,
        slug: table.slug,
        fields: table.fields.map((field) => ({
          name: field.name,
          label: field.label,
          type: field.type,
        })),
      }))}
      letterFields={workspace.administrasi.fields.map((field) => ({
        key: field.key,
        label: field.label,
        type: field.type,
      }))}
    />
  );
}
