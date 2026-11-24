/**
 * Keypad input is held as a plain digit string ("250000", "12.5").
 * These pure helpers keep the logic testable.
 */

export const MAX_INT_DIGITS = 13;

export type KeypadKey =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | '.' | 'k' | 'M' | 'back' | 'clear';

export function intDigits(s: string): number {
  return s.split('.')[0].replace(/^0+/, '').length;
}

export function pressKey(input: string, key: KeypadKey, decimals: number): string {
  switch (key) {
    case 'clear':
      return '';
    case 'back':
      return input.slice(0, -1);
    case '.': {
      if (decimals === 0 || input.includes('.')) return input;
      return input === '' ? '0.' : `${input}.`;
    }
    case 'k':
      return appendZeros(input, 3);
    case 'M':
      return appendZeros(input, 6);
    default: {
      const [intPart, frac] = input.split('.');
      if (frac !== undefined) {
        if (frac.length >= decimals) return input;
        return `${input}${key}`;
      }
      if (intPart === '0') return key; // replace leading zero
      if (intDigits(input) >= MAX_INT_DIGITS) return input;
      if (input === '' && key === '0') return '0';
      return `${input}${key}`;
    }
  }
}

/** "+000" / "+000,000": only meaningful on a whole, non-zero number. */
export function appendZeros(input: string, zeros: number): string {
  if (input === '' || input.includes('.') || Number(input) === 0) return input;
  if (intDigits(input) + zeros > MAX_INT_DIGITS) return input;
  return input + '0'.repeat(zeros);
}

export function parseInput(input: string): number {
  if (!input || input === '.') return 0;
  const n = Number(input);
  return Number.isFinite(n) ? n : 0;
}

/** Turn a number back into keypad text with at most `decimals` digits. */
export function toInput(value: number, decimals: number): string {
  if (!Number.isFinite(value) || value <= 0) return '';
  const f = 10 ** decimals;
  const rounded = Math.round(value * f) / f;
  return decimals === 0 ? String(Math.round(rounded)) : String(rounded);
}

/** Group the integer part of keypad text for display while typing. */
export function displayInput(input: string, locale: 'en-IN' | 'en-US'): string {
  if (input === '') return '0';
  const [intPart, frac] = input.split('.');
  const grouped = new Intl.NumberFormat(locale).format(Number(intPart || '0'));
  return frac !== undefined ? `${grouped}.${frac}` : grouped;
}
