import "server-only";
import type { z } from "zod";
import { ApiError } from "@/lib/http";
import { createId, getDb, nowIso, parseJson } from "@/lib/db";
import {
  mapAdministrasi,
  mapGlobalRecord,
  mapSurat,
  type AdministrasiRecord,
  type FieldValue,
  type GlobalField,
  type GlobalRecord,
  type SuratRecord,
  type SuratVersion,
} from "@/lib/entities";
import type {
  DocumentContent,
  PageConfig,
  RenderContext,
  RenderRecord,
} from "@/lib/documents/types";
import { DEFAULT_PAGE } from "@/lib/documents/types";
import { validateDocument } from "@/lib/documents/validate";
import { evaluateConditions } from "@/lib/documents/engine";
import { formatLetterNumber, nextSequence } from "@/lib/numbering";
import type { ComponentSource } from "@/lib/documents/engine";
import type { createSuratSchema, saveSuratSchema } from "./schema";

type CreateSuratInput = z.infer<typeof createSuratSchema>;
type SaveSuratInput = z.infer<typeof saveSuratSchema>;

export interface SuratStepPayload {
  id: string;
  name: string;
  position: number;
  templateId: string | null;
  templateName: string;
  content: DocumentContent;
  page: PageConfig;
  overrideContent: DocumentContent | null;
}

export interface SourceRow {
  id: string;
  label: string;
  status: "none" | "draft" | "completed";
  suratId: string | null;
}

export interface SuratWorkspacePayload {
  surat: SuratRecord;
  administrasi: AdministrasiRecord;
  steps: SuratStepPayload[];
  components: ComponentSource[];
  context: RenderContext;
  source: {
    tableId: string | null;
    tableName: string;
    columns: Array<Pick<GlobalField, "name" | "label" | "type">>;
    recordIds: string[];
    rows: SourceRow[];
  };
  neighbors: { ids: string[]; index: number };
  recordLabel: string;
}

export interface SuratListRow extends SuratRecord {
  administrasiName: string;
  tableName: string | null;
}

function tableSlug(tableId: string | null): string | null {
  if (!tableId) return null;
  const row = getDb().prepare("SELECT slug FROM global_tables WHERE id = ?").get(tableId) as
    | { slug: string }
    | undefined;
  return row?.slug ?? null;
}

function toRenderRecord(data: Record<string, FieldValue>): RenderRecord {
  const record: RenderRecord = {};
  for (const [key, value] of Object.entries(data)) {
    record[key] = value;
  }
  return record;
}

function primaryLabel(data: Record<string, FieldValue>, index: number): string {
  const candidate =
    data.nama ?? data.name ?? data.judul ?? data.nama_kegiatan ?? data.label ?? null;
  return candidate ? String(candidate) : `Baris ${index + 1}`;
}

export function listSurat(): SuratListRow[] {
  const rows = getDb()
    .prepare(
      `SELECT s.*, a.name AS administrasi_name, t.name AS table_name, r.data AS record_data
       FROM surat s
       JOIN administrasi a ON a.id = s.administrasi_id
       LEFT JOIN global_tables t ON t.id = a.data_source_table_id
       LEFT JOIN global_records r ON r.id = s.record_id
       ORDER BY s.updated_at DESC`,
    )
    .all() as Array<Record<string, unknown>>;

  return rows.map((row) => {
    const recordData = row.record_data
      ? parseJson<Record<string, FieldValue>>(row.record_data as string, {})
      : null;
    const label =
      recordData?.nama ?? recordData?.name ?? recordData?.nama_kegiatan ?? recordData?.judul ?? null;

    return {
      ...mapSurat(row),
      administrasiName: String(row.administrasi_name ?? ""),
      tableName: row.table_name ? String(row.table_name) : null,
      recordLabel: label ? String(label) : undefined,
    };
  });
}

export function listSuratByAdministrasi(): Array<{
  administrasi: AdministrasiRecord;
  letters: SuratListRow[];
}> {
  const letters = listSurat();
  const rows = getDb()
    .prepare(
      `SELECT a.*, (SELECT COUNT(*) FROM administrasi_steps s WHERE s.administrasi_id = a.id) AS step_count
       FROM administrasi a ORDER BY a.name COLLATE NOCASE`,
    )
    .all() as Array<Record<string, unknown>>;

  return rows.map((row) => {
    const administrasi = mapAdministrasi(row);
    return {
      administrasi,
      letters: letters.filter((letter) => letter.administrasiId === administrasi.id),
    };
  });
}

function getAdministrasiRow(id: string): AdministrasiRecord | null {
  const row = getDb().prepare("SELECT * FROM administrasi WHERE id = ?").get(id);
  return row ? mapAdministrasi(row as Record<string, unknown>) : null;
}

function getSourceRecords(administrasi: AdministrasiRecord): {
  tableId: string | null;
  tableName: string;
  slug: string | null;
  columns: GlobalField[];
  records: GlobalRecord[];
} {
  if (!administrasi.dataSourceTableId) {
    return { tableId: null, tableName: "", slug: null, columns: [], records: [] };
  }

  const table = getDb()
    .prepare("SELECT id, name, slug FROM global_tables WHERE id = ?")
    .get(administrasi.dataSourceTableId) as
    | { id: string; name: string; slug: string }
    | undefined;
  if (!table) return { tableId: null, tableName: "", slug: null, columns: [], records: [] };

  const columns = getDb()
    .prepare("SELECT * FROM global_fields WHERE table_id = ? ORDER BY position, label")
    .all(table.id)
    .map((row) => {
      const field = row as Record<string, unknown>;
      return {
        id: String(field.id),
        tableId: table.id,
        name: String(field.name),
        label: String(field.label),
        type: field.type as GlobalField["type"],
        options: parseJson<string[]>(field.options as string, []),
        required: Boolean(field.required),
        position: Number(field.position),
      };
    });

  const records = getDb()
    .prepare("SELECT * FROM global_records WHERE table_id = ? ORDER BY position, created_at")
    .all(table.id)
    .map((row) => mapGlobalRecord(row as Record<string, unknown>));

  return { tableId: table.id, tableName: table.name, slug: table.slug, columns, records };
}

function filterRecords(
  records: GlobalRecord[],
  administrasi: AdministrasiRecord,
  aliases: Record<string, RenderRecord>,
): GlobalRecord[] {
  if (administrasi.filter.length === 0) return records;

  const context: RenderContext = {
    letter: {},
    record: {},
    aliases,
    sources: {},
    sourceAliases: {},
  };

  return records.filter((record) =>
    evaluateConditions(administrasi.filter, "all", context, [
      { values: toRenderRecord(record.data) },
    ]),
  );
}

function buildSources(primaryTableId: string | null): {
  sources: Record<string, RenderRecord[]>;
  sourceAliases: Record<string, string>;
} {
  const tables = getDb().prepare("SELECT id, slug FROM global_tables").all() as Array<{
    id: string;
    slug: string;
  }>;
  const sources: Record<string, RenderRecord[]> = {};
  const sourceAliases: Record<string, string> = {};

  for (const table of tables) {
    sourceAliases[table.id] = table.slug;
    sources[table.id] = (
      getDb()
        .prepare("SELECT data FROM global_records WHERE table_id = ? ORDER BY position, created_at")
        .all(table.id) as Array<{ data: string }>
    ).map((row) => toRenderRecord(parseJson<Record<string, FieldValue>>(row.data, {})));
  }

  void primaryTableId;
  return { sources, sourceAliases };
}

export function getSuratRow(suratId: string): SuratRecord | null {
  const row = getDb().prepare("SELECT * FROM surat WHERE id = ?").get(suratId);
  return row ? mapSurat(row as Record<string, unknown>) : null;
}

export function getSuratWorkspace(suratId: string): SuratWorkspacePayload | null {
  const surat = getSuratRow(suratId);
  if (!surat) return null;

  const administrasi = getAdministrasiRow(surat.administrasiId);
  if (!administrasi) return null;

  const source = getSourceRecords(administrasi);
  const alias = source.slug ?? "record";
  const aliases: Record<string, RenderRecord> = {};

  let activeData: Record<string, FieldValue> = {};
  if (surat.status === "completed" && surat.recordSnapshot) {
    activeData = surat.recordSnapshot;
  } else if (surat.recordId) {
    const record = source.records.find((entry) => entry.id === surat.recordId);
    activeData = record?.data ?? {};
  }
  aliases[alias] = toRenderRecord(activeData);

  const { sources, sourceAliases } = buildSources(administrasi.dataSourceTableId);

  const stepRows = getDb()
    .prepare(
      `SELECT s.id, s.name, s.position, s.template_id,
              t.name AS template_name, t.content AS template_content, t.page AS template_page,
              d.override_content
       FROM administrasi_steps s
       LEFT JOIN templates t ON t.id = s.template_id
       LEFT JOIN surat_step_data d ON d.step_id = s.id AND d.surat_id = ?
       WHERE s.administrasi_id = ?
       ORDER BY s.position`,
    )
    .all(suratId, administrasi.id) as Array<Record<string, unknown>>;

  const steps: SuratStepPayload[] = stepRows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    position: Number(row.position),
    templateId: row.template_id ? String(row.template_id) : null,
    templateName: row.template_name ? String(row.template_name) : "Template tidak tersedia",
    content: parseJson<DocumentContent>(row.template_content as string, { version: 1, blocks: [] }),
    page: parseJson<PageConfig>(row.template_page as string, DEFAULT_PAGE),
    overrideContent: row.override_content
      ? parseJson<DocumentContent>(row.override_content as string, { version: 1, blocks: [] })
      : null,
  }));

  const components = (
    getDb()
      .prepare("SELECT id, name, content FROM components")
      .all() as Array<{ id: string; name: string; content: string }>
  ).map<ComponentSource>((row) => ({
    id: row.id,
    name: row.name,
    content: parseJson<DocumentContent>(row.content, { version: 1, blocks: [] }),
  }));

  const filtered = filterRecords(source.records, administrasi, aliases);

  const neighbors = (
    getDb()
      .prepare("SELECT id FROM surat WHERE administrasi_id = ? ORDER BY created_at, rowid")
      .all(administrasi.id) as Array<{ id: string }>
  ).map((row) => row.id);

  const activeIndex = sortedRecordIndex(filtered, surat.recordId);
  const letters = getDb()
    .prepare(
      `SELECT id, record_id, status, number FROM surat WHERE administrasi_id = ? AND record_id IS NOT NULL`,
    )
    .all(administrasi.id) as Array<{
    id: string;
    record_id: string;
    status: string;
    number: string;
  }>;
  const lettersByRecord = new Map(letters.map((letter) => [letter.record_id, letter]));

  const rows: SourceRow[] = filtered.map((record, index) => {
    const letter = lettersByRecord.get(record.id);
    return {
      id: record.id,
      label: primaryLabel(record.data, index),
      status: (letter?.status as SourceRow["status"] | undefined) ?? "none",
      suratId: letter?.id ?? null,
    };
  });

  return {
    surat,
    administrasi,
    steps,
    components,
    context: {
      letter: {
        ...(surat.data as unknown as RenderRecord),
        nomor: surat.number,
        tanggal: surat.letterDate,
      },
      record: toRenderRecord(activeData),
      aliases,
      sources,
      sourceAliases,
    },
    source: {
      tableId: source.tableId,
      tableName: source.tableName,
      columns: source.columns.map((column) => ({
        name: column.name,
        label: column.label,
        type: column.type,
      })),
      recordIds: filtered.map((record) => record.id),
      rows,
    },
    neighbors: {
      ids: neighbors,
      index: Math.max(0, neighbors.indexOf(suratId)),
    },
    recordLabel: primaryLabel(activeData, activeIndex),
  };
}

function sortedRecordIndex(records: GlobalRecord[], recordId: string | null): number {
  const index = records.findIndex((record) => record.id === recordId);
  return index === -1 ? 0 : index;
}

export function nextLetterNumber(
  administrasi: AdministrasiRecord,
  date: Date,
  record: Record<string, FieldValue> | null,
): string {
  const existing = getDb()
    .prepare("SELECT number FROM surat WHERE administrasi_id = ?")
    .all(administrasi.id) as Array<{ number: string }>;

  let sequence = nextSequence(
    existing.map((row) => row.number),
    administrasi.numberPattern,
  );
  const used = new Set(existing.map((row) => row.number));

  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const number = formatLetterNumber(administrasi.numberPattern, {
      sequence,
      date,
      record: record ?? undefined,
    });
    if (!used.has(number)) return number;
    sequence += 1;
  }

  return formatLetterNumber(administrasi.numberPattern, { sequence, date });
}

export function createSuratBatch(input: CreateSuratInput, userId: string): {
  ids: string[];
  firstId: string;
} {
  const administrasi = getAdministrasiRow(input.administrasiId);
  if (!administrasi) throw new ApiError(404, "Administrasi tidak ditemukan.");
  if (administrasi.status === "archived") {
    throw new ApiError(422, "Administrasi diarsipkan dan tidak dapat membuat surat baru.");
  }

  const db = getDb();
  const records = db
    .prepare("SELECT * FROM global_records WHERE table_id = ? AND id IN (" + input.recordIds.map(() => "?").join(",") + ")")
    .all(administrasi.dataSourceTableId ?? "", ...input.recordIds)
    .map((row) => mapGlobalRecord(row as Record<string, unknown>));

  if (records.length === 0) {
    throw new ApiError(422, "Baris data yang dipilih tidak ditemukan pada sumber data.");
  }

  const batchId = createId("bat");
  const ids: string[] = [];
  const now = nowIso();
  const date = new Date();

  const insert = db.prepare(
    `INSERT INTO surat
      (id, administrasi_id, batch_id, record_id, number, letter_date, status, data, current_step_id, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)`,
  );

  const firstStep = db
    .prepare("SELECT id FROM administrasi_steps WHERE administrasi_id = ? ORDER BY position LIMIT 1")
    .get(administrasi.id) as { id: string } | undefined;

  const transaction = db.transaction(() => {
    for (const record of records) {
      const id = createId("srt");
      const number = nextLetterNumber(administrasi, date, record.data);

      const data: Record<string, string> = { ...input.data };
      data.nomor = number;
      data.tanggal = data.tanggal || now.slice(0, 10);
      administrasi.fields.forEach((field) => {
        if (field.scope === "record" && !data[field.key]) {
          const value = record.data[field.key];
          if (value !== undefined && value !== null) data[field.key] = String(value);
        }
      });

      insert.run(
        id,
        administrasi.id,
        batchId,
        record.id,
        number,
        data.tanggal,
        JSON.stringify(data),
        firstStep?.id ?? null,
        userId,
        now,
        now,
      );
      ids.push(id);
    }
  });

  transaction();
  return { ids, firstId: ids[0] };
}

export function saveSurat(
  suratId: string,
  input: SaveSuratInput,
  userId: string,
): SuratRecord {
  const surat = getSuratRow(suratId);
  if (!surat) throw new ApiError(404, "Surat tidak ditemukan.");
  if (surat.status === "completed") {
    throw new ApiError(409, "Surat sudah selesai dan tidak dapat diubah. Buka kembali untuk mengedit.");
  }

  const db = getDb();
  const data: Record<string, string> = { ...input.data };
  if (input.data.nomor !== undefined) data.nomor = input.data.nomor;
  if (input.data.tanggal !== undefined) data.tanggal = input.data.tanggal;

  const transaction = db.transaction(() => {
    db.prepare(
      "UPDATE surat SET data = ?, number = ?, letter_date = ?, current_step_id = COALESCE(?, current_step_id), updated_at = ? WHERE id = ?",
    ).run(
      JSON.stringify(data),
      data.nomor ?? surat.number,
      data.tanggal || surat.letterDate,
      input.currentStepId ?? null,
      nowIso(),
      suratId,
    );

    if (input.stepId && input.overrideContent !== undefined) {
      const override =
        input.overrideContent === null ? null : validateDocument(input.overrideContent);
      const existing = db
        .prepare("SELECT id FROM surat_step_data WHERE surat_id = ? AND step_id = ?")
        .get(suratId, input.stepId) as { id: string } | undefined;

      if (existing) {
        db.prepare("UPDATE surat_step_data SET override_content = ?, updated_at = ? WHERE id = ?").run(
          override ? JSON.stringify(override) : null,
          nowIso(),
          existing.id,
        );
      } else {
        db.prepare(
          "INSERT INTO surat_step_data (id, surat_id, step_id, override_content, updated_at) VALUES (?, ?, ?, ?, ?)",
        ).run(createId("ssd"), suratId, input.stepId, override ? JSON.stringify(override) : null, nowIso());
      }
    }

    if (input.createVersion) {
      createSuratVersion(suratId, userId, "Disimpan manual");
    }
  });

  transaction();
  return getSuratRow(suratId)!;
}

export function createSuratVersion(suratId: string, userId: string, summary: string): void {
  const db = getDb();
  const surat = getSuratRow(suratId);
  if (!surat) return;

  const overrides = db
    .prepare("SELECT step_id, override_content FROM surat_step_data WHERE surat_id = ?")
    .all(suratId) as Array<{ step_id: string; override_content: string | null }>;

  const version = (
    db
      .prepare("SELECT COALESCE(MAX(version), 0) + 1 AS next FROM surat_versions WHERE surat_id = ?")
      .get(suratId) as { next: number }
  ).next;

  db.prepare(
    `INSERT INTO surat_versions (id, surat_id, version, summary, snapshot, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    createId("sv"),
    suratId,
    version,
    summary,
    JSON.stringify({
      data: surat.data,
      number: surat.number,
      letterDate: surat.letterDate,
      overrides: overrides.map((row) => ({
        stepId: row.step_id,
        content: row.override_content ? parseJson(row.override_content, null) : null,
      })),
    }),
    userId,
    nowIso(),
  );
}

export function completeSurat(suratId: string, userId: string): SuratRecord {
  const surat = getSuratRow(suratId);
  if (!surat) throw new ApiError(404, "Surat tidak ditemukan.");
  if (surat.status === "completed") return surat;

  const administrasi = getAdministrasiRow(surat.administrasiId);
  if (!administrasi) throw new ApiError(404, "Administrasi tidak ditemukan.");

  const missing = administrasi.fields
    .filter((field) => field.required && field.scope === "shared")
    .filter((field) => !String(surat.data[field.key] ?? "").trim())
    .map((field) => field.label);

  if (missing.length > 0) {
    throw new ApiError(422, `Lengkapi data berikut sebelum menyelesaikan surat: ${missing.join(", ")}.`);
  }

  const db = getDb();
  const record = surat.recordId
    ? (db.prepare("SELECT data FROM global_records WHERE id = ?").get(surat.recordId) as
        | { data: string }
        | undefined)
    : undefined;

  const transaction = db.transaction(() => {
    db.prepare(
      "UPDATE surat SET status = 'completed', record_snapshot = ?, updated_at = ? WHERE id = ?",
    ).run(record?.data ?? null, nowIso(), suratId);

    createSuratVersion(suratId, userId, "Surat diselesaikan");
  });

  transaction();
  return getSuratRow(suratId)!;
}

export function reopenSurat(suratId: string): SuratRecord {
  const surat = getSuratRow(suratId);
  if (!surat) throw new ApiError(404, "Surat tidak ditemukan.");
  getDb()
    .prepare("UPDATE surat SET status = 'draft', updated_at = ? WHERE id = ?")
    .run(nowIso(), suratId);
  return getSuratRow(suratId)!;
}

export function deleteSurat(suratId: string): void {
  getDb().prepare("DELETE FROM surat WHERE id = ?").run(suratId);
}

export function deleteSuratBatch(batchId: string): void {
  getDb().prepare("DELETE FROM surat WHERE batch_id = ?").run(batchId);
}

export function listSuratVersions(suratId: string): SuratVersion[] {
  const rows = getDb()
    .prepare(
      `SELECT v.*, u.name AS created_by_name
       FROM surat_versions v
       LEFT JOIN users u ON u.id = v.created_by
       WHERE v.surat_id = ?
       ORDER BY v.version DESC`,
    )
    .all(suratId) as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    id: String(row.id),
    suratId: String(row.surat_id),
    version: Number(row.version),
    summary: String(row.summary),
    snapshot: parseJson(row.snapshot as string, null),
    createdByName: row.created_by_name ? String(row.created_by_name) : null,
    createdAt: String(row.created_at),
  }));
}

export function restoreSuratVersion(suratId: string, version: number): SuratRecord {
  const surat = getSuratRow(suratId);
  if (!surat) throw new ApiError(404, "Surat tidak ditemukan.");

  const target = listSuratVersions(suratId).find((item) => item.version === version);
  if (!target) throw new ApiError(404, "Versi surat tidak ditemukan.");

  const snapshot = target.snapshot as {
    data: Record<string, string>;
    number: string;
    letterDate: string;
    overrides: Array<{ stepId: string; content: DocumentContent | null }>;
  } | null;
  if (!snapshot) throw new ApiError(422, "Snapshot versi tidak valid.");

  const db = getDb();
  const transaction = db.transaction(() => {
    db.prepare(
      "UPDATE surat SET data = ?, number = ?, letter_date = ?, updated_at = ? WHERE id = ?",
    ).run(JSON.stringify(snapshot.data), snapshot.number, snapshot.letterDate, nowIso(), suratId);

    db.prepare("DELETE FROM surat_step_data WHERE surat_id = ?").run(suratId);
    snapshot.overrides.forEach((override) => {
      db.prepare(
        "INSERT INTO surat_step_data (id, surat_id, step_id, override_content, updated_at) VALUES (?, ?, ?, ?, ?)",
      ).run(
        createId("ssd"),
        suratId,
        override.stepId,
        override.content ? JSON.stringify(override.content) : null,
        nowIso(),
      );
    });
  });

  transaction();
  return getSuratRow(suratId)!;
}

export function suratStats(): {
  total: number;
  completed: number;
  draft: number;
  administrasi: number;
  tables: number;
  templates: number;
} {
  const db = getDb();
  const count = (sql: string): number => (db.prepare(sql).get() as { total: number }).total;
  return {
    total: count("SELECT COUNT(*) AS total FROM surat"),
    completed: count("SELECT COUNT(*) AS total FROM surat WHERE status = 'completed'"),
    draft: count("SELECT COUNT(*) AS total FROM surat WHERE status = 'draft'"),
    administrasi: count("SELECT COUNT(*) AS total FROM administrasi"),
    tables: count("SELECT COUNT(*) AS total FROM global_tables"),
    templates: count("SELECT COUNT(*) AS total FROM templates"),
  };
}
