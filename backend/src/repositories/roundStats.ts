import { db } from '../db/index.js';

/**
 * Data access for per-round stat values (round_stats). A row exists only when a
 * user has a value for that round; absence means "blank" (distinct from 0).
 */

export interface RoundStatRow {
  historyId: number;
  userId: number;
  value: number;
}

export const roundStatsRepo = {
  /** All stat values for a wheel, joined via history. Used to build the catalog. */
  valuesForWheel(wheelId: number): RoundStatRow[] {
    const rows = db
      .prepare(
        `SELECT rs.history_id AS historyId, rs.user_id AS userId, rs.value AS value
         FROM round_stats rs
         JOIN history h ON h.id = rs.history_id
         WHERE h.wheel_id = ?`,
      )
      .all(wheelId) as RoundStatRow[];
    return rows;
  },

  /** All-time sum per user for a wheel. userId -> total. */
  totalsForWheel(wheelId: number): Record<number, number> {
    const rows = db
      .prepare(
        `SELECT rs.user_id AS userId, SUM(rs.value) AS total
         FROM round_stats rs
         JOIN history h ON h.id = rs.history_id
         WHERE h.wheel_id = ?
         GROUP BY rs.user_id`,
      )
      .all(wheelId) as { userId: number; total: number }[];
    const totals: Record<number, number> = {};
    for (const r of rows) totals[r.userId] = r.total;
    return totals;
  },

  /** Set a user's value for a round (insert or update). */
  upsert(historyId: number, userId: number, value: number): void {
    db.prepare(
      `INSERT INTO round_stats (history_id, user_id, value)
       VALUES (?, ?, ?)
       ON CONFLICT (history_id, user_id) DO UPDATE SET value = excluded.value`,
    ).run(historyId, userId, value);
  },

  /** Clear a user's value for a round (makes the cell blank again). */
  deleteCell(historyId: number, userId: number): void {
    db.prepare('DELETE FROM round_stats WHERE history_id = ? AND user_id = ?').run(
      historyId,
      userId,
    );
  },
};
