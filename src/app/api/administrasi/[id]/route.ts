import { ApiError, jsonOk, readJson, requireAdmin, requireUser, withApi } from "@/lib/http";
import {
  deleteAdministrasi,
  duplicateAdministrasi,
  getAdministrasi,
  updateAdministrasi,
} from "@/features/administrasi/server";
import { administrasiInputSchema } from "@/features/administrasi/schema";

export const GET = withApi(async (_request, context) => {
  await requireUser();
  const { id } = await context.params;
  const result = getAdministrasi(id);
  if (!result) throw new ApiError(404, "Administrasi tidak ditemukan.");
  return jsonOk(result);
});

export const PATCH = withApi(async (request, context) => {
  await requireAdmin();
  const { id } = await context.params;
  const input = await readJson(request, administrasiInputSchema);
  return jsonOk(updateAdministrasi(id, input));
});

export const DELETE = withApi(async (_request, context) => {
  await requireAdmin();
  const { id } = await context.params;
  deleteAdministrasi(id);
  return jsonOk({ ok: true });
});

export const POST = withApi(async (_request, context) => {
  await requireAdmin();
  const { id } = await context.params;
  return jsonOk({ ...duplicateAdministrasi(id) }, { status: 201 });
});
