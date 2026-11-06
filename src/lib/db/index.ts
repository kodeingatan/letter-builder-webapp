import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { FIELD_TYPE_SQL, globalFieldsTableSql, SCHEMA_SQL } from "./schema";
import { seedDatabase } from "./seed";

export type Db = Database.Database;

const globalForDb = globalThis as unknown as { __letterBuilderDb?: Db };

function resolveDatabasePath(): string {
  const configured = process.env.DATABASE_PATH;
  if (configured) return path.resolve(configured);
  return path.join(process.cwd(), "data", "letter-builder.db");
}

/**
 * Older databases were created with a CHECK constraint that did not include
 * "rich_text". Since CREATE TABLE IF NOT EXISTS leaves existing tables
 * untouched, rebuild the table so every supported field type is accepted.
 */
function migrateGlobalFields(db: Db): void {
  const existing = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'global_fields'")
    .get() as { sql?: string } | undefined;
  if (!existing?.sql) return;

  const acceptedTypes = FIELD_TYPE_SQL.split(",").map((type) => type.trim());
  if (acceptedTypes.every((type) => existing.sql!.includes(type))) return;

  db.transaction(() => {
    db.exec(`
      DROP TABLE IF EXISTS global_fields_migrated;
      ${globalFieldsTableSql("global_fields_migrated")}
      INSERT INTO global_fields_migrated (id, table_id, name, label, type, options, required, position)
      SELECT id, table_id, name, label,
        CASE WHEN type IN (${FIELD_TYPE_SQL}) THEN type ELSE 'text' END,
        options, required, position
      FROM global_fields;
      DROP TABLE global_fields;
      ALTER TABLE global_fields_migrated RENAME TO global_fields;
      CREATE INDEX IF NOT EXISTS idx_fields_table ON global_fields(table_id, position);
    `);
  })();
}

function openDatabase(): Db {
  const filePath = resolveDatabasePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const db = new Database(filePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  migrateGlobalFields(db);

  const row = db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };
  if (row.count === 0) {
    seedDatabase(db);
  }

  return db;
}

/** Lazily opens a single shared connection per process. */
export function getDb(): Db {
  if (!globalForDb.__letterBuilderDb) {
    globalForDb.__letterBuilderDb = openDatabase();
  }
  return globalForDb.__letterBuilderDb;
}

export function resetDatabase(): void {
  if (globalForDb.__letterBuilderDb) {
    globalForDb.__letterBuilderDb.close();
    globalForDb.__letterBuilderDb = undefined;
  }
  const filePath = resolveDatabasePath();
  for (const suffix of ["", "-wal", "-shm"]) {
    const target = `${filePath}${suffix}`;
    if (fs.existsSync(target)) fs.rmSync(target);
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function createId(prefix: string): string {
  return `${prefix}_${globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
