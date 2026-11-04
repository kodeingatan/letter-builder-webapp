import { jsonOk, readJson, requireUser, withApi } from "@/lib/http";
import { changePassword } from "@/features/settings/server";
import { changePasswordSchema } from "@/features/settings/schema";

export const POST = withApi(async (request) => {
  const user = await requireUser();
  const input = await readJson(request, changePasswordSchema);
  changePassword(user.id, input.currentPassword, input.newPassword);
  return jsonOk({ ok: true });
});
