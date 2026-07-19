import { useState } from 'react';
import type { RoundRow, StatsCatalog, User } from '../api/types';

/**
 * Per-wheel scoreboard for stats wheels: a roster manager plus the catalog of
 * rounds. The latest uncommitted round is the editable "current" row; committed
 * rounds are locked. A totals row sums each user's values across all time.
 *
 * Presentational: raises intent via callbacks, parent performs API calls.
 */

interface StatsPanelProps {
  catalog: StatsCatalog;
  disabled: boolean;
  onAddUser: (name: string) => void;
  onDeleteUser: (id: number) => void;
  onSetStat: (historyId: number, userId: number, value: number | null) => void;
  onCommit: (historyId: number) => void;
  onRollback: (historyId: number) => void;
}

export function StatsPanel({
  catalog,
  disabled,
  onAddUser,
  onDeleteUser,
  onSetStat,
  onCommit,
  onRollback,
}: StatsPanelProps) {
  const { users, rounds, totals } = catalog;

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Scoreboard</h2>
        <span className="badge">{rounds.length} rounds</span>
      </div>

      <UserRoster users={users} disabled={disabled} onAdd={onAddUser} onDelete={onDeleteUser} />

      {users.length === 0 ? (
        <p className="empty-hint">Add a user to start tracking stats.</p>
      ) : rounds.length === 0 ? (
        <p className="empty-hint">Spin the wheel to start the first round.</p>
      ) : (
        <div className="catalog-scroll">
          <table className="catalog">
            <thead>
              <tr>
                <th className="col-when">When</th>
                <th className="col-pick">Pick</th>
                {users.map((u) => (
                  <th key={u.id} className="col-user">
                    {u.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rounds.map((round) => (
                <RoundLine
                  key={round.historyId}
                  round={round}
                  users={users}
                  disabled={disabled}
                  onSetStat={onSetStat}
                  onCommit={onCommit}
                  onRollback={onRollback}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="totals-row">
                <td colSpan={2}>Total</td>
                {users.map((u) => (
                  <td key={u.id} className="num">
                    {formatNumber(totals[u.id] ?? 0)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
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
          placeholder="Add user…"
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
  onCommit,
  onRollback,
}: {
  round: RoundRow;
  users: User[];
  disabled: boolean;
  onSetStat: (historyId: number, userId: number, value: number | null) => void;
  onCommit: (historyId: number) => void;
  onRollback: (historyId: number) => void;
}) {
  // The current editable row: latest spin that hasn't been committed yet.
  const editable = round.isLatest && !round.committed;
  const rowClass = editable ? 'round-row current' : 'round-row';

  return (
    <tr className={rowClass}>
      <td className="col-when">
        {formatTime(round.createdAt)}
        {editable && <span className="live-dot" title="Current round" />}
      </td>
      <td className="col-pick" title={round.optionLabel}>
        <span className="pick-pill">{round.optionLabel}</span>
        {round.isLatest &&
          (round.committed ? (
            <button
              className="mini-btn amber"
              disabled={disabled}
              onClick={() => onRollback(round.historyId)}
            >
              Rollback
            </button>
          ) : (
            <button
              className="mini-btn"
              disabled={disabled}
              onClick={() => onCommit(round.historyId)}
            >
              Commit
            </button>
          ))}
      </td>
      {users.map((u) => {
        const has = Object.prototype.hasOwnProperty.call(round.values, u.id);
        const value = has ? round.values[u.id] : '';
        return (
          <td key={u.id} className="num">
            {editable ? (
              <input
                type="number"
                step="1"
                className="stat-input"
                // Key on the value so external refreshes reset the field.
                key={`${round.historyId}-${u.id}-${value}`}
                defaultValue={value}
                disabled={disabled}
                onBlur={(e) => {
                  const raw = e.target.value.trim();
                  const next = raw === '' ? null : Number(raw);
                  if (next !== null && Number.isNaN(next)) {
                    e.target.value = value === '' ? '' : String(value);
                    return;
                  }
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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
