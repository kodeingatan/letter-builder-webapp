import { jsonOk, readJson, requireAdmin, withApi } from "@/lib/http";
import { createField } from "@/features/global-tables/server";
import { fieldInputSchema } from "@/features/global-tables/schema";

export const POST = withApi(async (request, context) => {
  await requireAdmin();
  const { id } = await context.params;
  const input = await readJson(request, fieldInputSchema);
  return jsonOk({ field: createField(id, input) }, { status: 201 });
});
