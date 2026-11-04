import { ApiError, jsonOk, readJson, requireAdmin, requireUser, withApi } from "@/lib/http";
import {
  deleteComponent,
  getComponent,
  updateComponent,
} from "@/features/components/server";
import { componentInputSchema } from "@/features/components/schema";

export const GET = withApi(async (_request, context) => {
  await requireUser();
  const { id } = await context.params;
  const component = getComponent(id);
  if (!component) throw new ApiError(404, "Component tidak ditemukan.");
  return jsonOk({ component });
});

export const PATCH = withApi(async (request, context) => {
  await requireAdmin();
  const { id } = await context.params;
  const input = await readJson(request, componentInputSchema);
  return jsonOk({ component: updateComponent(id, { ...input, tableId: input.tableId }) });
});

export const DELETE = withApi(async (_request, context) => {
  await requireAdmin();
  const { id } = await context.params;
  deleteComponent(id);
  return jsonOk({ ok: true });
});
