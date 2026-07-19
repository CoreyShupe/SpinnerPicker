import { useMemo, useState } from 'react';
import type { Option } from '../api/types';
import { nextColor } from '../lib/palette';

/**
 * Editable list of a wheel's options. Purely presentational: it raises intent
 * via callbacks; the parent performs API calls and refreshes state.
 *
 * The panel is collapsible; collapse state is owned by the parent because other
 * panels (the pick history cap) react to it. The list shows at most ~10 rows
 * before scrolling.
 */

interface OptionsEditorProps {
  options: Option[];
  disabled: boolean;
  collapsed: boolean;
  /** Option ids currently blocked by the no-repeat window (shown crossed out). */
  excludedIds: Set<number>;
  onToggleCollapse: () => void;
  onAdd: (data: { label: string; color: string; weight: number }) => void;
  onUpdate: (id: number, patch: Partial<Pick<Option, 'label' | 'color' | 'weight'>>) => void;
  onDelete: (id: number) => void;
}

export function OptionsEditor({
  options,
  disabled,
  collapsed,
  excludedIds,
  onToggleCollapse,
  onAdd,
  onUpdate,
  onDelete,
}: OptionsEditorProps) {
  const [label, setLabel] = useState('');
  // Suggested color cycles through the palette avoiding the last 4 options'
  // colors; it advances automatically as options are added. A manual pick
  // overrides it until the next option is added.
  const [colorOverride, setColorOverride] = useState<string | null>(null);
  const suggestedColor = useMemo(() => nextColor(options.map((o) => o.color)), [options]);
  const color = colorOverride ?? suggestedColor;

  const submit = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    onAdd({ label: trimmed, color, weight: 1 });
    setLabel('');
    setColorOverride(null); // fall back to the next auto-suggested color
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <button
          className="collapse-toggle"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
        >
          <span className={`chevron ${collapsed ? 'collapsed' : ''}`}>▾</span>
          <h2>Options</h2>
        </button>
        <span className="badge">{options.length}</span>
      </div>

      {!collapsed && (
        <>
          <ul className="option-list option-scroll">
            {options.map((opt) => {
              const excluded = excludedIds.has(opt.id);
              return (
                <li
                  key={opt.id}
                  className={excluded ? 'option-row excluded' : 'option-row'}
                  title={excluded ? 'Blocked by the no-repeat window this spin' : undefined}
                >
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
                  <label className="weight-field" title="Selection weight (whole number)">
                    <span>×</span>
                    <input
                      type="number"
                      className="no-spin"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      defaultValue={opt.weight}
                      disabled={disabled}
                      onBlur={(e) => {
                        const next = Math.round(Number(e.target.value));
                        if (next >= 1 && next !== opt.weight) onUpdate(opt.id, { weight: next });
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
              );
            })}
            {options.length === 0 && (
              <li className="empty-hint">No options yet — add one below.</li>
            )}
          </ul>

          <div className="add-option">
            <input type="color" value={color} onChange={(e) => setColorOverride(e.target.value)}
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
        </>
      )}
    </section>
  );
}
