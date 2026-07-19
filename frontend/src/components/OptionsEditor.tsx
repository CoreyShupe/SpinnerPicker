import { useState } from 'react';
import type { Option } from '../api/types';

/**
 * Editable list of a wheel's options. Purely presentational: it raises intent
 * via callbacks; the parent performs API calls and refreshes state.
 */

interface OptionsEditorProps {
  options: Option[];
  disabled: boolean;
  onAdd: (data: { label: string; color: string; weight: number }) => void;
  onUpdate: (id: number, patch: Partial<Pick<Option, 'label' | 'color' | 'weight'>>) => void;
  onDelete: (id: number) => void;
}

const DEFAULT_NEW_COLOR = '#6366f1';

export function OptionsEditor({
  options,
  disabled,
  onAdd,
  onUpdate,
  onDelete,
}: OptionsEditorProps) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(DEFAULT_NEW_COLOR);

  const submit = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    onAdd({ label: trimmed, color, weight: 1 });
    setLabel('');
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Options</h2>
        <span className="badge">{options.length}</span>
      </div>

      <ul className="option-list">
        {options.map((opt) => (
          <li key={opt.id} className="option-row">
            <input
              type="color"
              value={opt.color}
              disabled={disabled}
              onChange={(e) => onUpdate(opt.id, { color: e.target.value })}
              aria-label={`Color for ${opt.label}`}
            />
            <input
              type="text"
              className="option-label-input"
              defaultValue={opt.label}
              disabled={disabled}
              onBlur={(e) => {
                const next = e.target.value.trim();
                if (next && next !== opt.label) onUpdate(opt.id, { label: next });
                else e.target.value = opt.label;
              }}
            />
            <label className="weight-field" title="Selection weight">
              <span>×</span>
              <input
                type="number"
                min={0.1}
                step={0.1}
                defaultValue={opt.weight}
                disabled={disabled}
                onBlur={(e) => {
                  const next = Number(e.target.value);
                  if (next > 0 && next !== opt.weight) onUpdate(opt.id, { weight: next });
                  else e.target.value = String(opt.weight);
                }}
              />
            </label>
            <button
              className="icon-btn danger"
              disabled={disabled}
              onClick={() => onDelete(opt.id)}
              aria-label={`Remove ${opt.label}`}
            >
              ✕
            </button>
          </li>
        ))}
        {options.length === 0 && <li className="empty-hint">No options yet — add one below.</li>}
      </ul>

      <div className="add-option">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
               aria-label="New option color" />
        <input
          type="text"
          placeholder="Add an option…"
          value={label}
          disabled={disabled}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button className="btn" onClick={submit} disabled={disabled || !label.trim()}>
          Add
        </button>
      </div>
    </section>
  );
}
