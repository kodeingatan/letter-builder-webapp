import { ApiError, jsonOk, readJson, requireAdmin, requireUser, withApi } from "@/lib/http";
import {
  deleteTable,
  getTable,
  getTableDependencies,
  updateTable,
} from "@/features/global-tables/server";
import { tableInputSchema } from "@/features/global-tables/schema";

export const GET = withApi(async (_request, context) => {
  await requireUser();
  const { id } = await context.params;
  const result = getTable(id);
  if (!result) throw new ApiError(404, "Tabel tidak ditemukan.");
  return jsonOk({ ...result, dependencies: getTableDependencies(id) });
});

export const PATCH = withApi(async (request, context) => {
  await requireAdmin();
  const { id } = await context.params;
  const input = await readJson(request, tableInputSchema);
  return jsonOk({ table: updateTable(id, input) });
});

export const DELETE = withApi(async (_request, context) => {
  await requireAdmin();
  const { id } = await context.params;
  deleteTable(id);
  return jsonOk({ ok: true });
});
