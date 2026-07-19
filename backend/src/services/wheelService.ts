import { db } from '../db/index.js';
import { ApiError } from '../lib/errors.js';
import { pickOption } from '../lib/picker.js';
import { historyRepo } from '../repositories/history.js';
import { optionsRepo } from '../repositories/options.js';
import { wheelsRepo } from '../repositories/wheels.js';
import type { HistoryEntry, Option, WheelWithOptions } from '../types.js';

/**
 * Composed use-cases that span multiple repositories. Routes call these so the
 * transactional / cross-entity logic lives in one place, not in HTTP handlers.
 */

/** Load a wheel with its options, or throw 404. */
export function getWheelWithOptions(wheelId: number): WheelWithOptions {
  const wheel = wheelsRepo.findById(wheelId);
  if (!wheel) throw ApiError.notFound(`Wheel ${wheelId} not found`);
  return { ...wheel, options: optionsRepo.listByWheel(wheelId) };
}

/** Assert a wheel exists, returning it, or throw 404. */
export function requireWheel(wheelId: number) {
  const wheel = wheelsRepo.findById(wheelId);
  if (!wheel) throw ApiError.notFound(`Wheel ${wheelId} not found`);
  return wheel;
}

/** Assert a wheel exists and tracks stats, or throw. */
export function requireStatsWheel(wheelId: number) {
  const wheel = requireWheel(wheelId);
  if (!wheel.trackStats) {
    throw ApiError.unprocessable('This wheel does not track stats');
  }
  return wheel;
}

export interface SpinResult {
  option: Option;
  /** Index of the chosen option within the wheel's ordered options. */
  optionIndex: number;
  history: HistoryEntry;
}

/**
 * Perform a spin: choose an option honoring the no-repeat window, record the
 * pick in history, and return everything the client needs to animate to it.
 * Runs in a transaction so the read of recent history and the write stay
 * consistent.
 */
export function spinWheel(wheelId: number): SpinResult {
  const run = db.transaction((): SpinResult => {
    const wheel = requireWheel(wheelId);
    const options = optionsRepo.listByWheel(wheelId);
    if (options.length === 0) {
      throw ApiError.unprocessable('Cannot spin a wheel with no options');
    }

    const recent = historyRepo.recentOptionIds(wheelId, wheel.noRepeatWindow);
    const chosen = pickOption({
      options,
      recentOptionIds: recent,
      window: wheel.noRepeatWindow,
    });

    const optionIndex = options.findIndex((o) => o.id === chosen.id);
    const history = historyRepo.create({
      wheelId,
      optionId: chosen.id,
      optionLabel: chosen.label,
    });

    return { option: chosen, optionIndex, history };
  });

  return run();
}
