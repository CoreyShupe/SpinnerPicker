import { Hono } from 'hono';
import { ApiError, ok } from '../lib/errors.js';
import {
  asObject,
  optionalBoolean,
  optionalInt,
  optionalString,
  parseId,
  requireString,
} from '../lib/validation.js';
import { wheelsRepo } from '../repositories/wheels.js';
import { getWheelWithOptions, spinWheel } from '../services/wheelService.js';

/** Routes for wheels and the spin action. Mounted at /api/wheels. */
export const wheelsRouter = new Hono();

const MAX_WINDOW = 1000;

// List all wheels (each with its options).
wheelsRouter.get('/', (c) => {
  const wheels = wheelsRepo.list();
  const withOptions = wheels.map((w) => getWheelWithOptions(w.id));
  return ok(c, withOptions);
});

// Create a wheel.
wheelsRouter.post('/', async (c) => {
  const body = asObject(await c.req.json().catch(() => null));
  const name = requireString(body, 'name');
  const noRepeatWindow = optionalInt(body, 'noRepeatWindow', { min: 0, max: MAX_WINDOW }) ?? 3;
  const trackStats = optionalBoolean(body, 'trackStats') ?? false;
  const wheel = wheelsRepo.create({ name, noRepeatWindow, trackStats });
  return ok(c, getWheelWithOptions(wheel.id), 201);
});

// Read one wheel with options.
wheelsRouter.get('/:id', (c) => {
  const id = parseId(c.req.param('id'), 'wheel id');
  return ok(c, getWheelWithOptions(id));
});

// Update a wheel's name and/or no-repeat window.
wheelsRouter.patch('/:id', async (c) => {
  const id = parseId(c.req.param('id'), 'wheel id');
  const body = asObject(await c.req.json().catch(() => null));
  const name = optionalString(body, 'name');
  const noRepeatWindow = optionalInt(body, 'noRepeatWindow', { min: 0, max: MAX_WINDOW });
  const trackStats = optionalBoolean(body, 'trackStats');
  if (name === undefined && noRepeatWindow === undefined && trackStats === undefined) {
    throw ApiError.badRequest('Provide at least one of: name, noRepeatWindow, trackStats');
  }
  const updated = wheelsRepo.update(id, { name, noRepeatWindow, trackStats });
  if (!updated) throw ApiError.notFound(`Wheel ${id} not found`);
  return ok(c, getWheelWithOptions(id));
});

// Delete a wheel (cascades to options and history).
wheelsRouter.delete('/:id', (c) => {
  const id = parseId(c.req.param('id'), 'wheel id');
  const deleted = wheelsRepo.delete(id);
  if (!deleted) throw ApiError.notFound(`Wheel ${id} not found`);
  return ok(c, { id });
});

// Spin the wheel: pick an option (no-repeat aware) and record history.
wheelsRouter.post('/:id/spin', (c) => {
  const id = parseId(c.req.param('id'), 'wheel id');
  const result = spinWheel(id);
  return ok(c, result);
});
