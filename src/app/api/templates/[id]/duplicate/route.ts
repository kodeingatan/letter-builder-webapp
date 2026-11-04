import { jsonOk, requireAdmin, withApi } from "@/lib/http";
import { duplicateTemplate } from "@/features/templates/server";

export const POST = withApi(async (_request, context) => {
  await requireAdmin();
  const { id } = await context.params;
  return jsonOk({ template: duplicateTemplate(id) }, { status: 201 });
});
