/**
 * Core selection algorithm: uniform random choice that avoids repeating any
 * option that was picked within the wheel's "no-repeat window".
 *
 * Rules:
 *  - `window` is how many of the most-recent picks to exclude as candidates.
 *  - If excluding the recent picks would leave no candidates (window >= number
 *    of options), we shrink the effective window to `options.length - 1` so at
 *    least one option is always eligible. This keeps single-option wheels and
 *    aggressive windows functional instead of throwing.
 *  - Selection among the eligible candidates is uniform.
 *
 * This module is pure and deterministic given an injected `random` function,
 * which keeps it unit-testable and decoupled from persistence.
 */

export interface PickableOption {
  id: number;
}

export interface PickInput<T extends PickableOption> {
  options: T[];
  /** Recent option ids, newest first. Typically `history` limited to `window`. */
  recentOptionIds: number[];
  /** No-repeat window size (>= 0). */
  window: number;
  /** Injectable RNG returning [0, 1). Defaults to Math.random. */
  random?: () => number;
}

export function pickOption<T extends PickableOption>(input: PickInput<T>): T {
  const { options, recentOptionIds, window } = input;
  const random = input.random ?? Math.random;

  if (options.length === 0) {
    throw new Error('Cannot pick from a wheel with no options');
  }
  if (options.length === 1) {
    return options[0];
  }

  // Clamp the window so at least one candidate always survives exclusion.
  const effectiveWindow = Math.min(Math.max(window, 0), options.length - 1);
  const excluded = new Set(recentOptionIds.slice(0, effectiveWindow));

  const candidates = options.filter((o) => !excluded.has(o.id));
  // Defensive fallback: should not happen given the clamp above.
  const pool = candidates.length > 0 ? candidates : options;

  return pool[Math.floor(random() * pool.length)];
}
