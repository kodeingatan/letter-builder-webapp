import "server-only";
import { ApiError } from "@/lib/http";
import { createId, getDb, nowIso, parseJson } from "@/lib/db";
import {
  mapField,
  mapGlobalRecord,
  mapTable,
  type GlobalField,
  type GlobalRecord,
  type GlobalTable,
} from "@/lib/entities";
import { slugify } from "@/lib/utils";
import type { z } from "zod";
import type {
  fieldInputSchema,
  fieldUpdateSchema,
  recordInputSchema,
  tableInputSchema,
} from "./schema";
import { FIELD_TYPES } from "./schema";

type TableInput = z.infer<typeof tableInputSchema>;
type FieldInput = z.infer<typeof fieldInputSchema>;
type FieldUpdate = z.infer<typeof fieldUpdateSchema>;
type RecordInput = z.infer<typeof recordInputSchema>;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function listTables(): GlobalTable[] {
  const rows = getDb()
    .prepare(
      `SELECT t.*,
        (SELECT COUNT(*) FROM global_fields f WHERE f.table_id = t.id) AS field_count,
        (SELECT COUNT(*) FROM global_records r WHERE r.table_id = t.id) AS record_count
       FROM global_tables t
       ORDER BY t.name COLLATE NOCASE`,
    )
    .all() as Record<string, unknown>[];
  return rows.map(mapTable);
}

export function getTable(tableId: string): {
  table: GlobalTable;
  fields: GlobalField[];
  records: GlobalRecord[];
} | null {
  const row = getDb().prepare("SELECT * FROM global_tables WHERE id = ?").get(tableId) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;

  const fields = getDb()
    .prepare("SELECT * FROM global_fields WHERE table_id = ? ORDER BY position, label")
    .all(tableId)
    .map((entry) => mapField(entry as Record<string, unknown>));

  const records = getDb()
    .prepare("SELECT * FROM global_records WHERE table_id = ? ORDER BY position, created_at")
    .all(tableId)
    .map((entry) => mapGlobalRecord(entry as Record<string, unknown>));

  return { table: mapTable(row), fields, records };
}

export function getTableSummary(tableId: string): GlobalTable | null {
  const row = getDb().prepare("SELECT * FROM global_tables WHERE id = ?").get(tableId);
  return row ? mapTable(row as Record<string, unknown>) : null;
}

function uniqueSlug(base: string): string {
  const db = getDb();
  const root = slugify(base) || "tabel";
  let candidate = root;
  let index = 1;
  while (db.prepare("SELECT 1 FROM global_tables WHERE slug = ?").get(candidate)) {
    index += 1;
    candidate = `${root}_${index}`;
  }
  return candidate;
}

export function createTable(input: TableInput): GlobalTable {
  const db = getDb();
  const id = createId("tbl");
  const now = nowIso();
  db.prepare(
    "INSERT INTO global_tables (id, name, slug, description, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(id, input.name, uniqueSlug(input.name), input.description, input.icon, now, now);

  const table = db.prepare("SELECT * FROM global_tables WHERE id = ?").get(id);
  return mapTable(table as Record<string, unknown>);
}

export function updateTable(tableId: string, input: TableInput): GlobalTable {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM global_tables WHERE id = ?").get(tableId);
  if (!existing) throw new ApiError(404, "Tabel tidak ditemukan.");

  db.prepare(
    "UPDATE global_tables SET name = ?, description = ?, icon = ?, updated_at = ? WHERE id = ?",
  ).run(input.name, input.description, input.icon, nowIso(), tableId);

  const table = db.prepare("SELECT * FROM global_tables WHERE id = ?").get(tableId);
  return mapTable(table as Record<string, unknown>);
}

export interface TableDependency {
  id: string;
  name: string;
  kind: "Component" | "Template" | "Administrasi";
}

export function getTableDependencies(tableId: string): TableDependency[] {
  const db = getDb();
  const like = `%${tableId}%`;
  const dependencies: TableDependency[] = [];

  const components = db
    .prepare("SELECT id, name FROM components WHERE table_id = ? OR content LIKE ?")
    .all(tableId, like) as Array<{ id: string; name: string }>;
  components.forEach((row) =>
    dependencies.push({ id: row.id, name: row.name, kind: "Component" }),
  );

  const templates = db
    .prepare("SELECT id, name FROM templates WHERE content LIKE ?")
    .all(like) as Array<{ id: string; name: string }>;
  templates.forEach((row) =>
    dependencies.push({ id: row.id, name: row.name, kind: "Template" }),
  );

  const administrasi = db
    .prepare("SELECT id, name FROM administrasi WHERE data_source_table_id = ?")
    .all(tableId) as Array<{ id: string; name: string }>;
  administrasi.forEach((row) =>
    dependencies.push({ id: row.id, name: row.name, kind: "Administrasi" }),
  );

  return dependencies;
}

export function deleteTable(tableId: string): void {
  const db = getDb();
  const dependencies = getTableDependencies(tableId);
  if (dependencies.length > 0) {
    throw new ApiError(
      409,
      "Tabel masih dipakai. Lepaskan referensi terlebih dahulu.",
      dependencies,
    );
  }
  db.prepare("DELETE FROM global_tables WHERE id = ?").run(tableId);
}

export function createField(tableId: string, input: FieldInput): GlobalField {
  const db = getDb();
  if (!db.prepare("SELECT 1 FROM global_tables WHERE id = ?").get(tableId)) {
    throw new ApiError(404, "Tabel tidak ditemukan.");
  }
  const exists = db
    .prepare("SELECT 1 FROM global_fields WHERE table_id = ? AND name = ?")
    .get(tableId, input.name);
  if (exists) throw new ApiError(409, `Field "${input.name}" sudah ada pada tabel ini.`);

  const position = (
    db
      .prepare("SELECT COALESCE(MAX(position), -1) + 1 AS next FROM global_fields WHERE table_id = ?")
      .get(tableId) as { next: number }
  ).next;

  const id = createId("fld");
  db.prepare(
    `INSERT INTO global_fields (id, table_id, name, label, type, options, required, position)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    tableId,
    input.name,
    input.label,
    input.type,
    JSON.stringify(input.options ?? []),
    input.required ? 1 : 0,
    position,
  );
  db.prepare("UPDATE global_tables SET updated_at = ? WHERE id = ?").run(nowIso(), tableId);

  const row = db.prepare("SELECT * FROM global_fields WHERE id = ?").get(id);
  return mapField(row as Record<string, unknown>);
}

export function updateField(fieldId: string, input: FieldUpdate): GlobalField {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM global_fields WHERE id = ?").get(fieldId) as
    | Record<string, unknown>
    | undefined;
  if (!existing) throw new ApiError(404, "Field tidak ditemukan.");

  const name = input.name ?? String(existing.name);
  if (name !== existing.name) {
    const conflict = db
      .prepare("SELECT 1 FROM global_fields WHERE table_id = ? AND name = ? AND id <> ?")
      .get(existing.table_id, name, fieldId);
    if (conflict) throw new ApiError(409, `Field "${name}" sudah ada pada tabel ini.`);
  }

  // Validate type against database constraints
  const type = input.type ?? String(existing.type);
  console.log(`[updateField] Updating field ${fieldId}, type: ${type}`);
  
  if (!FIELD_TYPES.includes(type as any)) {
    console.error(`[updateField] Invalid type: ${type}, valid types: ${FIELD_TYPES.join(', ')}`);
    throw new ApiError(422, `Tipe field tidak valid: ${type}`);
  }

  try {
    db.prepare(
      `UPDATE global_fields SET name = ?, label = ?, type = ?, options = ?, required = ?, position = ?
       WHERE id = ?`,
    ).run(
      name,
      input.label ?? String(existing.label),
      type,
      input.options ? JSON.stringify(input.options) : String(existing.options),
      input.required === undefined ? Number(existing.required) : input.required ? 1 : 0,
      input.position ?? Number(existing.position),
      fieldId,
    );
    
    db.prepare("UPDATE global_tables SET updated_at = ? WHERE id = ?").run(
      nowIso(),
      String(existing.table_id),
    );

    const row = db.prepare("SELECT * FROM global_fields WHERE id = ?").get(fieldId);
    return mapField(row as Record<string, unknown>);
  } catch (error) {
    console.error(`[updateField] Database error:`, error);
    if (error instanceof Error && error.message.includes('CHECK constraint failed')) {
      throw new ApiError(422, `Tipe field tidak valid: ${type}. Gunakan salah satu dari: ${FIELD_TYPES.join(', ')}`);
    }
    throw error;
  }
}

export function getFieldUsage(fieldName: string, tableId: string): number {
  const table = getTableSummary(tableId);
  if (!table) return 0;
  const patterns = [`%${table.slug}.${fieldName}%`, `%"path":"${fieldName}"%`];
  const db = getDb();
  let count = 0;
  for (const pattern of patterns) {
    const row = db
      .prepare(
        `SELECT
          (SELECT COUNT(*) FROM templates WHERE content LIKE ?) +
          (SELECT COUNT(*) FROM components WHERE content LIKE ?) AS total`,
      )
      .get(pattern, pattern) as { total: number };
    count += row.total;
  }
  return count;
}

export function deleteField(fieldId: string): { usage: number } {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM global_fields WHERE id = ?").get(fieldId) as
    | Record<string, unknown>
    | undefined;
  if (!existing) throw new ApiError(404, "Field tidak ditemukan.");

  const usage = getFieldUsage(String(existing.name), String(existing.table_id));
  db.prepare("DELETE FROM global_fields WHERE id = ?").run(fieldId);

  const records = db
    .prepare("SELECT id, data FROM global_records WHERE table_id = ?")
    .all(String(existing.table_id)) as Array<{ id: string; data: string }>;
  const update = db.prepare("UPDATE global_records SET data = ?, updated_at = ? WHERE id = ?");
  records.forEach((record) => {
    const data = parseJson<Record<string, unknown>>(record.data, {});
    if (String(existing.name) in data) {
      delete data[String(existing.name)];
      update.run(JSON.stringify(data), nowIso(), record.id);
    }
  });

  return { usage };
}

function coerceValue(
  field: GlobalField,
  raw: string | number | boolean | null,
): string | number | boolean | null {
  if (raw === null || raw === "") return null;

  switch (field.type) {
    case "number": {
      const numeric = typeof raw === "number" ? raw : Number(String(raw).replace(/[^\d.-]/g, ""));
      if (Number.isNaN(numeric)) {
        throw new ApiError(422, `Field "${field.label}" harus berupa angka.`);
      }
      return numeric;
    }
    case "boolean": {
      if (typeof raw === "boolean") return raw;
      return raw === "true" || raw === "1";
    }
    case "date": {
      const value = String(raw);
      if (!DATE_PATTERN.test(value)) {
        throw new ApiError(422, `Field "${field.label}" harus berformat tanggal YYYY-MM-DD.`);
      }
      return value;
    }
    case "email": {
      const value = String(raw).trim();
      if (!EMAIL_PATTERN.test(value)) {
        throw new ApiError(422, `Field "${field.label}" harus berupa surel yang valid.`);
      }
      return value;
    }
    case "select": {
      const value = String(raw);
      if (field.options.length > 0 && !field.options.includes(value)) {
        throw new ApiError(422, `Nilai "${value}" tidak ada pada pilihan ${field.label}.`);
      }
      return value;
    }
    case "rich_text": {
      // Sanitasi HTML sederhana: trim whitespace, tidak memotong teks
      const value = String(raw).trim();
      return value || null;
    }
    default:
      return String(raw).slice(0, 2000);
  }
}

export function validateRecordData(
  fields: GlobalField[],
  input: Record<string, string | number | boolean | null>,
): Record<string, string | number | boolean | null> {
  const data: Record<string, string | number | boolean | null> = {};
  for (const field of fields) {
    const value = coerceValue(field, input[field.name] ?? null);
    if (field.required && (value === null || value === "")) {
      throw new ApiError(422, `Field "${field.label}" wajib diisi.`);
    }
    data[field.name] = value;
  }
  return data;
}

export function createRecord(tableId: string, input: RecordInput): GlobalRecord {
  const table = getTable(tableId);
  if (!table) throw new ApiError(404, "Tabel tidak ditemukan.");

  const data = validateRecordData(table.fields, input.data);
  const id = createId("rec");
  const now = nowIso();
  const position = (
    getDb()
      .prepare("SELECT COALESCE(MAX(position), -1) + 1 AS next FROM global_records WHERE table_id = ?")
      .get(tableId) as { next: number }
  ).next;

  getDb()
    .prepare(
      "INSERT INTO global_records (id, table_id, data, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(id, tableId, JSON.stringify(data), position, now, now);

  return { id, tableId, data, position, createdAt: now, updatedAt: now };
}

export function updateRecord(recordId: string, input: RecordInput): GlobalRecord {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM global_records WHERE id = ?").get(recordId) as
    | Record<string, unknown>
    | undefined;
  if (!existing) throw new ApiError(404, "Record tidak ditemukan.");

  const table = getTable(String(existing.table_id));
  if (!table) throw new ApiError(404, "Tabel tidak ditemukan.");

  const data = validateRecordData(table.fields, input.data);
  db.prepare("UPDATE global_records SET data = ?, updated_at = ? WHERE id = ?").run(
    JSON.stringify(data),
    nowIso(),
    recordId,
  );

  return mapGlobalRecord({ ...existing, data: JSON.stringify(data), updated_at: nowIso() });
}

export function deleteRecord(recordId: string): void {
  const db = getDb();
  const used = db.prepare("SELECT COUNT(*) AS total FROM surat WHERE record_id = ?").get(recordId) as {
    total: number;
  };
  if (used.total > 0) {
    throw new ApiError(
      409,
      "Record ini sudah dipakai pada surat. Surat selesai menyimpan snapshot, namun riwayat tetap perlu dijaga. Hapus surat terkait terlebih dahulu.",
    );
  }
  db.prepare("DELETE FROM global_records WHERE id = ?").run(recordId);
}

export function listTableOptions(): Array<{ id: string; name: string; slug: string }> {
  return getDb()
    .prepare("SELECT id, name, slug FROM global_tables ORDER BY name COLLATE NOCASE")
    .all() as Array<{ id: string; name: string; slug: string }>;
}

export interface TableWithFields {
  id: string;
  name: string;
  slug: string;
  fields: Array<{ name: string; label: string; type: string }>;
}

/** Compact table definition used by the editor variable picker. */
export function tablesWithFields(): TableWithFields[] {
  const tables = getDb()
    .prepare("SELECT id, name, slug FROM global_tables ORDER BY name COLLATE NOCASE")
    .all() as Array<{ id: string; name: string; slug: string }>;

  return tables.map((table) => ({
    ...table,
    fields: (
      getDb()
        .prepare("SELECT name, label, type FROM global_fields WHERE table_id = ? ORDER BY position, label")
        .all(table.id) as Array<{ name: string; label: string; type: string }>
    ).map((field) => ({ name: field.name, label: field.label, type: field.type })),
  }));
}

/** Counts references to a table id inside any document content. */
export function countTableReferences(tableId: string): number {
  const pattern = `%${tableId}%`;
  const row = getDb()
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM components WHERE content LIKE ?) +
        (SELECT COUNT(*) FROM templates WHERE content LIKE ?) AS total`,
    )
    .get(pattern, pattern) as { total: number };
  return row.total;
}

export function listRecordsForTable(tableId: string): GlobalRecord[] {
  return getDb()
    .prepare("SELECT * FROM global_records WHERE table_id = ? ORDER BY position, created_at")
    .all(tableId)
    .map((row) => mapGlobalRecord(row as Record<string, unknown>));
}
