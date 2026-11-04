import { jsonOk, requireAdmin, withApi } from "@/lib/http";
import { deleteUser } from "@/features/settings/server";

export const DELETE = withApi(async (_request, context) => {
  const actor = await requireAdmin();
  const { id } = await context.params;
  deleteUser(id, actor.id);
  return jsonOk({ ok: true });
});
