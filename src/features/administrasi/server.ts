import "server-only";
import type { z } from "zod";
import { ApiError } from "@/lib/http";
import { createId, getDb, nowIso } from "@/lib/db";
import {
  mapAdministrasi,
  mapStep,
  type AdministrasiRecord,
  type AdministrasiStep,
} from "@/lib/entities";
import type { administrasiInputSchema } from "./schema";

type AdministrasiInput = z.infer<typeof administrasiInputSchema>;

export interface AdminstrasiDetail {
  administrasi: AdministrasiRecord;
  steps: AdministrasiStep[];
}

export function listAdministrasi(): AdministrasiRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT a.*,
        (SELECT COUNT(*) FROM administrasi_steps s WHERE s.administrasi_id = a.id) AS step_count,
        (SELECT COUNT(*) FROM surat x WHERE x.administrasi_id = a.id) AS letter_count
       FROM administrasi a
       ORDER BY a.updated_at DESC`,
    )
    .all() as Array<Record<string, unknown>>;
  return rows.map(mapAdministrasi);
}

export function getAdministrasi(id: string): AdminstrasiDetail | null {
  const row = getDb().prepare("SELECT * FROM administrasi WHERE id = ?").get(id);
  if (!row) return null;

  const steps = getDb()
    .prepare(
      `SELECT s.*, t.name AS template_name
       FROM administrasi_steps s
       LEFT JOIN templates t ON t.id = s.template_id
       WHERE s.administrasi_id = ?
       ORDER BY s.position`,
    )
    .all(id)
    .map((entry) => mapStep(entry as Record<string, unknown>));

  return { administrasi: mapAdministrasi(row as Record<string, unknown>), steps };
}

export function listAdministrasiOptions(): Array<{ id: string; name: string; status: string }> {
  return getDb()
    .prepare("SELECT id, name, status FROM administrasi ORDER BY name COLLATE NOCASE")
    .all() as Array<{ id: string; name: string; status: string }>;
}

function validateReferences(input: AdministrasiInput): void {
  const db = getDb();
  if (input.dataSourceTableId) {
    const table = db.prepare("SELECT 1 FROM global_tables WHERE id = ?").get(input.dataSourceTableId);
    if (!table) throw new ApiError(422, "Sumber data tidak ditemukan.");
  }

  for (const step of input.steps) {
    const template = db.prepare("SELECT 1 FROM templates WHERE id = ?").get(step.templateId);
    if (!template) throw new ApiError(422, `Template untuk step "${step.name}" tidak ditemukan.`);
  }

  const keys = new Set<string>();
  for (const field of input.fields) {
    if (keys.has(field.key)) {
      throw new ApiError(422, `Field "${field.label}" memiliki key ganda.`);
    }
    keys.add(field.key);
  }
}

function writeSteps(administrasiId: string, input: AdministrasiInput): void {
  const db = getDb();
  db.prepare("DELETE FROM administrasi_steps WHERE administrasi_id = ?").run(administrasiId);
  const insert = db.prepare(
    "INSERT INTO administrasi_steps (id, administrasi_id, template_id, name, position) VALUES (?, ?, ?, ?, ?)",
  );
  input.steps.forEach((step, index) => {
    insert.run(step.id ?? createId("stp"), administrasiId, step.templateId, step.name, index);
  });
}

export function createAdministrasi(input: AdministrasiInput): AdminstrasiDetail {
  validateReferences(input);
  const db = getDb();
  const id = createId("adm");
  const now = nowIso();

  const transaction = db.transaction(() => {
    db.prepare(
      `INSERT INTO administrasi
        (id, name, description, status, data_source_table_id, filter, number_pattern, fields, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      input.name,
      input.description,
      input.status,
      input.dataSourceTableId,
      JSON.stringify(input.filter),
      input.numberPattern,
      JSON.stringify(input.fields),
      now,
      now,
    );
    writeSteps(id, input);
  });

  transaction();
  return getAdministrasi(id)!;
}

export function updateAdministrasi(id: string, input: AdministrasiInput): AdminstrasiDetail {
  const existing = getAdministrasi(id);
  if (!existing) throw new ApiError(404, "Administrasi tidak ditemukan.");
  validateReferences(input);

  const db = getDb();
  const transaction = db.transaction(() => {
    db.prepare(
      `UPDATE administrasi
       SET name = ?, description = ?, status = ?, data_source_table_id = ?, filter = ?,
           number_pattern = ?, fields = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      input.name,
      input.description,
      input.status,
      input.dataSourceTableId,
      JSON.stringify(input.filter),
      input.numberPattern,
      JSON.stringify(input.fields),
      nowIso(),
      id,
    );
    writeSteps(id, input);
  });

  transaction();
  return getAdministrasi(id)!;
}

export function deleteAdministrasi(id: string): void {
  const existing = getAdministrasi(id);
  if (!existing) throw new ApiError(404, "Administrasi tidak ditemukan.");

  const letters = getDb()
    .prepare("SELECT COUNT(*) AS total FROM surat WHERE administrasi_id = ?")
    .get(id) as { total: number };
  if (letters.total > 0) {
    throw new ApiError(
      409,
      `Administrasi ini memiliki ${letters.total} surat. Hapus surat terlebih dahulu melalui halaman Surat.`,
    );
  }

  getDb().prepare("DELETE FROM administrasi WHERE id = ?").run(id);
}

export function duplicateAdministrasi(id: string): AdminstrasiDetail {
  const existing = getAdministrasi(id);
  if (!existing) throw new ApiError(404, "Administrasi tidak ditemukan.");

  return createAdministrasi({
    name: `${existing.administrasi.name} (salinan)`,
    description: existing.administrasi.description,
    status: "draft",
    dataSourceTableId: existing.administrasi.dataSourceTableId,
    filter: existing.administrasi.filter,
    numberPattern: existing.administrasi.numberPattern,
    fields: existing.administrasi.fields.map((field) => ({ ...field })),
    steps: existing.steps.map((step) => ({
      name: step.name,
      templateId: step.templateId ?? "",
    })),
  });
}
