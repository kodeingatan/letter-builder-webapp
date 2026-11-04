import { jsonOk, readJson, requireAdmin, withApi } from "@/lib/http";
import { deleteField, updateField } from "@/features/global-tables/server";
import { fieldUpdateSchema } from "@/features/global-tables/schema";

export const PATCH = withApi(async (request, context) => {
  await requireAdmin();
  const { fieldId } = await context.params;
  const input = await readJson(request, fieldUpdateSchema);
  return jsonOk({ field: updateField(fieldId, input) });
});

export const DELETE = withApi(async (_request, context) => {
  await requireAdmin();
  const { fieldId } = await context.params;
  const result = deleteField(fieldId);
  return jsonOk({ ok: true, ...result });
});
