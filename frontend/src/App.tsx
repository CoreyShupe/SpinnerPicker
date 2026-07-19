import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, api } from './api/client';
import type {
  HistoryEntry,
  Option,
  SpinResult,
  StatsCatalog,
  WheelWithOptions,
} from './api/types';
import { ConfirmDialog } from './components/ConfirmDialog';
import { HistoryPanel } from './components/HistoryPanel';
import { OptionsEditor } from './components/OptionsEditor';
import { StatsPanel } from './components/StatsPanel';
import { Wheel } from './components/Wheel';
import { WheelSidebar } from './components/WheelSidebar';
import { rotationForIndex } from './lib/wheelGeometry';

const SPIN_DURATION_MS = 4200;

export default function App() {
  const [wheels, setWheels] = useState<WheelWithOptions[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [catalog, setCatalog] = useState<StatsCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Options panel starts collapsed for every wheel except one just created via
  // the new-wheel flow (tracked by justCreatedRef), where it opens for entry.
  const [optionsCollapsed, setOptionsCollapsed] = useState(true);
  // Picks cap is sequenced separately from the options panel so opening options
  // shrinks the picks card *first*, avoiding a transient overflow scrollbar.
  const [picksSmall, setPicksSmall] = useState(false);
  const justCreatedRef = useRef<number | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sideCollapsed, setSideCollapsed] = useState(false);

  // Pending confirmation for a permanent, destructive action (null = none).
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  /**
   * Toggle the options panel. Opening shrinks the picks card first, then expands
   * options once the picks card has settled; closing collapses options
   * immediately and lets picks grow back into the freed space.
   */
  const toggleOptions = () => {
    if (optionsCollapsed) {
      setPicksSmall(true); // shrink picks now (only ever gets smaller — no overflow)
      window.setTimeout(() => setOptionsCollapsed(false), 220);
    } else {
      setOptionsCollapsed(true);
      setPicksSmall(false);
    }
  };

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [pendingResult, setPendingResult] = useState<SpinResult | null>(null);
  const [result, setResult] = useState<Option | null>(null);

  const selected = useMemo(
    () => wheels.find((w) => w.id === selectedId) ?? null,
    [wheels, selectedId],
  );

  /**
   * Options blocked from the next spin by the no-repeat window. Mirrors the
   * backend picker: exclude the ids among the most recent `effectiveWindow`
   * picks, where the window is clamped so at least one option stays eligible.
   */
  const excludedIds = useMemo(() => {
    if (!selected) return new Set<number>();
    const effectiveWindow = Math.min(
      Math.max(selected.noRepeatWindow, 0),
      Math.max(0, selected.options.length - 1),
    );
    const recent = history
      .map((h) => h.optionId)
      .filter((id): id is number => id != null)
      .slice(0, effectiveWindow);
    return new Set(recent);
  }, [selected, history]);

  /** Wrap an API call: surface errors as a toast, never throw into render. */
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      setError(null);
      return await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Unexpected error');
      return undefined;
    }
  }, []);

  const loadWheels = useCallback(async () => {
    const data = await run(() => api.listWheels());
    if (data) setWheels(data);
    return data;
  }, [run]);

  const loadHistory = useCallback(
    async (wheelId: number) => {
      const data = await run(() => api.listHistory(wheelId));
      if (data) setHistory(data);
    },
    [run],
  );

  const loadCatalog = useCallback(
    async (wheelId: number) => {
      const data = await run(() => api.getStats(wheelId));
      if (data) setCatalog(data);
    },
    [run],
  );

  /**
   * Refresh the side panel data for a wheel. Pick history is always loaded (the
   * Picks panel is shown for every wheel); stats wheels additionally load the
   * scoreboard catalog.
   */
  const refreshSidePanel = useCallback(
    async (wheel: { id: number; trackStats: boolean }) => {
      await loadHistory(wheel.id);
      if (wheel.trackStats) await loadCatalog(wheel.id);
    },
    [loadCatalog, loadHistory],
  );

  // Initial load.
  useEffect(() => {
    (async () => {
      const data = await loadWheels();
      setLoading(false);
      if (data && data.length > 0) setSelectedId((prev) => prev ?? data[0].id);
    })();
  }, [loadWheels]);

  // Collapse the options panel whenever a wheel is entered — except one just
  // created via the new-wheel flow, which opens for immediate option entry.
  useEffect(() => {
    const isNewWheel = justCreatedRef.current != null && justCreatedRef.current === selectedId;
    justCreatedRef.current = null;
    setOptionsCollapsed(!isNewWheel);
    setPicksSmall(isNewWheel);
  }, [selectedId]);

  // Load the appropriate side panel whenever the selected wheel or its stats
  // mode changes.
  useEffect(() => {
    if (selected) {
      setResult(null);
      setHistory([]);
      setCatalog(null);
      refreshSidePanel(selected);
    } else {
      setHistory([]);
      setCatalog(null);
    }
    // Depend on trackStats so toggling it reloads the correct panel.
  }, [selectedId, selected?.trackStats, refreshSidePanel]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Spin ---------------------------------------------------------------
  const handleSpin = useCallback(async () => {
    if (!selected || spinning || selected.options.length === 0) return;
    setResult(null);
    const res = await run(() => api.spin(selected.id));
    if (!res) return;
    setPendingResult(res);
    setRotation((prev) => rotationForIndex(prev, res.optionIndex, selected.options.length));
    setSpinning(true);
  }, [selected, spinning, run]);

  const handleSpinEnd = useCallback(() => {
    setSpinning(false);
    if (pendingResult) {
      setResult(pendingResult.option);
      setPendingResult(null);
      if (selected) refreshSidePanel(selected);
    }
  }, [pendingResult, selected, refreshSidePanel]);

  // ---- Wheel CRUD ---------------------------------------------------------
  const createWheel = (name: string, trackStats: boolean) =>
    run(async () => {
      const wheel = await api.createWheel({ name, trackStats });
      await loadWheels();
      // Mark as newly created so the options panel opens for option entry.
      justCreatedRef.current = wheel.id;
      setSelectedId(wheel.id);
    });

  const toggleStats = (id: number, trackStats: boolean) =>
    run(async () => {
      await api.updateWheel(id, { trackStats });
      await loadWheels();
    });

  const renameWheel = (id: number, name: string) =>
    run(async () => {
      await api.updateWheel(id, { name });
      await loadWheels();
    });

  const changeWindow = (id: number, window: number) =>
    run(async () => {
      await api.updateWheel(id, { noRepeatWindow: window });
      await loadWheels();
    });

  const deleteWheel = (id: number) => {
    const wheel = wheels.find((w) => w.id === id);
    setConfirmState({
      title: 'Delete wheel',
      message: `Delete “${wheel?.name ?? 'this wheel'}” and all of its options, picks, and stats? This can’t be undone.`,
      confirmLabel: 'Delete wheel',
      onConfirm: () =>
        run(async () => {
          await api.deleteWheel(id);
          const data = await api.listWheels();
          setWheels(data);
          setSelectedId(data[0]?.id ?? null);
        }),
    });
  };

  // ---- Option CRUD --------------------------------------------------------
  const addOption = (data: { label: string; color: string }) =>
    selected &&
    run(async () => {
      await api.createOption(selected.id, data);
      await loadWheels();
    });

  const updateOption = (
    id: number,
    patch: Partial<Pick<Option, 'label' | 'color'>>,
  ) =>
    run(async () => {
      await api.updateOption(id, patch);
      await loadWheels();
    });

  const deleteOption = (id: number) => {
    const option = selected?.options.find((o) => o.id === id);
    setConfirmState({
      title: 'Delete option',
      message: `Delete “${option?.label ?? 'this option'}” from the wheel?`,
      confirmLabel: 'Delete',
      onConfirm: () =>
        run(async () => {
          await api.deleteOption(id);
          await loadWheels();
        }),
    });
  };

  // ---- History CRUD -------------------------------------------------------
  // Deleting picks cascades to their stats, so refresh the scoreboard too.
  const deleteHistory = (id: number) => {
    if (!selected) return;
    const wheel = selected;
    setConfirmState({
      title: 'Delete pick',
      message: 'Delete this pick from history? Any stats recorded for it are removed too.',
      confirmLabel: 'Delete',
      onConfirm: () =>
        run(async () => {
          await api.deleteHistory(id);
          await refreshSidePanel(wheel);
        }),
    });
  };

  const clearHistory = () => {
    if (!selected) return;
    const wheel = selected;
    setConfirmState({
      title: 'Clear picks',
      message: `Clear all ${history.length} pick${history.length === 1 ? '' : 's'}${
        wheel.trackStats ? ' and their recorded stats' : ''
      }? This can’t be undone.`,
      confirmLabel: 'Clear all',
      onConfirm: () =>
        run(async () => {
          await api.clearHistory(wheel.id);
          await refreshSidePanel(wheel);
        }),
    });
  };

  // ---- Users & stats ------------------------------------------------------
  const addUser = (name: string) =>
    selectedId != null &&
    run(async () => {
      await api.createUser(selectedId, name);
      await loadCatalog(selectedId);
    });

  const deleteUser = (id: number) => {
    if (selectedId == null) return;
    const wheelId = selectedId;
    const user = catalog?.users.find((u) => u.id === id);
    setConfirmState({
      title: 'Delete player',
      message: `Delete “${user?.name ?? 'this player'}” and all of their recorded stats?`,
      confirmLabel: 'Delete',
      onConfirm: () =>
        run(async () => {
          await api.deleteUser(id);
          await loadCatalog(wheelId);
        }),
    });
  };

  // This endpoint returns the fresh catalog, so we set it directly.
  const setStat = (historyId: number, userId: number, value: number | null) =>
    run(async () => {
      const next = await api.setStat(historyId, userId, value);
      setCatalog(next);
    });

  const busy = spinning;
  const showScoreboard = !!(selected?.trackStats && catalog);

  // Grid tracks are derived from what actually renders so columns stay aligned:
  // sidebar (always) · scoreboard (stats only) · stage (always) · side (when a
  // wheel is selected). Collapsed columns shrink to a thin rail.
  const cols = [
    sidebarCollapsed ? '48px' : '280px',
    showScoreboard ? 'fit-content(560px)' : null,
    'minmax(400px, 1fr)',
    selected ? (sideCollapsed ? '48px' : '340px') : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="app" style={{ ['--cols' as string]: cols }}>
      <WheelSidebar
        wheels={wheels}
        selectedId={selectedId}
        disabled={busy}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        onSelect={setSelectedId}
        onCreate={createWheel}
        onRename={renameWheel}
        onWindowChange={changeWindow}
        onToggleStats={toggleStats}
        onDelete={deleteWheel}
      />

      {showScoreboard && (
        <div className="scoreboard-column">
          <StatsPanel
            catalog={catalog}
            disabled={busy}
            onAddUser={addUser}
            onDeleteUser={deleteUser}
            onSetStat={setStat}
          />
        </div>
      )}

      <main className="stage-column">
        {error && (
          <div className="toast error" role="alert" onClick={() => setError(null)}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="placeholder">Loading…</div>
        ) : !selected ? (
          <div className="placeholder">Create a wheel to get started.</div>
        ) : (
          <>
            <Wheel
              options={selected.options}
              rotation={rotation}
              spinning={spinning}
              durationMs={SPIN_DURATION_MS}
              excludedIds={excludedIds}
              onSpinEnd={handleSpinEnd}
            />

            <button
              className="spin-btn"
              onClick={handleSpin}
              disabled={spinning || selected.options.length === 0}
            >
              {spinning ? 'Spinning…' : 'Spin'}
            </button>

            <div className="result-slot">
              <AnimatePresence mode="wait">
                {result && !spinning && (
                  <motion.div
                    key={result.id + result.label}
                    className="result-banner"
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    style={{ borderColor: result.color }}
                  >
                    <span className="result-dot" style={{ background: result.color }} />
                    <span>
                      It's <strong>{result.label}</strong>!
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </main>

      {selected &&
        (sideCollapsed ? (
          <div className="side-column rail">
            <button
              className="rail-toggle"
              onClick={() => setSideCollapsed(false)}
              title="Show options & picks"
              aria-label="Show options and picks"
            >
              ‹
            </button>
            <span className="rail-label">Options</span>
          </div>
        ) : (
          <div className="side-column">
            <div className="side-column-bar">
              <button
                className="rail-toggle in-header"
                onClick={() => setSideCollapsed(true)}
                title="Hide options & picks"
                aria-label="Hide options and picks"
              >
                ›
              </button>
            </div>
            <OptionsEditor
              options={selected.options}
              disabled={busy}
              collapsed={optionsCollapsed}
              excludedIds={excludedIds}
              onToggleCollapse={toggleOptions}
              onAdd={addOption}
              onUpdate={updateOption}
              onDelete={deleteOption}
            />
            <HistoryPanel
              history={history}
              limit={picksSmall ? 1 : 10}
              onDelete={deleteHistory}
              onClear={clearHistory}
            />
          </div>
        ))}

      {confirmState && (
        <ConfirmDialog
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          onConfirm={() => {
            confirmState.onConfirm();
            setConfirmState(null);
          }}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}
