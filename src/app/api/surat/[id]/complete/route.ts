import { jsonOk, requireUser, withApi } from "@/lib/http";
import { completeSurat } from "@/features/surat/server";

export const POST = withApi(async (_request, context) => {
  const user = await requireUser();
  const { id } = await context.params;
  return jsonOk({ surat: completeSurat(id, user.id) });
});
