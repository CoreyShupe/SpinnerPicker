import { db, now } from '../db/index.js';
import type { Option } from '../types.js';

/** Data access for wheel options. */

interface OptionRow {
  id: number;
  wheel_id: number;
  label: string;
  color: string;
  weight: number;
  position: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: OptionRow): Option {
  return {
    id: row.id,
    wheelId: row.wheel_id,
    label: row.label,
    color: row.color,
    weight: row.weight,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const optionsRepo = {
  listByWheel(wheelId: number): Option[] {
    const rows = db
      .prepare('SELECT * FROM options WHERE wheel_id = ? ORDER BY position ASC, id ASC')
      .all(wheelId) as OptionRow[];
    return rows.map(mapRow);
  },

  findById(id: number): Option | undefined {
    const row = db.prepare('SELECT * FROM options WHERE id = ?').get(id) as
      | OptionRow
      | undefined;
    return row ? mapRow(row) : undefined;
  },

  create(input: {
    wheelId: number;
    label: string;
    color: string;
    weight: number;
  }): Option {
    const ts = now();
    // New options append to the end of the current ordering.
    const next = db
      .prepare('SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM options WHERE wheel_id = ?')
      .get(input.wheelId) as { pos: number };
    const info = db
      .prepare(
        `INSERT INTO options (wheel_id, label, color, weight, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(input.wheelId, input.label, input.color, input.weight, next.pos, ts, ts);
    return this.findById(Number(info.lastInsertRowid))!;
  },

  update(
    id: number,
    patch: { label?: string; color?: string; weight?: number; position?: number },
  ): Option | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;

    const label = patch.label ?? existing.label;
    const color = patch.color ?? existing.color;
    const weight = patch.weight ?? existing.weight;
    const position = patch.position ?? existing.position;
    db.prepare(
      `UPDATE options SET label = ?, color = ?, weight = ?, position = ?, updated_at = ?
       WHERE id = ?`,
    ).run(label, color, weight, position, now(), id);
    return this.findById(id);
  },

  delete(id: number): boolean {
    const info = db.prepare('DELETE FROM options WHERE id = ?').run(id);
    return info.changes > 0;
  },
};
