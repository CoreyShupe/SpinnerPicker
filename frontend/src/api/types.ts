/** Shapes returned by the backend API. Mirrors backend/src/types.ts. */

export interface Wheel {
  id: number;
  name: string;
  noRepeatWindow: number;
  trackStats: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  wheelId: number;
  name: string;
  createdAt: string;
}

/** One catalog row: a spin (round) with each user's value. */
export interface RoundRow {
  historyId: number;
  /** Identity of the option this spin landed on; null if that option was deleted. */
  optionId: number | null;
  optionLabel: string;
  /** True for the most recent spin of the wheel — the only editable round. */
  isLatest: boolean;
  createdAt: string;
  /** userId -> value; a user absent here has no value for this round (blank). */
  values: Record<number, number>;
}

export interface StatsCatalog {
  users: User[];
  rounds: RoundRow[];
  /** userId -> all-time total. */
  totals: Record<number, number>;
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

export interface WheelWithOptions extends Wheel {
  options: Option[];
}

export interface HistoryEntry {
  id: number;
  wheelId: number;
  optionId: number | null;
  optionLabel: string;
  createdAt: string;
}

export interface SpinResult {
  option: Option;
  optionIndex: number;
}
