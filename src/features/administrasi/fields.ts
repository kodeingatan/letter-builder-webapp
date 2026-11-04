import "server-only";
import { getDb, parseJson } from "@/lib/db";
import type { LetterField } from "@/lib/entities";

/**
 * Distinct wizard fields across every administrasi, used by the template
 * editor so `{{surat.*}}` variables are discoverable while authoring.
 */
export function listAllLetterFields(): LetterField[] {
  const rows = getDb()
    .prepare("SELECT fields FROM administrasi ORDER BY updated_at DESC")
    .all() as Array<{ fields: string }>;

  const seen = new Map<string, LetterField>();
  for (const row of rows) {
    for (const field of parseJson<LetterField[]>(row.fields, [])) {
      if (!seen.has(field.key)) seen.set(field.key, field);
    }
  }
  return Array.from(seen.values());
}
