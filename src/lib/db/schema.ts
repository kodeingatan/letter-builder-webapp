export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operator')),
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS global_tables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'table',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS global_fields (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL REFERENCES global_tables(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'number', 'date', 'select', 'boolean', 'email')),
  options TEXT NOT NULL DEFAULT '[]',
  required INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_fields_table ON global_fields(table_id, position);

CREATE TABLE IF NOT EXISTS global_records (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL REFERENCES global_tables(id) ON DELETE CASCADE,
  data TEXT NOT NULL DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_records_table ON global_records(table_id, position);

CREATE TABLE IF NOT EXISTS components (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Umum',
  description TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  table_id TEXT REFERENCES global_tables(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  page TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS template_versions (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  page TEXT NOT NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_template_versions ON template_versions(template_id, version DESC);

CREATE TABLE IF NOT EXISTS administrasi (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  data_source_table_id TEXT REFERENCES global_tables(id) ON DELETE SET NULL,
  filter TEXT NOT NULL DEFAULT '[]',
  number_pattern TEXT NOT NULL DEFAULT 'SP-{seq}/LS/{romanMonth}/{year}',
  fields TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS administrasi_steps (
  id TEXT PRIMARY KEY,
  administrasi_id TEXT NOT NULL REFERENCES administrasi(id) ON DELETE CASCADE,
  template_id TEXT REFERENCES templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_steps_administrasi ON administrasi_steps(administrasi_id, position);

CREATE TABLE IF NOT EXISTS surat (
  id TEXT PRIMARY KEY,
  administrasi_id TEXT NOT NULL REFERENCES administrasi(id) ON DELETE CASCADE,
  batch_id TEXT NOT NULL,
  record_id TEXT REFERENCES global_records(id) ON DELETE SET NULL,
  record_snapshot TEXT,
  number TEXT NOT NULL DEFAULT '',
  letter_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  data TEXT NOT NULL DEFAULT '{}',
  current_step_id TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_surat_administrasi ON surat(administrasi_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_surat_record ON surat(record_id);

CREATE TABLE IF NOT EXISTS surat_step_data (
  id TEXT PRIMARY KEY,
  surat_id TEXT NOT NULL REFERENCES surat(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  override_content TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE (surat_id, step_id)
);

CREATE TABLE IF NOT EXISTS surat_versions (
  id TEXT PRIMARY KEY,
  surat_id TEXT NOT NULL REFERENCES surat(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  snapshot TEXT NOT NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_surat_versions ON surat_versions(surat_id, version DESC);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;
