import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  getAdministrasi,
  listAdministrasi,
} from "@/features/administrasi/server";
import { listTemplateOptions } from "@/features/templates/server";
import { tablesWithFields } from "@/features/global-tables/server";
import { AdministrasiWorkspace } from "@/features/administrasi/administrasi-workspace";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = getAdministrasi(id);
  return { title: result?.administrasi.name ?? "Administrasi" };
}

export default async function AdministrasiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, user] = await Promise.all([Promise.resolve(getAdministrasi(id)), getCurrentUser()]);
  if (!result) notFound();

  return (
    <AdministrasiWorkspace
      administrasi={result.administrasi}
      steps={result.steps}
      templates={listTemplateOptions()}
      tables={tablesWithFields()}
      list={listAdministrasi().map((item) => ({
        id: item.id,
        name: item.name,
        status: item.status,
        updatedAt: item.updatedAt,
        stepCount: item.stepCount ?? 0,
        letterCount: item.letterCount ?? 0,
      }))}
      canEdit={user?.role === "admin"}
    />
  );
}
