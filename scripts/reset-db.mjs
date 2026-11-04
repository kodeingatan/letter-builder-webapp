#!/usr/bin/env node
/**
 * Removes the local SQLite database (and its WAL files) so the next server
 * start recreates the schema and demo workspace from scratch.
 *
 * Usage: npm run db:reset
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const configured = process.env.DATABASE_PATH;
const target = configured
  ? path.resolve(root, configured)
  : path.join(root, "data", "letter-builder.db");

let removed = 0;
for (const suffix of ["", "-wal", "-shm"]) {
  const file = `${target}${suffix}`;
  if (fs.existsSync(file)) {
    fs.rmSync(file);
    removed += 1;
    console.log(`  removed ${path.relative(root, file)}`);
  }
}

if (removed === 0) {
  console.log(`Tidak ada berkas database di ${path.relative(root, target) || target}.`);
} else {
  console.log("Database direset. Jalankan `npm run dev` untuk membuat data contoh baru.");
}
