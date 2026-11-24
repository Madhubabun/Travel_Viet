import type { AnyCurrency, CurrencyCode, CurrencyRate, PaymentMethod } from '../types';
import type { EmojiName, ToneName } from './meta';

export interface CurrencyMeta {
  code: AnyCurrency;
  name: string;
  symbol: string;
  /** symbol goes after the number (₫) */
  suffix: boolean;
  decimals: number;
  flag: string;
}

export const CURRENCY_META: Record<AnyCurrency, CurrencyMeta> = {
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', suffix: false, decimals: 2, flag: '🇮🇳' },
  VND: { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', suffix: true, decimals: 0, flag: '🇻🇳' },
  THB: { code: 'THB', name: 'Thai Baht', symbol: '฿', suffix: false, decimals: 2, flag: '🇹🇭' },
  IDR: { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', suffix: false, decimals: 0, flag: '🇮🇩' },
  MYR: { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', suffix: false, decimals: 2, flag: '🇲🇾' },
  SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', suffix: false, decimals: 2, flag: '🇸🇬' },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', suffix: false, decimals: 2, flag: '🇺🇸' },
};

export const FOREIGN_CODES: CurrencyCode[] = ['VND', 'THB', 'IDR', 'MYR', 'SGD', 'USD'];

/** Starting rates (foreign per ₹1). Refresh or edit them in the Rates tab. */
export const DEFAULT_RATES: Record<CurrencyCode, CurrencyRate> = {
  VND: { code: 'VND', cashPerInr: 302, basePerInr: 306 },
  THB: { code: 'THB', cashPerInr: 0.385, basePerInr: 0.392 },
  IDR: { code: 'IDR', cashPerInr: 186, basePerInr: 190 },
  MYR: { code: 'MYR', cashPerInr: 0.0508, basePerInr: 0.0515 },
  SGD: { code: 'SGD', cashPerInr: 0.0152, basePerInr: 0.0155 },
  USD: { code: 'USD', cashPerInr: 0.0112, basePerInr: 0.0114 },
};

export const DEFAULT_METHODS: PaymentMethod[] = [
  {
    id: 'm-cash',
    name: 'Cash',
    color: '#FF9F2E',
    kind: 'cash',
    rateMode: 'cash',
    markupPct: 0,
    gstOnMarkup: false,
    fixedPerInr: {},
  },
  {
    id: 'm-indian-card',
    name: 'Indian card',
    color: '#FF5C80',
    kind: 'card',
    rateMode: 'markup',
    markupPct: 3.5,
    gstOnMarkup: true,
    fixedPerInr: {},
  },
  {
    id: 'm-forex-zero',
    name: 'Zero-markup forex card',
    color: '#1FA698',
    kind: 'forex',
    rateMode: 'markup',
    markupPct: 0,
    gstOnMarkup: false,
    fixedPerInr: {},
  },
  {
    id: 'm-prepaid',
    name: 'Prepaid (₹)',
    color: '#3AA8DB',
    kind: 'prepaid',
    rateMode: 'inr',
    markupPct: 0,
    gstOnMarkup: false,
    fixedPerInr: {},
  },
];

export const STREET_CHIPS: { label: string; amount: number; emoji: EmojiName; tone: ToneName }[] = [
  { label: '35k Banh Mi', amount: 35_000, emoji: 'banhmi', tone: 'mango' },
  { label: '60k Coconut Coffee', amount: 60_000, emoji: 'coconut', tone: 'pink' },
  { label: '150k Boat Ride', amount: 150_000, emoji: 'boat', tone: 'sky' },
  { label: '500k Beach Dinner', amount: 500_000, emoji: 'dinner', tone: 'aqua' },
  { label: '1M Stay/Tour', amount: 1_000_000, emoji: 'tour', tone: 'lime' },
];

export const METHOD_COLORS = ['#1FA698', '#6FBF4E', '#FF9F2E', '#FF5C80', '#3AA8DB', '#8A6AD9', '#1E6B7B'];
