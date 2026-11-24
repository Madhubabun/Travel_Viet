export type TimeOfDay = 'sunrise' | 'morning' | 'golden' | 'night';
export type Vibe = 'beach' | 'nature' | 'cafe' | 'stay' | 'transit';

export type CurrencyCode = 'VND' | 'THB' | 'IDR' | 'MYR' | 'SGD' | 'USD';
export type AnyCurrency = CurrencyCode | 'INR';

export interface Photo {
  /** ~960px thumbnail used in the app */
  thumb: string;
  /** Commons file page, for credit / licence */
  page: string;
  credit: string;
  license: string;
}

export interface Stop {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  time: TimeOfDay;
  vibe: Vibe;
  note: string;
  /** undefined = never looked up, [] = looked up, nothing found */
  photos?: Photo[];
}

export interface Day {
  id: string;
  title: string;
  stops: Stop[];
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  /** YYYY-MM-DD */
  startDate: string;
  budgetInr: number;
  /** Second currency shown next to INR in the wallet */
  homeForeign: CurrencyCode;
  days: Day[];
}

/** All rates are stored as "foreign units per ₹1" */
export interface CurrencyRate {
  code: CurrencyCode;
  cashPerInr: number;
  basePerInr: number;
  updatedAt?: string;
}

export type MethodKind = 'cash' | 'card' | 'forex' | 'prepaid';
export type RateMode = 'cash' | 'markup' | 'fixed' | 'inr';

export interface PaymentMethod {
  id: string;
  name: string;
  color: string;
  kind: MethodKind;
  rateMode: RateMode;
  markupPct: number;
  gstOnMarkup: boolean;
  /** foreign units per ₹1, used when rateMode === 'fixed' */
  fixedPerInr: Partial<Record<CurrencyCode, number>>;
}

export interface MethodSnapshot {
  id: string;
  name: string;
  color: string;
  kind: MethodKind;
  /** human-readable description of how the rate was worked out */
  rateLabel: string;
}

export interface Breakdown {
  base: number;
  markup: number;
  gst: number;
}

export interface Expense {
  id: string;
  createdAt: string;
  title: string;
  amount: number;
  currency: AnyCurrency;
  inr: number;
  /** effective foreign units per ₹1 actually paid (1 for INR) */
  perInr: number;
  method: MethodSnapshot;
  breakdown?: Breakdown;
  dayId?: string;
  stopId?: string;
}

export interface AppState {
  version: 1;
  trip: Trip;
  expenses: Expense[];
  rates: Record<CurrencyCode, CurrencyRate>;
  methods: PaymentMethod[];
}

export type TabId = 'itinerary' | 'map' | 'calc' | 'wallet' | 'rates';
