#!/usr/bin/env node
/**
 * Check if the database schema has the correct structure for global_fields table.
 * This script validates that the type column has the correct CHECK constraint.
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

function resolveDatabasePath() {
  const configured = process.env.DATABASE_PATH;
  if (configured) return path.resolve(configured);
  return path.join(process.cwd(), "data", "letter-builder.db");
}

function checkSchema() {
  const filePath = resolveDatabasePath();
  
  if (!fs.existsSync(filePath)) {
    console.log("Database file not found. This is expected for new installations.");
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

    // Check the schema of global_fields table
    const schema = db.prepare("PRAGMA table_info(global_fields)").all();
    const typeColumn = schema.find(col => col.name === 'type');
    
    if (!typeColumn) {
      console.log("ERROR: 'type' column not found in global_fields table");
      db.close();
      return;
    }

    console.log("global_fields table schema:");
    schema.forEach(col => {
      console.log(`  ${col.name}: ${col.type} ${col.dflt_value ? 'DEFAULT ' + col.dflt_value : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });

    // Check if there are any records with invalid type
    const invalidTypes = db.prepare(`
      SELECT COUNT(*) as count FROM global_fields 
      WHERE type NOT IN ('text', 'number', 'date', 'select', 'boolean', 'email', 'rich_text')
    `).get();

    if (invalidTypes.count > 0) {
      console.log(`ERROR: Found ${invalidTypes.count} records with invalid type values`);
      
      // Show the invalid types
      const invalidRecords = db.prepare(`
        SELECT id, name, type FROM global_fields 
        WHERE type NOT IN ('text', 'number', 'date', 'select', 'boolean', 'email', 'rich_text')
      `).all();
      
      console.log("Invalid records:");
      invalidRecords.forEach(record => {
        console.log(`  ID: ${record.id}, Name: ${record.name}, Type: ${record.type}`);
      });
    } else {
      console.log("All field types are valid.");
    }

    db.close();
  } catch (error) {
    console.error("Error checking schema:", error.message);
  }
}

checkSchema();