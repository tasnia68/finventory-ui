import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_HISTORY = 30;
const COMMIT_DELAY_MS = 400;

/**
 * Debounced undo/redo history for serializable state. Pass current state in and
 * call commit() (idempotent — the hook auto-debounces on state change) and
 * get back undo/redo handlers + can-undo/can-redo flags.
 *
 * Usage:
 *   const { undo, redo, canUndo, canRedo } = useUndoRedo(state, setState);
 *
 * ⌘Z / ⌘⇧Z keyboard shortcuts are wired automatically while the hook is mounted.
 */
const cloneDeep = (value) => {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

const stableSerialize = (value) => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const useUndoRedo = (state, setState, { enabled = true } = {}) => {
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const debounceRef = useRef(null);
  const lastSerializedRef = useRef(stableSerialize(state));
  const isRestoringRef = useRef(false);
  const [tick, setTick] = useState(0);

  // Commit state changes to history after a debounce window.
  useEffect(() => {
    if (!enabled) return undefined;
    if (isRestoringRef.current) {
      isRestoringRef.current = false;
      lastSerializedRef.current = stableSerialize(state);
      return undefined;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const serialized = stableSerialize(state);
      if (serialized === lastSerializedRef.current) return;
      pastRef.current = [
        ...pastRef.current.slice(-(MAX_HISTORY - 1)),
        JSON.parse(lastSerializedRef.current || 'null'),
      ];
      futureRef.current = [];
      lastSerializedRef.current = serialized;
      setTick((t) => t + 1);
    }, COMMIT_DELAY_MS);
    return () => clearTimeout(debounceRef.current);
  }, [state, enabled]);

  const undo = useCallback(() => {
    if (!pastRef.current.length) return;
    const prev = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [cloneDeep(state), ...futureRef.current.slice(0, MAX_HISTORY - 1)];
    isRestoringRef.current = true;
    setState(cloneDeep(prev));
    setTick((t) => t + 1);
  }, [state, setState]);

  const redo = useCallback(() => {
    if (!futureRef.current.length) return;
    const [next, ...rest] = futureRef.current;
    futureRef.current = rest;
    pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY - 1)), cloneDeep(state)];
    isRestoringRef.current = true;
    setState(cloneDeep(next));
    setTick((t) => t + 1);
  }, [state, setState]);

  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (event) => {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return;
      const target = event.target;
      const isEditing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isEditing) return;
      if (event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((event.key === 'z' && event.shiftKey) || event.key === 'y') {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, enabled]);

  return {
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    historySize: pastRef.current.length,
    _tick: tick,
  };
};

export default useUndoRedo;
