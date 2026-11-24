import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type { AppState, Day, Stop } from '../types';
import { loadState, saveState } from '../lib/storage';
import { buildSampleState } from '../data/sampleTrip';

type Recipe = (draft: AppState) => void;

interface Store {
  state: AppState;
  /** Mutate a fresh clone of the state; React sees a new object. */
  update: (recipe: Recipe) => void;
  replace: (next: AppState) => void;
}

const Ctx = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const latest = useRef<AppState | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    loadState().then((s) => {
      if (!alive) return;
      const initial = s ?? buildSampleState();
      latest.current = initial;
      setState(initial);
      if (!s) void saveState(initial);
    });
    return () => {
      alive = false;
    };
  }, []);

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    if (latest.current) void saveState(latest.current);
  }, []);

  const schedule = useCallback(
    (next: AppState) => {
      latest.current = next;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, 250);
    },
    [flush],
  );

  // Save immediately when the app is backgrounded.
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush();
    document.addEventListener('visibilitychange', onHide);
    let remove: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      void CapApp.addListener('pause', flush).then((h) => (remove = () => h.remove()));
    }
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      remove?.();
    };
  }, [flush]);

  const update = useCallback(
    (recipe: Recipe) => {
      setState((prev) => {
        if (!prev) return prev;
        const draft = structuredClone(prev);
        recipe(draft);
        schedule(draft);
        return draft;
      });
    },
    [schedule],
  );

  const replace = useCallback(
    (next: AppState) => {
      setState(next);
      latest.current = next;
      flush();
    },
    [flush],
  );

  const value = useMemo(() => (state ? { state, update, replace } : null), [state, update, replace]);

  if (!value) {
    return (
      <div className="flex h-full items-center justify-center bg-sand text-muted">
        <div className="animate-pulse font-semibold tracking-wide">Tide &amp; Trail</div>
      </div>
    );
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}

/* ---------- small lookup helpers ---------- */

export function findStop(state: AppState, stopId: string): { day: Day; stop: Stop; dayIndex: number; stopIndex: number } | null {
  for (let di = 0; di < state.trip.days.length; di++) {
    const day = state.trip.days[di];
    const si = day.stops.findIndex((s) => s.id === stopId);
    if (si >= 0) return { day, stop: day.stops[si], dayIndex: di, stopIndex: si };
  }
  return null;
}

export const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
