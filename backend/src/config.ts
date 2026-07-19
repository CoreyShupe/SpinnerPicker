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

const LOOPBACK_TWIN: Record<string, string> = {
  localhost: '127.0.0.1',
  '127.0.0.1': 'localhost',
};

/**
 * Return the loopback twin of an origin (localhost <-> 127.0.0.1), preserving
 * scheme and port, or null if it isn't a loopback origin. We parse the URL and
 * match the *hostname exactly* rather than substring-replacing, so hosts like
 * `notlocalhost.com` — or a `localhost` sitting in a path — are never rewritten.
 */
function loopbackTwin(origin: string): string | null {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return null; // e.g. "*" or a malformed value — leave as-is.
  }
  const twinHost = LOOPBACK_TWIN[url.hostname];
  if (!twinHost) return null;
  url.hostname = twinHost;
  return url.origin; // scheme://host[:port], normalized, no path.
}

/**
 * `localhost` and `127.0.0.1` are distinct origins to a browser, so a dev server
 * reached via one is blocked if CORS only allows the other. To avoid making
 * callers list both (repeating the port), we auto-add the loopback twin of any
 * localhost/127.0.0.1 origin. Non-loopback origins (real hosts) are untouched.
 */
function withLoopbackTwins(origins: string[]): string[] {
  const out = new Set<string>();
  for (const origin of origins) {
    out.add(origin);
    const twin = loopbackTwin(origin);
    if (twin) out.add(twin);
  }
  return [...out];
}

const corsOrigin = str('CORS_ORIGIN', 'http://localhost:5173');

export const config = {
  host: str('HOST', '127.0.0.1'),
  port: int('PORT', 8787),
  databasePath: resolvePath(str('DATABASE_PATH', './data/spinner.db')),
  /**
   * Allowed CORS origins. `*` (any single entry) means allow all; otherwise a
   * comma-separated list, with localhost/127.0.0.1 twins added automatically.
   */
  corsOrigins: withLoopbackTwins(
    corsOrigin
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  ),
} as const;
