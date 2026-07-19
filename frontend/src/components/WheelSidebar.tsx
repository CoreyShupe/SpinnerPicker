import { useState } from 'react';
import type { WheelWithOptions } from '../api/types';

/**
 * Left rail: switch between wheels, create new ones, and edit the selected
 * wheel's settings (name + no-repeat window).
 */

interface WheelSidebarProps {
  wheels: WheelWithOptions[];
  selectedId: number | null;
  disabled: boolean;
  onSelect: (id: number) => void;
  onCreate: (name: string, trackStats: boolean) => void;
  onRename: (id: number, name: string) => void;
  onWindowChange: (id: number, window: number) => void;
  onToggleStats: (id: number, trackStats: boolean) => void;
  onDelete: (id: number) => void;
}

export function WheelSidebar({
  wheels,
  selectedId,
  disabled,
  onSelect,
  onCreate,
  onRename,
  onWindowChange,
  onToggleStats,
  onDelete,
}: WheelSidebarProps) {
  const [newName, setNewName] = useState('');
  const [newTrackStats, setNewTrackStats] = useState(false);
  const selected = wheels.find((w) => w.id === selectedId) ?? null;

  const create = () => {
    const name = newName.trim();
    if (!name) return;
    onCreate(name, newTrackStats);
    setNewName('');
    setNewTrackStats(false);
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">🎡</span>
        <div>
          <h1>Spinner Picker</h1>
          <p className="brand-sub">Never the same twice in a row</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Wheels</h2>
        </div>
        <ul className="wheel-list">
          {wheels.map((w) => (
            <li key={w.id}>
              <button
                className={`wheel-tab ${w.id === selectedId ? 'active' : ''}`}
                onClick={() => onSelect(w.id)}
              >
                <span className="wheel-tab-name">{w.name}</span>
                <span className="badge">{w.options.length}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="add-wheel">
          <input
            type="text"
            placeholder="New wheel name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
          <button className="btn" onClick={create} disabled={!newName.trim()}>
            +
          </button>
        </div>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={newTrackStats}
            onChange={(e) => setNewTrackStats(e.target.checked)}
          />
          <span>Track per-user stats</span>
        </label>
      </div>

      {selected && (
        <div className="panel">
          <div className="panel-header">
            <h2>Settings</h2>
          </div>

          <label className="field">
            <span>Name</span>
            <input
              type="text"
              defaultValue={selected.name}
              key={`name-${selected.id}`}
              disabled={disabled}
              onBlur={(e) => {
                const next = e.target.value.trim();
                if (next && next !== selected.name) onRename(selected.id, next);
                else e.target.value = selected.name;
              }}
            />
          </label>

          <label className="field">
            <span>
              No-repeat window: <strong>{selected.noRepeatWindow}</strong>
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(0, selected.options.length - 1)}
              value={Math.min(selected.noRepeatWindow, Math.max(0, selected.options.length - 1))}
              disabled={disabled || selected.options.length < 2}
              onChange={(e) => onWindowChange(selected.id, Number(e.target.value))}
            />
            <small className="hint">
              Avoid repeating the last {selected.noRepeatWindow} pick
              {selected.noRepeatWindow === 1 ? '' : 's'}.
            </small>
          </label>

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={selected.trackStats}
              disabled={disabled}
              onChange={(e) => onToggleStats(selected.id, e.target.checked)}
            />
            <span>Track per-user stats</span>
          </label>

          <button
            className="btn danger-outline"
            disabled={disabled}
            onClick={() => onDelete(selected.id)}
          >
            Delete wheel
          </button>
        </div>
      )}
    </aside>
  );
}
