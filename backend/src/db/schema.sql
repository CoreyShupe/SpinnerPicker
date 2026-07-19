-- Schema for the Spinner Picker. Applied idempotently on startup.
-- Naming: snake_case columns; timestamps are ISO-8601 UTC strings.
-- Additive column changes are handled by the migration guard in db/index.ts.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS wheels (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT    NOT NULL,
  -- How many recent picks to avoid repeating.
  no_repeat_window  INTEGER NOT NULL DEFAULT 3 CHECK (no_repeat_window >= 0),
  -- 1 = wheel tracks per-user stats; 0 = plain pick history only.
  track_stats       INTEGER NOT NULL DEFAULT 0 CHECK (track_stats IN (0, 1)),
  created_at        TEXT    NOT NULL,
  updated_at        TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS options (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  wheel_id    INTEGER NOT NULL REFERENCES wheels(id) ON DELETE CASCADE,
  label       TEXT    NOT NULL,
  -- Hex color used for this slice on the wheel.
  color       TEXT    NOT NULL,
  -- Relative selection weight (>0). Larger = more likely.
  weight      REAL    NOT NULL DEFAULT 1 CHECK (weight > 0),
  -- Display/order position within the wheel.
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_options_wheel ON options(wheel_id, position);

CREATE TABLE IF NOT EXISTS history (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  wheel_id      INTEGER NOT NULL REFERENCES wheels(id) ON DELETE CASCADE,
  -- Nullable so history survives option deletion; label is snapshotted.
  option_id     INTEGER REFERENCES options(id) ON DELETE SET NULL,
  option_label  TEXT    NOT NULL,
  created_at    TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_history_wheel ON history(wheel_id, created_at DESC);

-- Per-wheel roster of users. Name is unique within a wheel.
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  wheel_id    INTEGER NOT NULL REFERENCES wheels(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL,
  created_at  TEXT    NOT NULL,
  UNIQUE (wheel_id, name)
);

CREATE INDEX IF NOT EXISTS idx_users_wheel ON users(wheel_id, name);

-- One numeric stat value per (round, user). A round is a history/spin entry.
-- A missing row means "no value" (rendered blank), which is distinct from 0.
CREATE TABLE IF NOT EXISTS round_stats (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  history_id  INTEGER NOT NULL REFERENCES history(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value       REAL    NOT NULL DEFAULT 0,
  UNIQUE (history_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_round_stats_history ON round_stats(history_id);
