import { Hono } from 'hono';
import { ApiError, ok } from '../lib/errors.js';
import { asObject, parseId, requireString } from '../lib/validation.js';
import { usersRepo } from '../repositories/users.js';
import { requireStatsWheel } from '../services/wheelService.js';

/**
 * Routes for per-wheel users (players). Listing/creating is nested under a
 * wheel; deleting addresses a user by id.
 *
 * Mounted at /api so paths are:
 *   GET/POST  /api/wheels/:wheelId/users
 *   DELETE    /api/users/:id
 */
export const usersRouter = new Hono();

// List a wheel's users.
usersRouter.get('/wheels/:wheelId/users', (c) => {
  const wheelId = parseId(c.req.param('wheelId'), 'wheel id');
  requireStatsWheel(wheelId);
  return ok(c, usersRepo.listByWheel(wheelId));
});

// Add a user to a wheel (name unique within the wheel).
usersRouter.post('/wheels/:wheelId/users', async (c) => {
  const wheelId = parseId(c.req.param('wheelId'), 'wheel id');
  requireStatsWheel(wheelId);
  const body = asObject(await c.req.json().catch(() => null));
  const name = requireString(body, 'name', 60);
  const user = usersRepo.create({ wheelId, name });
  return ok(c, user, 201);
});

// Remove a user (cascades their stat values).
usersRouter.delete('/users/:id', (c) => {
  const id = parseId(c.req.param('id'), 'user id');
  const deleted = usersRepo.delete(id);
  if (!deleted) throw ApiError.notFound(`User ${id} not found`);
  return ok(c, { id });
});
