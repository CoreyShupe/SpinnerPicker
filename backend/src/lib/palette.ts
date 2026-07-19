/**
 * Default slice colors. Used to auto-assign a pleasant color to a new option
 * when the client doesn't supply one. Kept in sync visually with the frontend
 * palette, but the backend is the source of truth for persisted colors.
 */
export const PALETTE = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#ec4899',
  '#f43f5e',
] as const;

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isHexColor(value: string): boolean {
  return HEX_RE.test(value);
}

/** Pick a palette color by index (wraps around). */
export function colorForIndex(index: number): string {
  return PALETTE[index % PALETTE.length];
}
