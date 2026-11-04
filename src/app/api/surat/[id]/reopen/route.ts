import { jsonOk, requireAdmin, withApi } from "@/lib/http";
import { reopenSurat } from "@/features/surat/server";

export const POST = withApi(async (_request, context) => {
  await requireAdmin();
  const { id } = await context.params;
  return jsonOk({ surat: reopenSurat(id) });
});
