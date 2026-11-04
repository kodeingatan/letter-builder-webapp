import { ApiError, jsonOk, requireUser, withApi } from "@/lib/http";
import { getAdministrasiSource } from "@/features/surat/source";

export const GET = withApi(async (_request, context) => {
  await requireUser();
  const { id } = await context.params;
  const source = getAdministrasiSource(id);
  if (!source) throw new ApiError(404, "Administrasi tidak ditemukan.");
  return jsonOk(source);
});
