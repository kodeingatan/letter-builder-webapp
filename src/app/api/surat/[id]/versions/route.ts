import { jsonOk, readJson, requireAdmin, requireUser, withApi } from "@/lib/http";
import { listSuratVersions, restoreSuratVersion } from "@/features/surat/server";
import { restoreSuratVersionSchema } from "@/features/surat/schema";

export const GET = withApi(async (_request, context) => {
  await requireUser();
  const { id } = await context.params;
  return jsonOk({ versions: listSuratVersions(id) });
});

export const POST = withApi(async (request, context) => {
  await requireAdmin();
  const { id } = await context.params;
  const { version } = await readJson(request, restoreSuratVersionSchema);
  return jsonOk({ surat: restoreSuratVersion(id, version) });
});
