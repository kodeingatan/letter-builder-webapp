import { jsonOk, readJson, requireAdmin, requireUser, withApi } from "@/lib/http";
import { getSettings, saveSettings } from "@/features/settings/server";
import { organizationSchema } from "@/features/settings/schema";

export const GET = withApi(async () => {
  await requireUser();
  return jsonOk({ settings: getSettings() });
});

export const PATCH = withApi(async (request) => {
  await requireAdmin();
  const input = await readJson(request, organizationSchema);
  return jsonOk({ settings: saveSettings(input) });
});
