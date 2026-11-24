import { Preferences } from '@capacitor/preferences';
import type { AppState } from '../types';
import { DEFAULT_METHODS, DEFAULT_RATES, FOREIGN_CODES } from '../data/currencies';

const KEY = 'tide-and-trail/state/v1';

export async function loadState(): Promise<AppState | null> {
  let raw: string | null = null;
  try {
    raw = (await Preferences.get({ key: KEY })).value;
  } catch {
    raw = null;
  }
  if (!raw) {
    try {
      raw = localStorage.getItem(KEY);
    } catch {
      raw = null;
    }
  }
  if (!raw) return null;
  try {
    return normalizeState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function saveState(state: AppState): Promise<void> {
  const raw = JSON.stringify(state);
  try {
    await Preferences.set({ key: KEY, value: raw });
  } catch {
    // fall through to localStorage
  }
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    // storage full or unavailable — Preferences copy still exists on device
  }
}

/** Validate an unknown object (from storage or an imported file) and fill in missing pieces. */
export function normalizeState(input: unknown): AppState {
  if (!input || typeof input !== 'object') throw new Error('Not a Tide & Trail backup');
  const obj = input as Partial<AppState>;
  const trip = obj.trip;
  if (!trip || typeof trip !== 'object' || !Array.isArray(trip.days)) {
    throw new Error('Backup has no trip / days');
  }
  for (const d of trip.days) {
    if (!d || typeof d.id !== 'string' || !Array.isArray(d.stops)) throw new Error('A day in the backup is malformed');
  }
  const rates = { ...structuredClone(DEFAULT_RATES), ...(obj.rates ?? {}) };
  for (const c of FOREIGN_CODES) {
    if (!(rates[c]?.cashPerInr > 0) || !(rates[c]?.basePerInr > 0)) rates[c] = structuredClone(DEFAULT_RATES[c]);
  }
  return {
    version: 1,
    trip: {
      id: trip.id ?? `t-${Date.now().toString(36)}`,
      title: trip.title ?? 'My trip',
      destination: trip.destination ?? '',
      startDate: trip.startDate ?? new Date().toISOString().slice(0, 10),
      budgetInr: Number(trip.budgetInr) || 0,
      homeForeign: trip.homeForeign && FOREIGN_CODES.includes(trip.homeForeign) ? trip.homeForeign : 'VND',
      days: trip.days,
    },
    expenses: Array.isArray(obj.expenses) ? obj.expenses : [],
    rates,
    methods: Array.isArray(obj.methods) && obj.methods.length ? obj.methods : structuredClone(DEFAULT_METHODS),
  };
}
