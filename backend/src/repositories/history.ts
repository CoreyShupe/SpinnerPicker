import { db, now } from '../db/index.js';
import type { HistoryEntry } from '../types.js';

/** Data access for pick history. */

interface HistoryRow {
  id: number;
  wheel_id: number;
  option_id: number | null;
  option_label: string;
  stats_committed: number;
  created_at: string;
}

function mapRow(row: HistoryRow): HistoryEntry {
  return {
    id: row.id,
    wheelId: row.wheel_id,
    optionId: row.option_id,
    optionLabel: row.option_label,
    statsCommitted: row.stats_committed === 1,
    createdAt: row.created_at,
  };
}

export const historyRepo = {
  listByWheel(wheelId: number, limit = 50): HistoryEntry[] {
    const rows = db
      .prepare(
        'SELECT * FROM history WHERE wheel_id = ? ORDER BY created_at DESC, id DESC LIMIT ?',
      )
      .all(wheelId, limit) as HistoryRow[];
    return rows.map(mapRow);
  },

  /** Recent option ids, newest first — used by the picker's no-repeat window. */
  recentOptionIds(wheelId: number, limit: number): number[] {
    if (limit <= 0) return [];
    const rows = db
      .prepare(
        `SELECT option_id FROM history
         WHERE wheel_id = ? AND option_id IS NOT NULL
         ORDER BY created_at DESC, id DESC LIMIT ?`,
      )
      .all(wheelId, limit) as { option_id: number }[];
    return rows.map((r) => r.option_id);
  },

  create(input: {
    wheelId: number;
    optionId: number | null;
    optionLabel: string;
  }): HistoryEntry {
    const info = db
      .prepare(
        `INSERT INTO history (wheel_id, option_id, option_label, created_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(input.wheelId, input.optionId, input.optionLabel, now());
    return this.findById(Number(info.lastInsertRowid))!;
  },

  findById(id: number): HistoryEntry | undefined {
    const row = db.prepare('SELECT * FROM history WHERE id = ?').get(id) as
      | HistoryRow
      | undefined;
    return row ? mapRow(row) : undefined;
  },

  /** The most recent spin for a wheel (its current round), or undefined. */
  latestForWheel(wheelId: number): HistoryEntry | undefined {
    const row = db
      .prepare(
        'SELECT * FROM history WHERE wheel_id = ? ORDER BY created_at DESC, id DESC LIMIT 1',
      )
      .get(wheelId) as HistoryRow | undefined;
    return row ? mapRow(row) : undefined;
  },

  /** Set the committed flag on a spin's round. Returns false if not found. */
  setCommitted(id: number, committed: boolean): boolean {
    const info = db
      .prepare('UPDATE history SET stats_committed = ? WHERE id = ?')
      .run(committed ? 1 : 0, id);
    return info.changes > 0;
  },

  delete(id: number): boolean {
    const info = db.prepare('DELETE FROM history WHERE id = ?').run(id);
    return info.changes > 0;
  },

  clearForWheel(wheelId: number): number {
    const info = db.prepare('DELETE FROM history WHERE wheel_id = ?').run(wheelId);
    return info.changes;
  },
};
