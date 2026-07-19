import { Hono } from 'hono';
import { ApiError, ok } from '../lib/errors.js';
import { optionalInt, parseId } from '../lib/validation.js';
import { historyRepo } from '../repositories/history.js';
import { requireWheel } from '../services/wheelService.js';

/**
 * Routes for pick history. Listing/clearing is nested under a wheel; deleting a
 * single entry addresses it by id.
 *
 * Mounted at /api so paths are:
 *   GET      /api/wheels/:wheelId/history?limit=50
 *   DELETE   /api/wheels/:wheelId/history       (clear all for the wheel)
 *   DELETE   /api/history/:id                   (remove one entry)
 */
export const historyRouter = new Hono();

// List history for a wheel (newest first).
historyRouter.get('/wheels/:wheelId/history', (c) => {
  const wheelId = parseId(c.req.param('wheelId'), 'wheel id');
  requireWheel(wheelId);
  const limit = optionalInt({ limit: numeric(c.req.query('limit')) }, 'limit', {
    min: 1,
    max: 500,
  }) ?? 50;
  return ok(c, historyRepo.listByWheel(wheelId, limit));
});

// Clear all history for a wheel.
historyRouter.delete('/wheels/:wheelId/history', (c) => {
  const wheelId = parseId(c.req.param('wheelId'), 'wheel id');
  requireWheel(wheelId);
  const removed = historyRepo.clearForWheel(wheelId);
  return ok(c, { removed });
});

// Delete a single history entry.
historyRouter.delete('/history/:id', (c) => {
  const id = parseId(c.req.param('id'), 'history id');
  const deleted = historyRepo.delete(id);
  if (!deleted) throw ApiError.notFound(`History entry ${id} not found`);
  return ok(c, { id });
});

/** Coerce a query string to a number (or undefined) for validation helpers. */
function numeric(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === '') return undefined;
  const n = Number(raw);
  if (Number.isNaN(n)) throw ApiError.badRequest('limit must be a number');
  return n;
}
