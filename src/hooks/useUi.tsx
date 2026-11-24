import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AnyCurrency, Stop, TabId } from '../types';

export interface StopRequest {
  /** edit an existing stop */
  stopId?: string;
  /** day for a new stop */
  dayId?: string;
  draft?: Partial<Stop>;
}

export interface ExpenseRequest {
  expenseId?: string;
  draft?: {
    title?: string;
    amount?: number;
    currency?: AnyCurrency;
    methodId?: string;
    dayId?: string;
    stopId?: string;
  };
}

interface Ui {
  tab: TabId;
  setTab: (t: TabId) => void;
  /** selected day id, or 'all' (map overview) */
  dayId: string;
  setDayId: (id: string) => void;
  /** stop the user is looking at — highlighted in the list, focused on the map */
  activeStopId: string | null;
  setActiveStopId: (id: string | null) => void;
  /** increments every time we ask the map to fly somewhere */
  mapFocusNonce: number;
  showOnMap: (stopId: string, dayId: string) => void;
  stopRequest: StopRequest | null;
  openStop: (r: StopRequest | null) => void;
  expenseRequest: ExpenseRequest | null;
  openExpense: (r: ExpenseRequest | null) => void;
  toast: (msg: string) => void;
  toastMsg: string | null;
}

const Ctx = createContext<Ui | null>(null);

export function UiProvider({ initialDayId, children }: { initialDayId: string; children: ReactNode }) {
  const [tab, setTab] = useState<TabId>('itinerary');
  const [dayId, setDayId] = useState(initialDayId);
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [mapFocusNonce, setNonce] = useState(0);
  const [stopRequest, openStop] = useState<StopRequest | null>(null);
  const [expenseRequest, openExpense] = useState<ExpenseRequest | null>(null);
  const [toastMsg, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const toast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  const showOnMap = useCallback((stopId: string, d: string) => {
    setDayId(d);
    setActiveStopId(stopId);
    setNonce((n) => n + 1);
    setTab('map');
  }, []);

  const value = useMemo<Ui>(
    () => ({
      tab,
      setTab,
      dayId,
      setDayId,
      activeStopId,
      setActiveStopId,
      mapFocusNonce,
      showOnMap,
      stopRequest,
      openStop,
      expenseRequest,
      openExpense,
      toast,
      toastMsg,
    }),
    [tab, dayId, activeStopId, mapFocusNonce, showOnMap, stopRequest, expenseRequest, toast, toastMsg],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUi(): Ui {
  const u = useContext(Ctx);
  if (!u) throw new Error('useUi outside provider');
  return u;
}
