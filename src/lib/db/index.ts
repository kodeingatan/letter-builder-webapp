import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { SCHEMA_SQL } from "./schema";
import { seedDatabase } from "./seed";

export type Db = Database.Database;

const globalForDb = globalThis as unknown as { __letterBuilderDb?: Db };

function resolveDatabasePath(): string {
  const configured = process.env.DATABASE_PATH;
  if (configured) return path.resolve(configured);
  return path.join(process.cwd(), "data", "letter-builder.db");
}

function openDatabase(): Db {
  const filePath = resolveDatabasePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const db = new Database(filePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);

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
