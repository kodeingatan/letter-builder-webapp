import "server-only";
import type { z } from "zod";
import { ApiError } from "@/lib/http";
import { createId, getDb, nowIso, parseJson } from "@/lib/db";
import { mapComponent, type ComponentRecord } from "@/lib/entities";
import { validateDocument } from "@/lib/documents/validate";
import { blocksToText } from "@/lib/documents/blocks";
import type { componentInputSchema } from "./schema";

type ComponentInput = z.infer<typeof componentInputSchema>;

export interface ComponentListItem extends ComponentRecord {
  usageCount: number;
}

export function listComponents(): ComponentListItem[] {
  const rows = getDb()
    .prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM templates t WHERE t.content LIKE '%' || c.id || '%') AS usage_count
       FROM components c
       ORDER BY c.category COLLATE NOCASE, c.name COLLATE NOCASE`,
    )
    .all() as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    ...mapComponent(row),
    usageCount: Number(row.usage_count ?? 0),
  }));
}

export function getComponent(componentId: string): ComponentRecord | null {
  const row = getDb().prepare("SELECT * FROM components WHERE id = ?").get(componentId);
  return row ? mapComponent(row as Record<string, unknown>) : null;
}

export function getComponentMap(ids: string[]): Map<string, ComponentRecord> {
  if (ids.length === 0) return new Map();
  const placeholders = ids.map(() => "?").join(",");
  const rows = getDb()
    .prepare(`SELECT * FROM components WHERE id IN (${placeholders})`)
    .all(...ids) as Array<Record<string, unknown>>;
  return new Map(rows.map((row) => [String(row.id), mapComponent(row)]));
}

export function getAllComponents(): ComponentRecord[] {
  return (getDb().prepare("SELECT * FROM components ORDER BY name").all() as Array<
    Record<string, unknown>
  >).map(mapComponent);
}

export function createComponent(input: ComponentInput): ComponentRecord {
  const id = createId("cmp");
  const now = nowIso();
  const content = validateDocument(input.content);
  const db = getDb();

  db.prepare(
    `INSERT INTO components (id, name, category, description, content, table_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.name,
    input.category,
    input.description,
    JSON.stringify(content),
    input.tableId,
    now,
    now,
  );

  return getComponent(id)!;
}

export function updateComponent(componentId: string, input: ComponentInput): ComponentRecord {
  const existing = getComponent(componentId);
  if (!existing) throw new ApiError(404, "Component tidak ditemukan.");

  const content = validateDocument(input.content);
  getDb()
    .prepare(
      `UPDATE components SET name = ?, category = ?, description = ?, content = ?, table_id = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      input.name,
      input.category,
      input.description,
      JSON.stringify(content),
      input.tableId,
      nowIso(),
      componentId,
    );

  return getComponent(componentId)!;
}

export function deleteComponent(componentId: string): void {
  const db = getDb();
  const usedBy = db
    .prepare("SELECT id, name FROM templates WHERE content LIKE ?")
    .all(`%${componentId}%`) as Array<{ id: string; name: string }>;

  if (usedBy.length > 0) {
    throw new ApiError(409, "Component masih dipakai template berikut.", usedBy);
  }
  db.prepare("DELETE FROM components WHERE id = ?").run(componentId);
}

export function duplicateComponent(componentId: string, userId: string): ComponentRecord {
  const existing = getComponent(componentId);
  if (!existing) throw new ApiError(404, "Component tidak ditemukan.");
  void userId;
  return createComponent({
    name: `${existing.name} (salinan)`,
    category: existing.category,
    description: existing.description,
    tableId: existing.tableId,
    content: existing.content,
  });
}

export function componentPreview(component: ComponentRecord): string {
  return blocksToText(component.content.blocks).slice(0, 140);
}

export function componentContent(component: ComponentRecord) {
  return parseJson(JSON.stringify(component.content), component.content);
}
