import { AnimatePresence, motion } from 'framer-motion';
import type { HistoryEntry } from '../api/types';

/**
 * Recent pick history with per-entry delete and a clear-all action. Shown for
 * every wheel (stats or not) — the picks are always visible, separate from the
 * scoreboard. The visible count is capped by `limit`; the caller varies it with
 * available space (fewer when the options panel is expanded).
 */

interface HistoryPanelProps {
  history: HistoryEntry[];
  limit: number;
  onDelete: (id: number) => void;
  onClear: () => void;
}

export function HistoryPanel({ history, limit, onDelete, onClear }: HistoryPanelProps) {
  const visible = history.slice(0, limit);
  const hiddenCount = history.length - visible.length;

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Picks</h2>
        {history.length > 0 && (
          <button className="link-btn" onClick={onClear}>
            Clear all
          </button>
        )}
      </div>

      <ul className="history-list">
        <AnimatePresence initial={false}>
          {visible.map((entry) => (
            <motion.li
              key={entry.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="history-row"
            >
              <span className="history-label">{entry.optionLabel}</span>
              <time className="history-time">{formatTime(entry.createdAt)}</time>
              <button
                className="icon-btn"
                onClick={() => onDelete(entry.id)}
                aria-label="Delete history entry"
              >
                ✕
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
        {history.length === 0 && <li className="empty-hint">No spins yet.</li>}
      </ul>

      {hiddenCount > 0 && (
        <p className="history-more">
          +{hiddenCount} older {hiddenCount === 1 ? 'pick' : 'picks'}
        </p>
      )}
    </section>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
