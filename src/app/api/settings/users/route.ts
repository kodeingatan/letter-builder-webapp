import { jsonOk, readJson, requireAdmin, withApi } from "@/lib/http";
import { createUser, listUsers } from "@/features/settings/server";
import { createUserSchema } from "@/features/settings/schema";

export const GET = withApi(async () => {
  await requireAdmin();
  return jsonOk({ users: listUsers() });
});

export const POST = withApi(async (request) => {
  await requireAdmin();
  const input = await readJson(request, createUserSchema);
  return jsonOk({ user: createUser(input) }, { status: 201 });
});
