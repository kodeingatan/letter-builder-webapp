import { ApiError, jsonOk, readJson, requireAdmin, requireUser, withApi } from "@/lib/http";
import {
  deleteTemplate,
  getTemplate,
  listVersions,
  updateTemplate,
} from "@/features/templates/server";
import { templateInputSchema } from "@/features/templates/schema";

export const GET = withApi(async (_request, context) => {
  await requireUser();
  const { id } = await context.params;
  const template = getTemplate(id);
  if (!template) throw new ApiError(404, "Template tidak ditemukan.");
  return jsonOk({ template, versions: listVersions(id) });
});

export const PATCH = withApi(async (request, context) => {
  const user = await requireAdmin();
  const { id } = await context.params;
  const input = await readJson(request, templateInputSchema);
  return jsonOk({ template: updateTemplate(id, input, user.id) });
});

export const DELETE = withApi(async (_request, context) => {
  await requireAdmin();
  const { id } = await context.params;
  deleteTemplate(id);
  return jsonOk({ ok: true });
});
