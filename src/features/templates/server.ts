import "server-only";
import type { z } from "zod";
import { ApiError } from "@/lib/http";
import { createId, getDb, nowIso } from "@/lib/db";
import {
  mapTemplate,
  type TemplateRecord,
  type TemplateVersion,
} from "@/lib/entities";
import type { DocumentContent, PageConfig } from "@/lib/documents/types";
import { DEFAULT_PAGE } from "@/lib/documents/types";
import { validateDocument, validatePage } from "@/lib/documents/validate";
import { parseJson } from "@/lib/db";
import type { templateInputSchema } from "./schema";

type TemplateInput = z.infer<typeof templateInputSchema>;

export function listTemplates(): TemplateRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT t.*,
        (SELECT COUNT(*) FROM administrasi_steps s WHERE s.template_id = t.id) AS usage_count
       FROM templates t
       ORDER BY t.updated_at DESC`,
    )
    .all() as Array<Record<string, unknown>>;
  return rows.map(mapTemplate);
}

export function getTemplate(templateId: string): TemplateRecord | null {
  const row = getDb().prepare("SELECT * FROM templates WHERE id = ?").get(templateId);
  return row ? mapTemplate(row as Record<string, unknown>) : null;
}

export function listTemplateOptions(): Array<{ id: string; name: string }> {
  return getDb()
    .prepare("SELECT id, name FROM templates ORDER BY name COLLATE NOCASE")
    .all() as Array<{ id: string; name: string }>;
}

function nextVersion(templateId: string): number {
  const row = getDb()
    .prepare("SELECT COALESCE(MAX(version), 0) + 1 AS next FROM template_versions WHERE template_id = ?")
    .get(templateId) as { next: number };
  return row.next;
}

function recordVersion(
  templateId: string,
  name: string,
  content: DocumentContent,
  page: PageConfig,
  userId: string | null,
): void {
  getDb()
    .prepare(
      `INSERT INTO template_versions (id, template_id, version, name, content, page, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      createId("tv"),
      templateId,
      nextVersion(templateId),
      name,
      JSON.stringify(content),
      JSON.stringify(page),
      userId,
      nowIso(),
    );
}

export function createTemplate(
  input: TemplateInput,
  userId: string | null,
): TemplateRecord {
  const id = createId("tpl");
  const now = nowIso();
  const content = validateDocument(input.content);
  const page = validatePage(input.page ?? DEFAULT_PAGE);

  getDb()
    .prepare(
      "INSERT INTO templates (id, name, description, content, page, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(id, input.name, input.description, JSON.stringify(content), JSON.stringify(page), now, now);

  recordVersion(id, input.name, content, page, userId);
  return getTemplate(id)!;
}

export function updateTemplate(
  templateId: string,
  input: TemplateInput,
  userId: string | null,
): TemplateRecord {
  const existing = getTemplate(templateId);
  if (!existing) throw new ApiError(404, "Template tidak ditemukan.");

  const content = validateDocument(input.content);
  const page = validatePage(input.page ?? existing.page);

  getDb()
    .prepare(
      "UPDATE templates SET name = ?, description = ?, content = ?, page = ?, updated_at = ? WHERE id = ?",
    )
    .run(input.name, input.description, JSON.stringify(content), JSON.stringify(page), nowIso(), templateId);

  if (input.createVersion !== false) {
    recordVersion(templateId, input.name, content, page, userId);
  }

  return getTemplate(templateId)!;
}

export function duplicateTemplate(templateId: string): TemplateRecord {
  const existing = getTemplate(templateId);
  if (!existing) throw new ApiError(404, "Template tidak ditemukan.");

  const id = createId("tpl");
  const name = `${existing.name} (salinan)`;
  const now = nowIso();
  getDb()
    .prepare(
      "INSERT INTO templates (id, name, description, content, page, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      id,
      name,
      existing.description,
      JSON.stringify(existing.content),
      JSON.stringify(existing.page),
      now,
      now,
    );
  recordVersion(id, name, existing.content, existing.page, null);
  return getTemplate(id)!;
}

export function deleteTemplate(templateId: string): void {
  const db = getDb();
  const steps = db
    .prepare(
      `SELECT a.name AS administrasi FROM administrasi_steps s
       JOIN administrasi a ON a.id = s.administrasi_id
       WHERE s.template_id = ?`,
    )
    .all(templateId) as Array<{ administrasi: string }>;

  if (steps.length > 0) {
    throw new ApiError(
      409,
      "Template masih dipakai pada administrasi berikut.",
      steps.map((step) => ({ name: step.administrasi })),
    );
  }
  db.prepare("DELETE FROM templates WHERE id = ?").run(templateId);
}

export function listVersions(templateId: string): TemplateVersion[] {
  const rows = getDb()
    .prepare(
      `SELECT v.*, u.name AS created_by_name
       FROM template_versions v
       LEFT JOIN users u ON u.id = v.created_by
       WHERE v.template_id = ?
       ORDER BY v.version DESC`,
    )
    .all(templateId) as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    id: String(row.id),
    templateId: String(row.template_id),
    version: Number(row.version),
    name: String(row.name),
    content: parseJson<DocumentContent>(row.content as string, { version: 1, blocks: [] }),
    page: parseJson<PageConfig>(row.page as string, DEFAULT_PAGE),
    createdByName: row.created_by_name ? String(row.created_by_name) : null,
    createdAt: String(row.created_at),
  }));
}

export function restoreVersion(
  templateId: string,
  version: number,
  userId: string | null,
): TemplateRecord {
  const target = listVersions(templateId).find((item) => item.version === version);
  if (!target) throw new ApiError(404, "Versi tidak ditemukan.");

  return updateTemplate(
    templateId,
    {
      name: target.name,
      description: target.name,
      content: target.content,
      page: target.page,
      createVersion: false,
    },
    userId,
  );
}

export function getTemplateUsage(templateId: string): Array<{ administrasi: string }> {
  return getDb()
    .prepare(
      `SELECT a.name AS administrasi FROM administrasi_steps s
       JOIN administrasi a ON a.id = s.administrasi_id
       WHERE s.template_id = ?`,
    )
    .all(templateId) as Array<{ administrasi: string }>;
}
