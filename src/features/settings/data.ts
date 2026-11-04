import "server-only";
import { z } from "zod";
import { getDb, nowIso } from "@/lib/db";
import { ApiError } from "@/lib/http";
import { DEFAULT_SETTINGS } from "./server";

type RawRow = Record<string, unknown>;

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  app: "aksara";
  tables: RawRow[];
  fields: RawRow[];
  records: RawRow[];
  components: RawRow[];
  templates: RawRow[];
  templateVersions: RawRow[];
  administrasi: RawRow[];
  steps: RawRow[];
  surat: RawRow[];
  suratSteps: RawRow[];
  suratVersions: RawRow[];
  settings: RawRow[];
}

const rawRow = z.record(z.string(), z.unknown());
const backupSchema = z.object({
  version: z.literal(1),
  app: z.string().optional(),
  exportedAt: z.string().optional(),
  tables: z.array(rawRow).default([]),
  fields: z.array(rawRow).default([]),
  records: z.array(rawRow).default([]),
  components: z.array(rawRow).default([]),
  templates: z.array(rawRow).default([]),
  templateVersions: z.array(rawRow).default([]),
  administrasi: z.array(rawRow).default([]),
  steps: z.array(rawRow).default([]),
  surat: z.array(rawRow).default([]),
  suratSteps: z.array(rawRow).default([]),
  suratVersions: z.array(rawRow).default([]),
  settings: z.array(rawRow).default([]),
});

function text(row: RawRow, key: string, fallback = ""): string {
  const value = row[key];
  if (value === undefined || value === null) return fallback;
  return String(value);
}

function json(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return fallback;
  return JSON.stringify(value);
}

function integer(row: RawRow, key: string, fallback = 0): number {
  const value = Number(row[key]);
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}

function flag(row: RawRow, key: string): number {
  const value = row[key];
  return value === true || value === 1 || value === "1" || value === "true" ? 1 : 0;
}

export function exportBackup(): BackupPayload {
  const db = getDb();
  const all = (sql: string): RawRow[] => db.prepare(sql).all() as RawRow[];

  return {
    version: 1,
    app: "aksara",
    exportedAt: nowIso(),
    tables: all("SELECT * FROM global_tables ORDER BY name"),
    fields: all("SELECT * FROM global_fields ORDER BY table_id, position"),
    records: all("SELECT * FROM global_records ORDER BY table_id, position"),
    components: all("SELECT * FROM components ORDER BY name"),
    templates: all("SELECT * FROM templates ORDER BY name"),
    templateVersions: all("SELECT * FROM template_versions ORDER BY template_id, version"),
    administrasi: all("SELECT * FROM administrasi ORDER BY name"),
    steps: all("SELECT * FROM administrasi_steps ORDER BY administrasi_id, position"),
    surat: all("SELECT * FROM surat ORDER BY created_at"),
    suratSteps: all("SELECT * FROM surat_step_data ORDER BY surat_id"),
    suratVersions: all("SELECT * FROM surat_versions ORDER BY surat_id, version"),
    settings: all("SELECT * FROM settings"),
  };
}

export function importBackup(payload: unknown): { counts: Record<string, number> } {
  const parsed = backupSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError(422, "Berkas cadangan tidak valid.", parsed.error.flatten());
  }
  const data = parsed.data;
  if (data.tables.length === 0 && data.templates.length === 0 && data.surat.length === 0) {
    throw new ApiError(422, "Berkas cadangan kosong atau bukan berasal dari Aksara.");
  }

  const db = getDb();
  const userIds = new Set(
    (db.prepare("SELECT id FROM users").all() as Array<{ id: string }>).map((row) => row.id),
  );
  const actor = (id: unknown): string | null => (id && userIds.has(String(id)) ? String(id) : null);
  const now = nowIso();

  const insert = (table: string, columns: string[], rows: unknown[][]) => {
    if (rows.length === 0) return;
    const statement = db.prepare(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
    );
    for (const values of rows) statement.run(...values);
  };

  const wipe = () => {
    db.exec(`
      DELETE FROM surat_versions;
      DELETE FROM surat_step_data;
      DELETE FROM surat;
      DELETE FROM administrasi_steps;
      DELETE FROM administrasi;
      DELETE FROM template_versions;
      DELETE FROM templates;
      DELETE FROM components;
      DELETE FROM global_records;
      DELETE FROM global_fields;
      DELETE FROM global_tables;
      DELETE FROM settings;
    `);
  };

  const transaction = db.transaction(() => {
    wipe();

    insert(
      "global_tables",
      ["id", "name", "slug", "description", "icon", "created_at", "updated_at"],
      data.tables.map((row) => [
        text(row, "id"),
        text(row, "name"),
        text(row, "slug"),
        text(row, "description"),
        text(row, "icon", "table"),
        text(row, "created_at", now),
        text(row, "updated_at", now),
      ]),
    );

    insert(
      "global_fields",
      ["id", "table_id", "name", "label", "type", "options", "required", "position"],
      data.fields.map((row) => [
        text(row, "id"),
        text(row, "table_id"),
        text(row, "name"),
        text(row, "label"),
        text(row, "type", "text"),
        json(row.options, "[]"),
        flag(row, "required"),
        integer(row, "position"),
      ]),
    );

    insert(
      "global_records",
      ["id", "table_id", "data", "position", "created_at", "updated_at"],
      data.records.map((row) => [
        text(row, "id"),
        text(row, "table_id"),
        json(row.data, "{}"),
        integer(row, "position"),
        text(row, "created_at", now),
        text(row, "updated_at", now),
      ]),
    );

    insert(
      "components",
      ["id", "name", "category", "description", "content", "table_id", "created_at", "updated_at"],
      data.components.map((row) => [
        text(row, "id"),
        text(row, "name"),
        text(row, "category", "Umum"),
        text(row, "description"),
        json(row.content, '{"version":1,"blocks":[]}'),
        row.table_id ? text(row, "table_id") : null,
        text(row, "created_at", now),
        text(row, "updated_at", now),
      ]),
    );

    insert(
      "templates",
      ["id", "name", "description", "content", "page", "created_at", "updated_at"],
      data.templates.map((row) => [
        text(row, "id"),
        text(row, "name"),
        text(row, "description"),
        json(row.content, '{"version":1,"blocks":[]}'),
        json(row.page, "{}"),
        text(row, "created_at", now),
        text(row, "updated_at", now),
      ]),
    );

    insert(
      "template_versions",
      ["id", "template_id", "version", "name", "content", "page", "created_by", "created_at"],
      data.templateVersions.map((row) => [
        text(row, "id"),
        text(row, "template_id"),
        integer(row, "version", 1),
        text(row, "name"),
        json(row.content, '{"version":1,"blocks":[]}'),
        json(row.page, "{}"),
        actor(row.created_by),
        text(row, "created_at", now),
      ]),
    );

    insert(
      "administrasi",
      [
        "id",
        "name",
        "description",
        "status",
        "data_source_table_id",
        "filter",
        "number_pattern",
        "fields",
        "created_at",
        "updated_at",
      ],
      data.administrasi.map((row) => [
        text(row, "id"),
        text(row, "name"),
        text(row, "description"),
        ["draft", "active", "archived"].includes(text(row, "status")) ? text(row, "status") : "draft",
        row.data_source_table_id ? text(row, "data_source_table_id") : null,
        json(row.filter, "[]"),
        text(row, "number_pattern", "SP-{seq}/{romanMonth}/{year}"),
        json(row.fields, "[]"),
        text(row, "created_at", now),
        text(row, "updated_at", now),
      ]),
    );

    insert(
      "administrasi_steps",
      ["id", "administrasi_id", "template_id", "name", "position"],
      data.steps.map((row) => [
        text(row, "id"),
        text(row, "administrasi_id"),
        row.template_id ? text(row, "template_id") : null,
        text(row, "name"),
        integer(row, "position"),
      ]),
    );

    insert(
      "surat",
      [
        "id",
        "administrasi_id",
        "batch_id",
        "record_id",
        "record_snapshot",
        "number",
        "letter_date",
        "status",
        "data",
        "current_step_id",
        "created_by",
        "created_at",
        "updated_at",
      ],
      data.surat.map((row) => [
        text(row, "id"),
        text(row, "administrasi_id"),
        text(row, "batch_id"),
        row.record_id ? text(row, "record_id") : null,
        row.record_snapshot ? json(row.record_snapshot, "null") : null,
        text(row, "number"),
        text(row, "letter_date", now.slice(0, 10)),
        text(row, "status") === "completed" ? "completed" : "draft",
        json(row.data, "{}"),
        row.current_step_id ? text(row, "current_step_id") : null,
        actor(row.created_by),
        text(row, "created_at", now),
        text(row, "updated_at", now),
      ]),
    );

    insert(
      "surat_step_data",
      ["id", "surat_id", "step_id", "override_content", "updated_at"],
      data.suratSteps.map((row) => [
        text(row, "id"),
        text(row, "surat_id"),
        text(row, "step_id"),
        row.override_content ? json(row.override_content, "null") : null,
        text(row, "updated_at", now),
      ]),
    );

    insert(
      "surat_versions",
      ["id", "surat_id", "version", "summary", "snapshot", "created_by", "created_at"],
      data.suratVersions.map((row) => [
        text(row, "id"),
        text(row, "surat_id"),
        integer(row, "version", 1),
        text(row, "summary"),
        json(row.snapshot, "{}"),
        actor(row.created_by),
        text(row, "created_at", now),
      ]),
    );

    const settingsRows = data.settings.filter((row) => text(row, "key") && text(row, "value"));
    if (settingsRows.length === 0) {
      insert("settings", ["key", "value", "updated_at"], [
        ["organization", JSON.stringify(DEFAULT_SETTINGS), now],
      ]);
    } else {
      insert(
        "settings",
        ["key", "value", "updated_at"],
        settingsRows.map((row) => [text(row, "key"), text(row, "value"), text(row, "updated_at", now)]),
      );
    }
  });

  try {
    transaction();
  } catch (error) {
    throw new ApiError(
      422,
      "Berkas cadangan tidak dapat dimuat. Pastikan berkas berasal dari ekspor Aksara.",
      error instanceof Error ? error.message : undefined,
    );
  }

  return {
    counts: {
      tabel: data.tables.length,
      baris: data.records.length,
      component: data.components.length,
      template: data.templates.length,
      administrasi: data.administrasi.length,
      surat: data.surat.length,
    },
  };
}

export function resetWorkspace(): void {
  const db = getDb();
  const transaction = db.transaction(() => {
    db.exec(`
      DELETE FROM surat_versions;
      DELETE FROM surat_step_data;
      DELETE FROM surat;
      DELETE FROM administrasi_steps;
      DELETE FROM administrasi;
      DELETE FROM template_versions;
      DELETE FROM templates;
      DELETE FROM components;
      DELETE FROM global_records;
      DELETE FROM global_fields;
      DELETE FROM global_tables;
      DELETE FROM settings;
    `);
    db.prepare("INSERT INTO settings (key, value, updated_at) VALUES ('organization', ?, ?)").run(
      JSON.stringify(DEFAULT_SETTINGS),
      nowIso(),
    );
  });
  transaction();
}
