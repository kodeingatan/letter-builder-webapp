import { jsonOk, readJson, requireUser, withApi } from "@/lib/http";
import { createSuratBatch, listSurat } from "@/features/surat/server";
import { createSuratSchema } from "@/features/surat/schema";

export const GET = withApi(async () => {
  await requireUser();
  return jsonOk({ surat: listSurat() });
});

export const POST = withApi(async (request) => {
  const user = await requireUser();
  const input = await readJson(request, createSuratSchema);
  return jsonOk(createSuratBatch(input, user.id), { status: 201 });
});
