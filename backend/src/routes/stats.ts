import { Hono } from 'hono';
import { ok } from '../lib/errors.js';
import { asObject, optionalNumber, parseId } from '../lib/validation.js';
import { commitRound, editCell, getCatalog, rollbackRound } from '../services/statsService.js';

/**
 * Routes for the stats catalog and rounds.
 *
 * Mounted at /api so paths are:
 *   GET   /api/wheels/:wheelId/stats            → full catalog (roster, rounds, totals)
 *   PUT   /api/rounds/:historyId/stats          → set/clear a user's value (latest round only)
 *   POST  /api/rounds/:historyId/commit         → commit the latest round
 *   POST  /api/rounds/:historyId/rollback       → reopen the latest committed round
 */
export const statsRouter = new Hono();

const MAX_VALUE = 1_000_000;

// Full stats catalog for a wheel.
statsRouter.get('/wheels/:wheelId/stats', (c) => {
  const wheelId = parseId(c.req.param('wheelId'), 'wheel id');
  return ok(c, getCatalog(wheelId));
});

// Set or clear one user's value for a round. `value: null` clears the cell.
statsRouter.put('/rounds/:historyId/stats', async (c) => {
  const historyId = parseId(c.req.param('historyId'), 'round id');
  const body = asObject(await c.req.json().catch(() => null));
  const userId = parseId(String(body.userId ?? ''), 'user id');
  // Explicit null clears; a number sets. `optionalNumber` returns undefined for
  // both absent and null, so distinguish null ourselves.
  const value =
    body.value === null
      ? null
      : optionalNumber(body, 'value', { min: -MAX_VALUE, max: MAX_VALUE }) ?? 0;
  return ok(c, editCell(historyId, userId, value));
});

// Commit the latest round into the catalog.
statsRouter.post('/rounds/:historyId/commit', (c) => {
  const historyId = parseId(c.req.param('historyId'), 'round id');
  return ok(c, commitRound(historyId));
});

// Reopen the latest committed round for editing.
statsRouter.post('/rounds/:historyId/rollback', (c) => {
  const historyId = parseId(c.req.param('historyId'), 'round id');
  return ok(c, rollbackRound(historyId));
});
