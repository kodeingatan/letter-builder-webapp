import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getComponent, listComponents } from "@/features/components/server";
import { tablesWithFields } from "@/features/global-tables/server";
import { listAllLetterFields } from "@/features/administrasi/fields";
import { ComponentWorkspace } from "@/features/components/component-workspace";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: getComponent(id)?.name ?? "Component" };
}

export default async function ComponentEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const component = getComponent(id);
  if (!component) notFound();
  const user = await getCurrentUser();

  const summary = listComponents().find((item) => item.id === component.id);

  return (
    <ComponentWorkspace
      component={component}
      usageCount={summary?.usageCount ?? 0}
      components={listComponents().map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        updatedAt: item.updatedAt,
        usageCount: item.usageCount,
      }))}
      tables={tablesWithFields()}
      letterFields={listAllLetterFields().map((field) => ({
        key: field.key,
        label: field.label,
        type: field.type,
      }))}
      canEdit={user?.role === "admin"}
    />
  );
}
