import { ApiError } from '../lib/errors.js';
import { historyRepo } from '../repositories/history.js';
import { roundStatsRepo } from '../repositories/roundStats.js';
import { usersRepo } from '../repositories/users.js';
import type { RoundRow, StatsCatalog } from '../types.js';
import { requireStatsWheel } from './wheelService.js';

/**
 * Use-cases for the per-user stats feature. All stat mutations funnel through
 * here so the "only the latest round is editable" and commit/rollback rules live
 * in one place rather than being scattered across routes.
 */

/** Build the full stats catalog for a wheel: roster, rounds, all-time totals. */
export function getCatalog(wheelId: number): StatsCatalog {
  requireStatsWheel(wheelId);

  const users = usersRepo.listByWheel(wheelId);
  const latest = historyRepo.latestForWheel(wheelId);
  const rawValues = roundStatsRepo.valuesForWheel(wheelId);

  // Group values by round (history id).
  const byRound = new Map<number, Record<number, number>>();
  for (const v of rawValues) {
    const bucket = byRound.get(v.historyId) ?? {};
    bucket[v.userId] = v.value;
    byRound.set(v.historyId, bucket);
  }

  // Rounds are every spin, newest first. The current (latest) round is editable.
  const spins = historyRepo.listByWheel(wheelId, 1000);
  const rounds: RoundRow[] = spins.map((spin) => ({
    historyId: spin.id,
    optionLabel: spin.optionLabel,
    committed: spin.statsCommitted,
    isLatest: latest?.id === spin.id,
    createdAt: spin.createdAt,
    values: byRound.get(spin.id) ?? {},
  }));

  return { users, rounds, totals: roundStatsRepo.totalsForWheel(wheelId) };
}

/** Resolve the round a stat edit targets and enforce that it is editable. */
function requireEditableRound(historyId: number) {
  const round = historyRepo.findById(historyId);
  if (!round) throw ApiError.notFound(`Round ${historyId} not found`);
  requireStatsWheel(round.wheelId);

  // Only the most recent spin of the wheel can be edited. Older rounds are
  // locked; to change one, roll back is not offered (it isn't the latest).
  const latest = historyRepo.latestForWheel(round.wheelId);
  if (latest?.id !== round.id) {
    throw ApiError.conflict('Only the latest round can be edited');
  }
  return round;
}

/**
 * Set (or clear, when value is null) a user's value for the latest round.
 * Editing a committed latest round implicitly reopens it for further edits.
 */
export function editCell(historyId: number, userId: number, value: number | null): StatsCatalog {
  const round = requireEditableRound(historyId);

  const user = usersRepo.findById(userId);
  if (!user || user.wheelId !== round.wheelId) {
    throw ApiError.badRequest('User does not belong to this wheel');
  }

  if (value === null) {
    roundStatsRepo.deleteCell(historyId, userId);
  } else {
    roundStatsRepo.upsert(historyId, userId, value);
  }
  return getCatalog(round.wheelId);
}

/** Commit the latest round so its running totals are locked into the catalog. */
export function commitRound(historyId: number): StatsCatalog {
  const round = requireEditableRound(historyId);
  historyRepo.setCommitted(round.id, true);
  return getCatalog(round.wheelId);
}

/** Roll back the latest round to editable. Only the latest round qualifies. */
export function rollbackRound(historyId: number): StatsCatalog {
  const round = requireEditableRound(historyId);
  historyRepo.setCommitted(round.id, false);
  return getCatalog(round.wheelId);
}
