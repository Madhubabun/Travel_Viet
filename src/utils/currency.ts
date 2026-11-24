import type {
  AnyCurrency,
  Breakdown,
  CurrencyCode,
  CurrencyRate,
  MethodSnapshot,
  PaymentMethod,
} from '../types';
import { describeRate } from './format';

export const GST_RATE = 0.18;

export interface Quote {
  /** INR actually leaving your account */
  inr: number;
  /** foreign amount */
  amount: number;
  /** effective foreign units per ₹1 */
  perInr: number;
  breakdown?: Breakdown;
  rateLabel: string;
}

/** Fraction added on top of the base INR: markup % plus GST charged on that markup. */
export function chargeFactor(method: Pick<PaymentMethod, 'markupPct' | 'gstOnMarkup'>): number {
  const m = Math.max(0, method.markupPct) / 100;
  const gst = method.gstOnMarkup && m > 0 ? m * GST_RATE : 0;
  return m + gst;
}

/** Which per-INR rate a method uses for a currency, and whether markup applies. */
export function methodRate(
  method: PaymentMethod,
  currency: CurrencyCode,
  rates: Record<CurrencyCode, CurrencyRate>,
): { perInr: number; markupApplies: boolean; source: 'cash' | 'fixed' | 'base' } {
  const r = rates[currency];
  if (method.rateMode === 'cash') return { perInr: r.cashPerInr, markupApplies: false, source: 'cash' };
  if (method.rateMode === 'fixed') {
    const fixed = method.fixedPerInr[currency];
    if (fixed && fixed > 0) return { perInr: fixed, markupApplies: false, source: 'fixed' };
  }
  return { perInr: r.basePerInr, markupApplies: true, source: 'base' };
}

/** Foreign amount → INR paid with this method. */
export function quoteForeign(
  amount: number,
  currency: CurrencyCode,
  method: PaymentMethod,
  rates: Record<CurrencyCode, CurrencyRate>,
): Quote {
  const { perInr, markupApplies, source } = methodRate(method, currency, rates);
  const base = perInr > 0 ? amount / perInr : 0;
  let markup = 0;
  let gst = 0;
  if (markupApplies) {
    markup = (base * Math.max(0, method.markupPct)) / 100;
    gst = method.gstOnMarkup ? markup * GST_RATE : 0;
  }
  const inr = base + markup + gst;
  const effective = inr > 0 ? amount / inr : perInr;
  let rateLabel = `${describeRate(perInr, currency)} (${source === 'cash' ? 'cash' : source === 'fixed' ? 'fixed' : 'base'})`;
  if (markupApplies && method.markupPct > 0) {
    rateLabel += ` + ${method.markupPct}% markup${method.gstOnMarkup ? ' + GST' : ''}`;
  }
  return {
    inr,
    amount,
    perInr: effective,
    breakdown: markupApplies ? { base, markup, gst } : undefined,
    rateLabel,
  };
}

/** INR → how much foreign currency that buys with this method (inverse of quoteForeign). */
export function quoteInr(
  inr: number,
  currency: CurrencyCode,
  method: PaymentMethod,
  rates: Record<CurrencyCode, CurrencyRate>,
): Quote {
  const { perInr, markupApplies } = methodRate(method, currency, rates);
  const factor = markupApplies ? 1 + chargeFactor(method) : 1;
  const amount = (inr / factor) * perInr;
  // Reuse the forward quote so the breakdown and label are identical.
  const q = quoteForeign(amount, currency, method, rates);
  return { ...q, inr };
}

/** Round a foreign amount to the currency's minor unit. */
export function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function snapshotMethod(method: PaymentMethod, rateLabel: string): MethodSnapshot {
  return { id: method.id, name: method.name, color: method.color, kind: method.kind, rateLabel };
}

/** Convert an INR amount to a foreign currency at the cash rate (for display only). */
export function inrToForeignDisplay(
  inr: number,
  currency: AnyCurrency,
  rates: Record<CurrencyCode, CurrencyRate>,
): number {
  if (currency === 'INR') return inr;
  return inr * rates[currency].cashPerInr;
}

/** Natural-direction rate editing helpers (₹1 = X for weak currencies, 1 X = ₹Y for strong ones). */
export function naturalRate(perInr: number): { inverted: boolean; value: number } {
  if (perInr >= 1) return { inverted: false, value: perInr };
  return { inverted: true, value: perInr > 0 ? 1 / perInr : 0 };
}

export function fromNaturalRate(value: number, inverted: boolean): number {
  if (!(value > 0)) return 0;
  return inverted ? 1 / value : value;
}
