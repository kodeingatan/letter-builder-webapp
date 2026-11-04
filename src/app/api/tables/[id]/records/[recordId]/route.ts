import { jsonOk, readJson, requireAdmin, withApi } from "@/lib/http";
import { deleteRecord, updateRecord } from "@/features/global-tables/server";
import { recordInputSchema } from "@/features/global-tables/schema";

export const PATCH = withApi(async (request, context) => {
  await requireAdmin();
  const { recordId } = await context.params;
  const input = await readJson(request, recordInputSchema);
  return jsonOk({ record: updateRecord(recordId, input) });
});

export const DELETE = withApi(async (_request, context) => {
  await requireAdmin();
  const { recordId } = await context.params;
  deleteRecord(recordId);
  return jsonOk({ ok: true });
});
