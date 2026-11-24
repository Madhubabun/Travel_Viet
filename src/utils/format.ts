import { CURRENCY_META } from '../data/currencies';
import type { AnyCurrency } from '../types';

const inrFmt = (digits: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: digits });
const intlFmt = (digits: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits });

/** Plain grouped number: en-IN lakh grouping for INR, international for everything else. */
export function formatNumber(value: number, currency: AnyCurrency, digits?: number): string {
  const d = digits ?? CURRENCY_META[currency].decimals;
  if (!Number.isFinite(value)) return '0';
  return currency === 'INR' ? inrFmt(d).format(value) : intlFmt(d).format(value);
}

/** ₹1,25,000 · 37,500,000 ₫ · $12.50 */
export function formatMoney(value: number, currency: AnyCurrency, digits?: number): string {
  const meta = CURRENCY_META[currency];
  const n = formatNumber(Math.abs(value), currency, digits);
  const sign = value < 0 ? '−' : '';
  return meta.suffix ? `${sign}${n} ${meta.symbol}` : `${sign}${meta.symbol}${n}`;
}

/** Whole rupees for headline figures, paise only below ₹100 */
export function formatInr(value: number): string {
  return formatMoney(value, 'INR', Math.abs(value) < 100 ? 2 : 0);
}

/** Compact: 1.2M ₫, 350k ₫ */
export function formatCompact(value: number, currency: AnyCurrency): string {
  const meta = CURRENCY_META[currency];
  const abs = Math.abs(value);
  let n: string;
  if (currency === 'INR') {
    if (abs >= 1e7) n = `${trim(abs / 1e7)}Cr`;
    else if (abs >= 1e5) n = `${trim(abs / 1e5)}L`;
    else if (abs >= 1e3) n = `${trim(abs / 1e3)}k`;
    else n = formatNumber(abs, currency, 0);
  } else if (abs >= 1e9) n = `${trim(abs / 1e9)}B`;
  else if (abs >= 1e6) n = `${trim(abs / 1e6)}M`;
  else if (abs >= 1e4) n = `${trim(abs / 1e3)}k`;
  else n = formatNumber(abs, currency);
  const sign = value < 0 ? '−' : '';
  return meta.suffix ? `${sign}${n} ${meta.symbol}` : `${sign}${meta.symbol}${n}`;
}

function trim(n: number): string {
  return n >= 100 ? n.toFixed(0) : n.toFixed(1).replace(/\.0$/, '');
}

/** Rate in its natural direction: "₹1 = 302 ₫" or "1 $ = ₹87.72" */
export function describeRate(perInr: number, currency: AnyCurrency): string {
  if (currency === 'INR' || perInr <= 0) return '₹1 = ₹1';
  const meta = CURRENCY_META[currency];
  if (perInr >= 1) {
    return `₹1 = ${formatNumber(perInr, currency, 2)} ${meta.symbol}`;
  }
  return `1 ${meta.symbol} = ₹${formatNumber(1 / perInr, 'INR', 2)}`;
}

export function addDays(isoDate: string, days: number): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, (m || 1) - 1, (d || 1) + days);
}

export function formatDate(date: Date, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  return date.toLocaleDateString('en-IN', opts);
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
