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

/** Apply the schema (idempotent), run additive migrations, seed on first run. */
export function initializeDatabase(): void {
  const schema = readFileSync(resolve(here, 'schema.sql'), 'utf8');
  db.exec(schema);
  runMigrations();
  seedIfEmpty();
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

function seedIfEmpty(): void {
  const count = db.prepare('SELECT COUNT(*) AS n FROM wheels').get() as { n: number };
  if (count.n > 0) return;

  const ts = now();
  const insertWheel = db.prepare(
    `INSERT INTO wheels (name, no_repeat_window, track_stats, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const insertOption = db.prepare(
    `INSERT INTO options (wheel_id, label, color, weight, position, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertUser = db.prepare(
    'INSERT INTO users (wheel_id, name, created_at) VALUES (?, ?, ?)',
  );

  const seed = db.transaction(() => {
    // A plain pick-only wheel (no stats).
    const lunchId = Number(insertWheel.run('Lunch Roulette', 3, 0, ts, ts).lastInsertRowid);
    (
      [
        ['Tacos', '#ef4444'],
        ['Sushi', '#3b82f6'],
        ['Pizza', '#f59e0b'],
        ['Salad', '#22c55e'],
        ['Ramen', '#8b5cf6'],
        ['Burgers', '#ec4899'],
      ] as const
    ).forEach(([label, color], i) => insertOption.run(lunchId, label, color, 1, i, ts, ts));

    // A stats-tracking wheel with a starter roster.
    const gameId = Number(insertWheel.run('Game Night', 2, 1, ts, ts).lastInsertRowid);
    (
      [
        ['Chess', '#06b6d4'],
        ['Darts', '#f97316'],
        ['Pool', '#22c55e'],
        ['Cards', '#a855f7'],
      ] as const
    ).forEach(([label, color], i) => insertOption.run(gameId, label, color, 1, i, ts, ts));
    ['Alice', 'Bob'].forEach((name) => insertUser.run(gameId, name, ts));
  });

  seed();
}
