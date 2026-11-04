import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTable, listTables } from "@/features/global-tables/server";
import { TableWorkspace } from "@/features/global-tables/table-workspace";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = getTable(id);
  return { title: result?.table.name ?? "Tabel" };
}

export default async function TableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, user] = await Promise.all([Promise.resolve(getTable(id)), getCurrentUser()]);
  if (!result) notFound();

  return (
    <TableWorkspace
      table={result.table}
      fields={result.fields}
      records={result.records}
      tables={listTables()}
      canEdit={user?.role === "admin"}
    />
  );
}
