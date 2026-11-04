import { jsonOk, readJson, requireAdmin, withApi } from "@/lib/http";
import { createRecord } from "@/features/global-tables/server";
import { recordInputSchema } from "@/features/global-tables/schema";

export const POST = withApi(async (request, context) => {
  await requireAdmin();
  const { id } = await context.params;
  const input = await readJson(request, recordInputSchema);
  return jsonOk({ record: createRecord(id, input) }, { status: 201 });
});
