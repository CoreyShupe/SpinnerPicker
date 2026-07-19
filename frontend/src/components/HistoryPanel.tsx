import { AnimatePresence, motion } from 'framer-motion';
import type { HistoryEntry } from '../api/types';

/** Recent pick history with per-entry delete and a clear-all action. */

interface HistoryPanelProps {
  history: HistoryEntry[];
  onDelete: (id: number) => void;
  onClear: () => void;
}

export function HistoryPanel({ history, onDelete, onClear }: HistoryPanelProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>History</h2>
        {history.length > 0 && (
          <button className="link-btn" onClick={onClear}>
            Clear all
          </button>
        )}
      </div>

      <ul className="history-list">
        <AnimatePresence initial={false}>
          {history.map((entry) => (
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
