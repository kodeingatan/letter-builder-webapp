import { endSession } from "@/lib/auth";
import { jsonOk, withApi } from "@/lib/http";

export const POST = withApi(async () => {
  await endSession();
  return jsonOk({ ok: true });
});
