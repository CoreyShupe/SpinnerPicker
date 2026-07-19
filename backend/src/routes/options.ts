import { Hono } from 'hono';
import { ApiError, ok } from '../lib/errors.js';
import { isHexColor, nextColor } from '../lib/palette.js';
import {
  asObject,
  optionalInt,
  optionalString,
  parseId,
  requireString,
} from '../lib/validation.js';
import { optionsRepo } from '../repositories/options.js';
import { requireWheel } from '../services/wheelService.js';

/**
 * Routes for options. Creating/listing is nested under a wheel; updating and
 * deleting address an option directly by id.
 *
 * Mounted at /api so paths are:
 *   POST      /api/wheels/:wheelId/options
 *   PATCH/DEL /api/options/:id
 */
export const optionsRouter = new Hono();

const MAX_WEIGHT = 1000;

function validateColor(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (!isHexColor(value)) {
    throw ApiError.badRequest('color must be a hex value like #3b82f6');
  }
  return value;
}

// Add an option to a wheel.
optionsRouter.post('/wheels/:wheelId/options', async (c) => {
  const wheelId = parseId(c.req.param('wheelId'), 'wheel id');
  requireWheel(wheelId);

  const body = asObject(await c.req.json().catch(() => null));
  const label = requireString(body, 'label', 100);
  const weight = optionalInt(body, 'weight', { min: 1, max: MAX_WEIGHT }) ?? 1;
  const providedColor = validateColor(optionalString(body, 'color', 7));

  // Auto-assign a palette color that avoids the last few options when none given.
  const existing = optionsRepo.listByWheel(wheelId);
  const color = providedColor ?? nextColor(existing.map((o) => o.color));

  const option = optionsRepo.create({ wheelId, label, color, weight });
  return ok(c, option, 201);
});

// Update an option.
optionsRouter.patch('/options/:id', async (c) => {
  const id = parseId(c.req.param('id'), 'option id');
  const body = asObject(await c.req.json().catch(() => null));

  const label = optionalString(body, 'label', 100);
  const color = validateColor(optionalString(body, 'color', 7));
  const weight = optionalInt(body, 'weight', { min: 1, max: MAX_WEIGHT });
  const position = optionalInt(body, 'position', { min: 0, max: 100000 });

  if (label === undefined && color === undefined && weight === undefined && position === undefined) {
    throw ApiError.badRequest('Provide at least one of: label, color, weight, position');
  }

  const updated = optionsRepo.update(id, { label, color, weight, position });
  if (!updated) throw ApiError.notFound(`Option ${id} not found`);
  return ok(c, updated);
});

// Delete an option.
optionsRouter.delete('/options/:id', (c) => {
  const id = parseId(c.req.param('id'), 'option id');
  const deleted = optionsRepo.delete(id);
  if (!deleted) throw ApiError.notFound(`Option ${id} not found`);
  return ok(c, { id });
});
