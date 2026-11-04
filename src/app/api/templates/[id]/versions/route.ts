import { jsonOk, readJson, requireAdmin, requireUser, withApi } from "@/lib/http";
import { listVersions, restoreVersion } from "@/features/templates/server";
import { templateVersionInputSchema } from "@/features/templates/schema";

export const GET = withApi(async (_request, context) => {
  await requireUser();
  const { id } = await context.params;
  return jsonOk({ versions: listVersions(id) });
});

export const POST = withApi(async (request, context) => {
  const user = await requireAdmin();
  const { id } = await context.params;
  const { version } = await readJson(request, templateVersionInputSchema);
  const template = restoreVersion(id, version, user.id);
  return jsonOk({ template, versions: listVersions(id) });
});
