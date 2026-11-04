import { jsonOk, readJson, requireAdmin, requireUser, withApi } from "@/lib/http";
import { createTemplate, listTemplates } from "@/features/templates/server";
import { templateInputSchema } from "@/features/templates/schema";

export const GET = withApi(async () => {
  await requireUser();
  return jsonOk({ templates: listTemplates() });
});

export const POST = withApi(async (request) => {
  const user = await requireAdmin();
  const input = await readJson(request, templateInputSchema);
  return jsonOk({ template: createTemplate(input, user.id) }, { status: 201 });
});
