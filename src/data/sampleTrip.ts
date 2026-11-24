import type { AppState, Day, Expense, Photo, Stop } from '../types';
import { SAMPLE_DAYS } from './sampleDays';
import samplePhotos from './samplePhotos.json';
import { DEFAULT_METHODS, DEFAULT_RATES } from './currencies';
import { quoteForeign, snapshotMethod } from '../utils/currency';
import { toIsoDate } from '../utils/format';

let counter = 0;
const sid = (p: string) => `${p}-${(++counter).toString(36)}`;

export function buildSampleState(today = new Date()): AppState {
  counter = 0;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
  const days: Day[] = SAMPLE_DAYS.map(([title, stops]) => ({
    id: sid('d'),
    title,
    stops: stops.map(
      ([name, lat, lng, time, vibe, note]): Stop => ({
        id: sid('s'),
        name,
        lat,
        lng,
        time,
        vibe,
        note,
        photos: (samplePhotos as Record<string, Photo[]>)[name],
      }),
    ),
  }));

  const rates = structuredClone(DEFAULT_RATES);
  const methods = structuredClone(DEFAULT_METHODS);
  const [cash, card, , prepaid] = methods;

  const mk = (
    title: string,
    amount: number,
    method: typeof cash,
    dayIdx: number,
    stopIdx?: number,
    hoursAgo = 0,
  ): Expense => {
    const day = days[dayIdx];
    const createdAt = new Date(today.getTime() - hoursAgo * 3600_000).toISOString();
    if (method.kind === 'prepaid') {
      return {
        id: sid('e'),
        createdAt,
        title,
        amount,
        currency: 'INR',
        inr: amount,
        perInr: 1,
        method: snapshotMethod(method, 'Paid in ₹'),
        dayId: day.id,
      };
    }
    const q = quoteForeign(amount, 'VND', method, rates);
    return {
      id: sid('e'),
      createdAt,
      title,
      amount,
      currency: 'VND',
      inr: q.inr,
      perInr: q.perInr,
      breakdown: q.breakdown,
      method: snapshotMethod(method, q.rateLabel),
      dayId: day.id,
      stopId: stopIdx !== undefined ? day.stops[stopIdx].id : undefined,
    };
  };

  const expenses: Expense[] = [
    mk('Flights BLR ⇄ Hanoi / Da Nang', 38_400, prepaid, 0, undefined, 30),
    mk('Egg coffees ×2', 70_000, cash, 0, 1, 26),
    mk('Balcony drinks on Train Street', 120_000, cash, 0, 2, 24),
    mk('Tam Coc boat for two', 300_000, cash, 2, 1, 20),
    mk('Rice-field homestay', 850_000, card, 2, 3, 18),
    mk('Kayak & lagoon tour', 1_200_000, card, 5, 0, 8),
    mk('An Bang smoothie bowls', 160_000, cash, 7, 2, 2),
  ];

  return {
    version: 1,
    trip: {
      id: sid('t'),
      title: 'Vietnam Nature & Coast',
      destination: 'Hanoi → Ninh Binh → Lan Ha Bay → Hoi An → Da Nang',
      startDate: toIsoDate(start),
      budgetInr: 150_000,
      homeForeign: 'VND',
      days,
    },
    expenses,
    rates,
    methods,
  };
}

export function buildBlankState(prev: AppState, today = new Date()): AppState {
  return {
    version: 1,
    trip: {
      id: `t-${Date.now().toString(36)}`,
      title: 'New adventure',
      destination: '',
      startDate: toIsoDate(today),
      budgetInr: 100_000,
      homeForeign: prev.trip.homeForeign,
      days: [{ id: `d-${Date.now().toString(36)}`, title: 'Arrival day', stops: [] }],
    },
    expenses: [],
    rates: prev.rates,
    methods: prev.methods,
  };
}
