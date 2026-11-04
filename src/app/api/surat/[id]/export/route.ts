import { ApiError, requireUser } from "@/lib/http";
import { getSuratWorkspace } from "@/features/surat/server";
import { suratToDocx } from "@/features/surat/docx";

export const runtime = "nodejs";

function safeName(value: string): string {
  return value.replace(/[\\/:*?"<>|\s]+/g, "-").replace(/-+/g, "-").slice(0, 80) || "surat";
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await context.params;
    const workspace = getSuratWorkspace(id);
    if (!workspace) throw new ApiError(404, "Surat tidak ditemukan.");

    const url = new URL(request.url);
    if (url.searchParams.get("format") !== "docx") {
      throw new ApiError(422, "Format tidak didukung. Gunakan format=docx.");
    }

    const buffer = await suratToDocx(workspace);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeName(workspace.surat.number || "surat")}.docx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return Response.json(
      { error: error instanceof Error ? error.message : "Gagal mengekspor DOCX." },
      { status },
    );
  }
}
