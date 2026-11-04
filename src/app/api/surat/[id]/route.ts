import { ApiError, jsonOk, readJson, requireAdmin, requireUser, withApi } from "@/lib/http";
import {
  deleteSurat,
  getSuratWorkspace,
  saveSurat,
} from "@/features/surat/server";
import { saveSuratSchema } from "@/features/surat/schema";

export const GET = withApi(async (_request, context) => {
  await requireUser();
  const { id } = await context.params;
  const workspace = getSuratWorkspace(id);
  if (!workspace) throw new ApiError(404, "Surat tidak ditemukan.");
  return jsonOk(workspace);
});

export const PATCH = withApi(async (request, context) => {
  const user = await requireUser();
  const { id } = await context.params;
  const input = await readJson(request, saveSuratSchema);
  return jsonOk({ surat: saveSurat(id, input, user.id) });
});

export const DELETE = withApi(async (_request, context) => {
  await requireAdmin();
  const { id } = await context.params;
  deleteSurat(id);
  return jsonOk({ ok: true });
});
