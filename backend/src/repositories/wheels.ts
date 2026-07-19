import { db, now } from '../db/index.js';
import type { Wheel } from '../types.js';

/**
 * Data access for wheels. Repositories own all SQL and map the snake_case DB
 * rows to camelCase domain objects. Route handlers never touch the db directly.
 */

interface WheelRow {
  id: number;
  name: string;
  no_repeat_window: number;
  track_stats: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: WheelRow): Wheel {
  return {
    id: row.id,
    name: row.name,
    noRepeatWindow: row.no_repeat_window,
    trackStats: row.track_stats === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const wheelsRepo = {
  list(): Wheel[] {
    const rows = db
      .prepare('SELECT * FROM wheels ORDER BY created_at ASC')
      .all() as WheelRow[];
    return rows.map(mapRow);
  },

  findById(id: number): Wheel | undefined {
    const row = db.prepare('SELECT * FROM wheels WHERE id = ?').get(id) as
      | WheelRow
      | undefined;
    return row ? mapRow(row) : undefined;
  },

  create(input: { name: string; noRepeatWindow: number; trackStats: boolean }): Wheel {
    const ts = now();
    const info = db
      .prepare(
        `INSERT INTO wheels (name, no_repeat_window, track_stats, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(input.name, input.noRepeatWindow, input.trackStats ? 1 : 0, ts, ts);
    return this.findById(Number(info.lastInsertRowid))!;
  },

  update(
    id: number,
    patch: { name?: string; noRepeatWindow?: number; trackStats?: boolean },
  ): Wheel | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;

    const name = patch.name ?? existing.name;
    const window = patch.noRepeatWindow ?? existing.noRepeatWindow;
    const trackStats = patch.trackStats ?? existing.trackStats;
    db.prepare(
      `UPDATE wheels SET name = ?, no_repeat_window = ?, track_stats = ?, updated_at = ?
       WHERE id = ?`,
    ).run(name, window, trackStats ? 1 : 0, now(), id);
    return this.findById(id);
  },

  delete(id: number): boolean {
    const info = db.prepare('DELETE FROM wheels WHERE id = ?').run(id);
    return info.changes > 0;
  },
};
