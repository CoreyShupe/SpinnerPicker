import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, api } from './api/client';
import type { HistoryEntry, Option, SpinResult, WheelWithOptions } from './api/types';
import { HistoryPanel } from './components/HistoryPanel';
import { OptionsEditor } from './components/OptionsEditor';
import { Wheel } from './components/Wheel';
import { WheelSidebar } from './components/WheelSidebar';
import { rotationForIndex } from './lib/wheelGeometry';

const SPIN_DURATION_MS = 4200;

export default function App() {
  const [wheels, setWheels] = useState<WheelWithOptions[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [pendingResult, setPendingResult] = useState<SpinResult | null>(null);
  const [result, setResult] = useState<Option | null>(null);

  const selected = useMemo(
    () => wheels.find((w) => w.id === selectedId) ?? null,
    [wheels, selectedId],
  );

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

  // Initial load.
  useEffect(() => {
    (async () => {
      const data = await loadWheels();
      setLoading(false);
      if (data && data.length > 0) setSelectedId((prev) => prev ?? data[0].id);
    })();
  }, [loadWheels]);

  // Load history whenever the selected wheel changes.
  useEffect(() => {
    if (selectedId != null) {
      setResult(null);
      loadHistory(selectedId);
    } else {
      setHistory([]);
    }
  }, [selectedId, loadHistory]);

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
      if (selectedId != null) loadHistory(selectedId);
    }
  }, [pendingResult, selectedId, loadHistory]);

  // ---- Wheel CRUD ---------------------------------------------------------
  const createWheel = (name: string) =>
    run(async () => {
      const wheel = await api.createWheel({ name });
      await loadWheels();
      setSelectedId(wheel.id);
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

  const deleteWheel = (id: number) =>
    run(async () => {
      await api.deleteWheel(id);
      const data = await api.listWheels();
      setWheels(data);
      setSelectedId(data[0]?.id ?? null);
    });

  // ---- Option CRUD --------------------------------------------------------
  const addOption = (data: { label: string; color: string; weight: number }) =>
    selected &&
    run(async () => {
      await api.createOption(selected.id, data);
      await loadWheels();
    });

  const updateOption = (
    id: number,
    patch: Partial<Pick<Option, 'label' | 'color' | 'weight'>>,
  ) =>
    run(async () => {
      await api.updateOption(id, patch);
      await loadWheels();
    });

  const deleteOption = (id: number) =>
    run(async () => {
      await api.deleteOption(id);
      await loadWheels();
    });

  // ---- History CRUD -------------------------------------------------------
  const deleteHistory = (id: number) =>
    selectedId != null &&
    run(async () => {
      await api.deleteHistory(id);
      await loadHistory(selectedId);
    });

  const clearHistory = () =>
    selectedId != null &&
    run(async () => {
      await api.clearHistory(selectedId);
      await loadHistory(selectedId);
    });

  const busy = spinning;

  return (
    <div className="app">
      <WheelSidebar
        wheels={wheels}
        selectedId={selectedId}
        disabled={busy}
        onSelect={setSelectedId}
        onCreate={createWheel}
        onRename={renameWheel}
        onWindowChange={changeWindow}
        onDelete={deleteWheel}
      />

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

      {selected && (
        <div className="side-column">
          <OptionsEditor
            options={selected.options}
            disabled={busy}
            onAdd={addOption}
            onUpdate={updateOption}
            onDelete={deleteOption}
          />
          <HistoryPanel history={history} onDelete={deleteHistory} onClear={clearHistory} />
        </div>
      )}
    </div>
  );
}
