/** Slice colors. Mirrors backend/src/lib/palette.ts (backend is source of truth). */
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

/**
 * Suggest a color for the next option: cycle through the palette by count, but
 * skip any color used by the last 4 existing options so adjacent options don't
 * repeat colors. `existingColors` is in option order (oldest first).
 */
export function nextColor(existingColors: string[]): string {
  const recent = new Set(existingColors.slice(-4).map((c) => c.toLowerCase()));
  const start = existingColors.length;
  for (let i = 0; i < PALETTE.length; i++) {
    const candidate = PALETTE[(start + i) % PALETTE.length];
    if (!recent.has(candidate.toLowerCase())) return candidate;
  }
  return PALETTE[start % PALETTE.length];
}
