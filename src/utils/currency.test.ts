import { describe, expect, it } from 'vitest';
import { DEFAULT_METHODS, DEFAULT_RATES } from '../data/currencies';
import type { PaymentMethod } from '../types';
import { chargeFactor, quoteForeign, quoteInr } from './currency';
import { describeRate, formatMoney } from './format';
import { appendZeros, displayInput, pressKey, toInput } from './keypad';

const rates = DEFAULT_RATES;
const cash = DEFAULT_METHODS[0];
const card = DEFAULT_METHODS[1]; // 3.5% + GST
const zero = DEFAULT_METHODS[2];

describe('quoteForeign', () => {
  it('converts cash at the cash rate', () => {
    const q = quoteForeign(302_000, 'VND', cash, rates);
    expect(q.inr).toBeCloseTo(1000, 6);
    expect(q.breakdown).toBeUndefined();
  });

  it('adds markup and 18% GST on the markup for cards', () => {
    const q = quoteForeign(306_000, 'VND', card, rates);
    expect(q.breakdown!.base).toBeCloseTo(1000, 6);
    expect(q.breakdown!.markup).toBeCloseTo(35, 6);
    expect(q.breakdown!.gst).toBeCloseTo(6.3, 6);
    expect(q.inr).toBeCloseTo(1041.3, 6);
    expect(chargeFactor(card)).toBeCloseTo(0.0413, 6);
  });

  it('a 0% card pays exactly the base rate', () => {
    expect(quoteForeign(306_000, 'VND', zero, rates).inr).toBeCloseTo(1000, 6);
  });

  it('uses a fixed rate when set, else falls back to base + markup', () => {
    const fixed: PaymentMethod = {
      ...card,
      id: 'fx',
      rateMode: 'fixed',
      markupPct: 1,
      gstOnMarkup: false,
      fixedPerInr: { USD: 1 / 84 },
    };
    expect(quoteForeign(100, 'USD', fixed, rates).inr).toBeCloseTo(8400, 6);
    const vnd = quoteForeign(306_000, 'VND', fixed, rates);
    expect(vnd.inr).toBeCloseTo(1010, 6);
  });

  it('quoteInr is the inverse of quoteForeign', () => {
    for (const m of [cash, card, zero]) {
      const back = quoteInr(5000, 'VND', m, rates);
      expect(quoteForeign(back.amount, 'VND', m, rates).inr).toBeCloseTo(5000, 6);
    }
  });
});

describe('keypad', () => {
  it('k and M append thousands and millions', () => {
    let s = '';
    for (const k of ['2', '5', '0', 'k'] as const) s = pressKey(s, k, 0);
    expect(s).toBe('250000');
    expect(pressKey('1', 'M', 0)).toBe('1000000');
    expect(pressKey('1', '.', 2)).toBe('1.');
  });

  it('ignores k/M on empty, zero or decimal input', () => {
    expect(appendZeros('', 3)).toBe('');
    expect(appendZeros('0', 3)).toBe('0');
    expect(appendZeros('1.5', 3)).toBe('1.5');
  });

  it('blocks decimals for VND and limits them elsewhere', () => {
    expect(pressKey('12', '.', 0)).toBe('12');
    expect(pressKey('12', '.', 2)).toBe('12.');
    expect(pressKey('12.34', '5', 2)).toBe('12.34');
    expect(pressKey('0', '7', 0)).toBe('7');
  });

  it('formats input and round-trips values', () => {
    expect(displayInput('125000', 'en-IN')).toBe('1,25,000');
    expect(displayInput('37500000', 'en-US')).toBe('37,500,000');
    expect(toInput(1234.567, 2)).toBe('1234.57');
    expect(toInput(99_999.6, 0)).toBe('100000');
  });
});

describe('formatting', () => {
  it('uses lakh grouping for INR and international grouping for VND', () => {
    expect(formatMoney(125000, 'INR')).toBe('₹1,25,000');
    expect(formatMoney(37_500_000, 'VND')).toBe('37,500,000 ₫');
    expect(formatMoney(12.5, 'USD')).toBe('$12.5');
  });

  it('describes rates in their natural direction', () => {
    expect(describeRate(302, 'VND')).toBe('₹1 = 302 ₫');
    expect(describeRate(1 / 84, 'USD')).toBe('1 $ = ₹84');
  });
});
