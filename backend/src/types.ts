/** Domain types (camelCase) returned by repositories and the API. */

export interface Wheel {
  id: number;
  name: string;
  noRepeatWindow: number;
  /** When true, the wheel tracks per-user stats; otherwise pick history only. */
  trackStats: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Option {
  id: number;
  wheelId: number;
  label: string;
  color: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryEntry {
  id: number;
  wheelId: number;
  optionId: number | null;
  optionLabel: string;
  createdAt: string;
}

/** A wheel with its options embedded — the primary read shape for the UI. */
export interface WheelWithOptions extends Wheel {
  options: Option[];
}

/** A per-wheel user (player). */
export interface User {
  id: number;
  wheelId: number;
  name: string;
  createdAt: string;
}

/**
 * One row of the stats catalog: a spin (round) with the value each user scored.
 * `values` maps userId -> number; a user absent from the map has no value for
 * this round (rendered blank, distinct from 0).
 */
export interface RoundRow {
  historyId: number;
  /** Identity of the option this spin landed on; null if that option was deleted. */
  optionId: number | null;
  optionLabel: string;
  /** True for the most recent spin of the wheel — the only editable round. */
  isLatest: boolean;
  createdAt: string;
  values: Record<number, number>;
}

/** The full stats view for a wheel: roster, catalog rows, and all-time totals. */
export interface StatsCatalog {
  users: User[];
  rounds: RoundRow[];
  /** All-time sum per user across every round. userId -> total. */
  totals: Record<number, number>;
}
