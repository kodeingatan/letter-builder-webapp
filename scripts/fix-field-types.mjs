#!/usr/bin/env node
/**
 * Fix invalid field types in the database by updating them to valid values.
 * This script handles the case where existing data has invalid type values.
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

function resolveDatabasePath() {
  const configured = process.env.DATABASE_PATH;
  if (configured) return path.resolve(configured);
  return path.join(process.cwd(), "data", "letter-builder.db");
}

function fixFieldTypes() {
  const filePath = resolveDatabasePath();
  
  if (!fs.existsSync(filePath)) {
    console.log("Database file not found.");
    return;
  }

  try {
    const db = new Database(filePath);
    
    // Check if global_fields table exists
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='global_fields'").get();
    if (!tableExists) {
      console.log("global_fields table not found.");
      db.close();
      return;
    }

    // Check for invalid field types
    const invalidTypes = db.prepare(`
      SELECT id, name, type FROM global_fields 
      WHERE type NOT IN ('text', 'number', 'date', 'select', 'boolean', 'email', 'rich_text')
    `).all();

    if (invalidTypes.length === 0) {
      console.log("No invalid field types found. Database is clean.");
      db.close();
      return;
    }

    console.log(`Found ${invalidTypes.length} fields with invalid types:`);
    invalidTypes.forEach(field => {
      console.log(`  ID: ${field.id}, Name: ${field.name}, Current Type: ${field.type}`);
    });

    // Update invalid types to 'text' as fallback
    const update = db.prepare("UPDATE global_fields SET type = ? WHERE id = ?");
    let fixedCount = 0;

    invalidTypes.forEach(field => {
      update.run('text', field.id);
      console.log(`  Fixed: ${field.name} (${field.type} -> text)`);
      fixedCount++;
    });

    console.log(`\nSuccessfully fixed ${fixedCount} field types.`);
    db.close();
    
  } catch (error) {
    console.error("Error fixing field types:", error.message);
  }
}

fixFieldTypes();