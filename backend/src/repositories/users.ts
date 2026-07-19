import { db, now } from '../db/index.js';
import { ApiError } from '../lib/errors.js';
import type { User } from '../types.js';

/** Data access for per-wheel users (players). Name is unique within a wheel. */

interface UserRow {
  id: number;
  wheel_id: number;
  name: string;
  created_at: string;
}

function mapRow(row: UserRow): User {
  return {
    id: row.id,
    wheelId: row.wheel_id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export const usersRepo = {
  listByWheel(wheelId: number): User[] {
    const rows = db
      .prepare('SELECT * FROM users WHERE wheel_id = ? ORDER BY name COLLATE NOCASE ASC')
      .all(wheelId) as UserRow[];
    return rows.map(mapRow);
  },

  findById(id: number): User | undefined {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
    return row ? mapRow(row) : undefined;
  },

  create(input: { wheelId: number; name: string }): User {
    const ts = now();
    try {
      const info = db
        .prepare('INSERT INTO users (wheel_id, name, created_at) VALUES (?, ?, ?)')
        .run(input.wheelId, input.name, ts);
      return this.findById(Number(info.lastInsertRowid))!;
    } catch (e) {
      // UNIQUE(wheel_id, name) violation → a friendly 409.
      if ((e as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw ApiError.conflict(`A user named "${input.name}" already exists on this wheel`);
      }
      throw e;
    }
  },

  delete(id: number): boolean {
    const info = db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return info.changes > 0;
  },
};
