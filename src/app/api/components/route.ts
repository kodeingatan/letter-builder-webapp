import { jsonOk, readJson, requireAdmin, requireUser, withApi } from "@/lib/http";
import { createComponent, listComponents } from "@/features/components/server";
import { componentInputSchema } from "@/features/components/schema";

export const GET = withApi(async () => {
  await requireUser();
  return jsonOk({ components: listComponents() });
});

export const POST = withApi(async (request) => {
  const user = await requireAdmin();
  const input = await readJson(request, componentInputSchema);
  return jsonOk({ component: createComponent({ ...input, tableId: input.tableId }) }, { status: 201 });
});
