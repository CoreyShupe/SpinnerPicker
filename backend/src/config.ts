import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Central runtime configuration. Every value is sourced from an environment
 * variable with a sensible local-dev default. Nothing in the codebase should
 * read `process.env` directly — import from here instead so defaults and
 * parsing live in exactly one place.
 */

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function str(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer, got "${raw}"`);
  }
  return parsed;
}

/** Resolve a possibly-relative path against the backend package root. */
function resolvePath(value: string): string {
  return isAbsolute(value) ? value : resolve(packageRoot, value);
}

const corsOrigin = str('CORS_ORIGIN', 'http://localhost:5173');

export const config = {
  host: str('HOST', '127.0.0.1'),
  port: int('PORT', 8787),
  databasePath: resolvePath(str('DATABASE_PATH', './data/spinner.db')),
  /** Parsed list of allowed origins. `*` (any single entry) means allow all. */
  corsOrigins: corsOrigin
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
} as const;
