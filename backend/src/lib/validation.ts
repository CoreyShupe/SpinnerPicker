import { ApiError } from './errors.js';

/**
 * Tiny hand-rolled validation helpers. We deliberately avoid a schema library:
 * the payloads here are small and explicit. Each helper throws an ApiError on
 * failure so route handlers can validate inline without try/catch noise.
 */

type Body = Record<string, unknown>;

/** Assert the parsed JSON body is a plain object. */
export function asObject(body: unknown): Body {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw ApiError.badRequest('Request body must be a JSON object');
  }
  return body as Body;
}

/** Required non-empty, trimmed string. */
export function requireString(body: Body, field: string, maxLen = 200): string {
  const value = body[field];
  if (typeof value !== 'string' || value.trim() === '') {
    throw ApiError.badRequest(`Field "${field}" is required and must be a non-empty string`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLen) {
    throw ApiError.badRequest(`Field "${field}" must be at most ${maxLen} characters`);
  }
  return trimmed;
}

/** Optional trimmed string; returns undefined when absent or null. */
export function optionalString(body: Body, field: string, maxLen = 200): string | undefined {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw ApiError.badRequest(`Field "${field}" must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLen) {
    throw ApiError.badRequest(`Field "${field}" must be at most ${maxLen} characters`);
  }
  return trimmed;
}

/** Optional boolean. Returns undefined when absent or null. */
export function optionalBoolean(body: Body, field: string): boolean | undefined {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'boolean') {
    throw ApiError.badRequest(`Field "${field}" must be a boolean`);
  }
  return value;
}

/** Optional integer within an inclusive range. Returns undefined when absent. */
export function optionalInt(
  body: Body,
  field: string,
  { min, max }: { min: number; max: number },
): number | undefined {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw ApiError.badRequest(`Field "${field}" must be an integer`);
  }
  if (value < min || value > max) {
    throw ApiError.badRequest(`Field "${field}" must be between ${min} and ${max}`);
  }
  return value;
}

/** Parse and validate a numeric path/query id. */
export function parseId(raw: string | undefined, label = 'id'): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw ApiError.badRequest(`Invalid ${label}`);
  }
  return parsed;
}
