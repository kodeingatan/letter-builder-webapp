import { jsonOk, readJson, requireAdmin, requireUser, withApi } from "@/lib/http";
import { createTable, listTables } from "@/features/global-tables/server";
import { tableInputSchema } from "@/features/global-tables/schema";

export const GET = withApi(async () => {
  await requireUser();
  return jsonOk({ tables: listTables() });
});

export const POST = withApi(async (request) => {
  await requireAdmin();
  const input = await readJson(request, tableInputSchema);
  return jsonOk({ table: createTable(input) }, { status: 201 });
});
