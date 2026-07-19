import Database from 'better-sqlite3';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

/**
 * SQLite connection singleton. Import `db` anywhere that needs data access —
 * but prefer going through the repositories in src/repositories, which own all
 * SQL and the snake_case <-> camelCase mapping.
 */

const here = dirname(fileURLToPath(import.meta.url));

// Ensure the parent directory for the database file exists.
mkdirSync(dirname(config.databasePath), { recursive: true });

export const db = new Database(config.databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/** Apply the schema (idempotent) and run additive migrations. */
export function initializeDatabase(): void {
  const schema = readFileSync(resolve(here, 'schema.sql'), 'utf8');
  db.exec(schema);
  runMigrations();
}

/** ISO-8601 UTC timestamp — the single source of "now" for all writes. */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Idempotent additive migrations for databases created before a column existed.
 * `CREATE TABLE IF NOT EXISTS` never alters an existing table, so new columns
 * are added here. Add one `ensureColumn` line per additive change.
 */
function runMigrations(): void {
  ensureColumn('wheels', 'track_stats', 'INTEGER NOT NULL DEFAULT 0');
}

function ensureColumn(table: string, column: string, definition: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
