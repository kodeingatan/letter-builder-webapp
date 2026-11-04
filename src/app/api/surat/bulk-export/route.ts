import { z } from "zod";
import { ApiError, readJson, requireUser, withApi } from "@/lib/http";
import { getSuratWorkspace } from "@/features/surat/server";
import { suratBulkZip, suratToDocx } from "@/features/surat/docx";

const schema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1, "Pilih minimal satu surat.").max(50),
});

export const runtime = "nodejs";

function safeName(value: string): string {
  return value.replace(/[\\/:*?"<>|\s]+/g, "-").replace(/-+/g, "-").slice(0, 80) || "surat";
}

export const POST = withApi(async (request) => {
  await requireUser();
  const { ids } = await readJson(request, schema);

  const unique = Array.from(new Set(ids));
  const files: Array<{ filename: string; buffer: Buffer }> = [];

  for (const [index, id] of unique.entries()) {
    const workspace = getSuratWorkspace(id);
    if (!workspace) continue;
    const buffer = await suratToDocx(workspace);
    files.push({
      filename: `${String(index + 1).padStart(2, "0")}-${safeName(workspace.surat.number || "surat")}.docx`,
      buffer,
    });
  }

  if (files.length === 0) throw new ApiError(404, "Tidak ada surat yang dapat diekspor.");

  const zip = await suratBulkZip(files);
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="arsip-surat-${stamp}.zip"`,
      "Cache-Control": "no-store",
    },
  });
});
