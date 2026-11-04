import { jsonOk, readJson, requireAdmin, requireUser, withApi } from "@/lib/http";
import { createAdministrasi, listAdministrasi } from "@/features/administrasi/server";
import { administrasiInputSchema } from "@/features/administrasi/schema";

export const GET = withApi(async () => {
  await requireUser();
  return jsonOk({ administrasi: listAdministrasi() });
});

export const POST = withApi(async (request) => {
  await requireAdmin();
  const input = await readJson(request, administrasiInputSchema);
  return jsonOk({ ...createAdministrasi(input) }, { status: 201 });
});
