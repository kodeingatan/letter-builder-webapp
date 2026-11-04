import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTemplate, listTemplates } from "@/features/templates/server";
import { listComponents } from "@/features/components/server";
import { tablesWithFields } from "@/features/global-tables/server";
import { listAllLetterFields } from "@/features/administrasi/fields";
import { TemplateWorkspace } from "@/features/templates/template-workspace";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const template = getTemplate(id);
  return { title: template?.name ?? "Template" };
}

export default async function TemplateEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [template, user] = await Promise.all([Promise.resolve(getTemplate(id)), getCurrentUser()]);
  if (!template) notFound();

  const templates = listTemplates().map((item) => ({
    id: item.id,
    name: item.name,
    updatedAt: item.updatedAt,
    usageCount: item.usageCount ?? 0,
  }));

  return (
    <TemplateWorkspace
      template={template}
      templates={templates}
      components={listComponents().map((component) => ({
        id: component.id,
        name: component.name,
        category: component.category,
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
