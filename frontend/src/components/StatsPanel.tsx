import { useState } from 'react';
import type { RoundRow, StatsCatalog, User } from '../api/types';

/**
 * Per-wheel scoreboard for stats wheels. It is scoped to the *current option* —
 * the option the wheel most recently landed on — and shows only that option's
 * stat history: a value per player per spin. The most recent spin is the
 * editable "current" row; spinning again locks it and opens a new one.
 *
 * The footer "Total" sums each player's values across ALL spins of the wheel
 * (every option), so it deliberately does NOT equal the columns above it, which
 * are only this one option's slice of history.
 *
 * Left-aligned, at most ~10 rows visible before scrolling. Presentational:
 * raises intent via callbacks; the parent performs API calls.
 */

const MAX_LINES = 10;

interface StatsPanelProps {
  catalog: StatsCatalog;
  disabled: boolean;
  onAddUser: (name: string) => void;
  onDeleteUser: (id: number) => void;
  onSetStat: (historyId: number, userId: number, value: number | null) => void;
}

export function StatsPanel({
  catalog,
  disabled,
  onAddUser,
  onDeleteUser,
  onSetStat,
}: StatsPanelProps) {
  const { users, rounds, totals } = catalog;

  // rounds are newest-first; the current option is whatever the latest spin
  // landed on. The scoreboard shows only that option's slice of history.
  const latest = rounds[0];
  const currentOptionId = latest?.optionId ?? null;
  const currentLabel = latest?.optionLabel ?? null;
  const optionRounds = latest
    ? rounds
        .filter((r) =>
          currentOptionId != null ? r.optionId === currentOptionId : r.optionLabel === currentLabel,
        )
        // Hide spins with no recorded stats at all. The current (latest) round
        // is kept regardless so values can still be entered for it.
        .filter((r) => Object.keys(r.values).length > 0 || r.isLatest)
    : [];
  const visibleRounds = optionRounds.slice(0, MAX_LINES);
  const hiddenCount = optionRounds.length - visibleRounds.length;

  return (
    <section className="panel scoreboard-panel">
      <div className="panel-header">
        <h2>Scoreboard</h2>
        {currentLabel && (
          <span className="pick-pill current-option" title={currentLabel}>
            {currentLabel}
          </span>
        )}
      </div>

      <UserRoster users={users} disabled={disabled} onAdd={onAddUser} onDelete={onDeleteUser} />

      {users.length === 0 ? (
        <p className="empty-hint">Add a player to start tracking stats.</p>
      ) : !latest ? (
        <p className="empty-hint">Spin the wheel to start the first round.</p>
      ) : (
        <>
          <div className="scoreboard-scroll">
            <table className="scoreboard">
              <thead>
                <tr>
                  <th className="col-when">When</th>
                  {users.map((u) => (
                    <th key={u.id} className="col-user">
                      {u.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRounds.map((round) => (
                  <RoundLine
                    key={round.historyId}
                    round={round}
                    users={users}
                    disabled={disabled}
                    onSetStat={onSetStat}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="totals-row">
                  <td>Total · All Rounds</td>
                  {users.map((u) => (
                    <td key={u.id} className="stat-cell">
                      {formatNumber(totals[u.id] ?? 0)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
          {hiddenCount > 0 && (
            <p className="scoreboard-more">
              +{hiddenCount} older “{currentLabel}” {hiddenCount === 1 ? 'spin' : 'spins'} — scroll
              to view
            </p>
          )}
        </>
      )}
    </section>
  );
}

function UserRoster({
  users,
  disabled,
  onAdd,
  onDelete,
}: {
  users: User[];
  disabled: boolean;
  onAdd: (name: string) => void;
  onDelete: (id: number) => void;
}) {
  const [name, setName] = useState('');
  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setName('');
  };

  return (
    <div className="roster">
      <div className="roster-chips">
        {users.map((u) => (
          <span key={u.id} className="chip">
            {u.name}
            <button
              className="chip-x"
              disabled={disabled}
              onClick={() => onDelete(u.id)}
              aria-label={`Remove ${u.name}`}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="add-user">
        <input
          type="text"
          placeholder="Add player…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button className="btn" onClick={submit} disabled={!name.trim()}>
          Add
        </button>
      </div>
    </div>
  );
}

function RoundLine({
  round,
  users,
  disabled,
  onSetStat,
}: {
  round: RoundRow;
  users: User[];
  disabled: boolean;
  onSetStat: (historyId: number, userId: number, value: number | null) => void;
}) {
  // The current editable row is simply the latest spin; older rounds are locked.
  const editable = round.isLatest;
  const rowClass = editable ? 'round-row current' : 'round-row';

  return (
    <tr className={rowClass}>
      <td className="col-when">
        <span className="when-time">{formatDay(round.createdAt)}</span>
        {editable && <span className="live-dot" title="Current round" />}
      </td>
      {users.map((u) => {
        const has = Object.prototype.hasOwnProperty.call(round.values, u.id);
        const value = has ? round.values[u.id] : '';
        return (
          <td key={u.id} className="stat-cell">
            {editable ? (
              <input
                type="number"
                step="1"
                inputMode="numeric"
                className="stat-input no-spin"
                // Key on the value so external refreshes reset the field.
                key={`${round.historyId}-${u.id}-${value}`}
                defaultValue={value}
                disabled={disabled}
                onBlur={(e) => {
                  const raw = e.target.value.trim();
                  if (raw === '') {
                    if (has) onSetStat(round.historyId, u.id, null);
                    return;
                  }
                  const parsed = Number(raw);
                  if (Number.isNaN(parsed)) {
                    e.target.value = value === '' ? '' : String(value);
                    return;
                  }
                  const next = Math.round(parsed);
                  const current = has ? round.values[u.id] : null;
                  if (next !== current) onSetStat(round.historyId, u.id, next);
                }}
              />
            ) : has ? (
              formatNumber(round.values[u.id])
            ) : (
              <span className="blank">—</span>
            )}
          </td>
        );
      })}
    </tr>
  );
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
