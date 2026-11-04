import "server-only";
import { getDb, parseJson } from "@/lib/db";
import { mapAdministrasi, mapGlobalRecord, type FieldValue } from "@/lib/entities";
import { evaluateConditions } from "@/lib/documents/engine";
import type { RenderContext, RenderRecord } from "@/lib/documents/types";

export interface SourceRecordRow {
  id: string;
  label: string;
  data: Record<string, FieldValue>;
  status: "none" | "draft" | "completed";
  suratId: string | null;
}

export interface AdministrasiSource {
  administrasiName: string;
  tableId: string | null;
  tableName: string;
  fields: Array<{ name: string; label: string; type: string }>;
  rows: SourceRecordRow[];
  canCreate: boolean;
}

/** Loads the record picker data for an administrasi (create-letter dialog). */
export function getAdministrasiSource(administrasiId: string): AdministrasiSource | null {
  const row = getDb().prepare("SELECT * FROM administrasi WHERE id = ?").get(administrasiId);
  if (!row) return null;
  const administrasi = mapAdministrasi(row as Record<string, unknown>);

  const base: AdministrasiSource = {
    administrasiName: administrasi.name,
    tableId: administrasi.dataSourceTableId,
    tableName: "",
    fields: [],
    rows: [],
    canCreate: administrasi.status === "active",
  };

  if (!administrasi.dataSourceTableId) return base;

  const table = getDb()
    .prepare("SELECT id, name, slug FROM global_tables WHERE id = ?")
    .get(administrasi.dataSourceTableId) as
    | { id: string; name: string; slug: string }
    | undefined;
  if (!table) return base;

  const fields = getDb()
    .prepare("SELECT name, label, type FROM global_fields WHERE table_id = ? ORDER BY position, label")
    .all(table.id) as Array<{ name: string; label: string; type: string }>;

  const records = getDb()
    .prepare("SELECT * FROM global_records WHERE table_id = ? ORDER BY position, created_at")
    .all(table.id)
    .map((entry) => mapGlobalRecord(entry as Record<string, unknown>));

  const context: RenderContext = {
    letter: {},
    record: {},
    aliases: { [table.slug]: {} },
    sources: {},
    sourceAliases: {},
  };
  const filtered =
    administrasi.filter.length === 0
      ? records
      : records.filter((record) =>
          evaluateConditions(
            administrasi.filter,
            "all",
            context,
            [{ values: record.data as RenderRecord }],
          ),
        );

  const letters = getDb()
    .prepare(
      "SELECT id, record_id, status FROM surat WHERE administrasi_id = ? AND record_id IS NOT NULL",
    )
    .all(administrasi.id) as Array<{ id: string; record_id: string; status: string }>;
  const byRecord = new Map(letters.map((letter) => [letter.record_id, letter]));

  return {
    ...base,
    tableName: table.name,
    fields,
    rows: filtered.map((record, index) => {
      const label =
        (record.data.nama as string) ??
        (record.data.name as string) ??
        (record.data.nama_kegiatan as string) ??
        `Baris ${index + 1}`;
      const letter = byRecord.get(record.id);
      return {
        id: record.id,
        label: String(label),
        data: record.data,
        status: (letter?.status as SourceRecordRow["status"] | undefined) ?? "none",
        suratId: letter?.id ?? null,
      };
    }),
  };
}

export function parseRecordData(raw: string): Record<string, FieldValue> {
  return parseJson<Record<string, FieldValue>>(raw, {});
}
