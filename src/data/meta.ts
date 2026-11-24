import type { CSSProperties } from 'react';
import type { MethodKind, TabId, TimeOfDay, Vibe } from '../types';

/* ---------- Tones: one puffy colour family each ---------- */

export interface Tone {
  from: string;
  to: string;
  edge: string;
  soft: string;
  ink: string;
  on: string;
}

export const TONES = {
  aqua: { from: '#3FD3C4', to: '#1FA698', edge: '#168275', soft: '#D3F5F1', ink: '#137A6F', on: '#fff' },
  lime: { from: '#A6E38A', to: '#6FBF4E', edge: '#4E9632', soft: '#E2F8E0', ink: '#2F7A1F', on: '#1F4A12' },
  mango: { from: '#FFC870', to: '#FF9F2E', edge: '#D97F14', soft: '#FFF0D6', ink: '#9A5B00', on: '#5A3300' },
  pink: { from: '#FF8FA8', to: '#FF5C80', edge: '#D63E62', soft: '#FFE3EA', ink: '#C2255C', on: '#fff' },
  sky: { from: '#7DD3F5', to: '#3AA8DB', edge: '#2685B3', soft: '#D9F1FB', ink: '#1B6E96', on: '#fff' },
  teal: { from: '#2C8FA3', to: '#1E6B7B', edge: '#165361', soft: '#E3EFF1', ink: '#1E6B7B', on: '#fff' },
  violet: { from: '#B79BF2', to: '#8A6AD9', edge: '#6B4EB8', soft: '#EEE8FC', ink: '#5B3FA6', on: '#fff' },
  sand: { from: '#FFFFFF', to: '#F6F0E7', edge: '#E6DAC9', soft: '#F4ECE1', ink: '#5C6B73', on: '#1F292E' },
} satisfies Record<string, Tone>;

export type ToneName = keyof typeof TONES;

export function toneVars(tone: ToneName | Tone): CSSProperties {
  const t = typeof tone === 'string' ? TONES[tone] : tone;
  return {
    ['--p-from' as string]: t.from,
    ['--p-to' as string]: t.to,
    ['--p-edge' as string]: t.edge,
    ['--p-on' as string]: t.on,
  };
}

/** Build a tone from any hex colour (used for user-picked payment-method colours). */
export function toneFromHex(hex: string): Tone {
  const match = Object.values(TONES).find((t) => t.to.toLowerCase() === hex.toLowerCase());
  if (match) return match;
  return {
    from: `color-mix(in srgb, ${hex} 70%, white)`,
    to: hex,
    edge: `color-mix(in srgb, ${hex} 75%, black)`,
    soft: `color-mix(in srgb, ${hex} 16%, white)`,
    ink: `color-mix(in srgb, ${hex} 80%, black)`,
    on: '#fff',
  };
}

/* ---------- Days ---------- */

export const DAY_TONES: ToneName[] = ['aqua', 'lime', 'mango', 'pink', 'sky'];
export const dayTone = (index: number): Tone => TONES[DAY_TONES[((index % 5) + 5) % 5]];
export const dayColor = (index: number) => dayTone(index).to;

/* ---------- Tabs ---------- */

export const TAB_META: Record<TabId, { label: string; emoji: EmojiName; tone: ToneName }> = {
  itinerary: { label: 'Trip', emoji: 'trip', tone: 'aqua' },
  map: { label: 'Map', emoji: 'map', tone: 'pink' },
  calc: { label: 'Calc', emoji: 'calc', tone: 'mango' },
  wallet: { label: 'Wallet', emoji: 'wallet', tone: 'lime' },
  rates: { label: 'Rates', emoji: 'rates', tone: 'sky' },
};

/* ---------- 3D emoji (bundled in public/emoji) ---------- */

export type EmojiName =
  | 'trip' | 'map' | 'calc' | 'wallet' | 'rates' | 'sparkles'
  | 'beach' | 'nature' | 'cafe' | 'stay' | 'transit'
  | 'sunrise' | 'morning' | 'golden' | 'night'
  | 'cash' | 'card' | 'forex' | 'prepaid' | 'moneybag'
  | 'search' | 'compass' | 'pushpin' | 'camera' | 'coconut' | 'boat' | 'banhmi' | 'dinner' | 'tour'
  | 'calendar' | 'backpack' | 'palm' | 'wave' | 'chart' | 'luggage' | 'inbox' | 'outbox' | 'memo'
  | 'wastebasket' | 'pencil' | 'shell' | 'sun' | 'hourglass';

export const TIME_META: Record<TimeOfDay, { label: string; emoji: EmojiName; tone: ToneName }> = {
  sunrise: { label: 'Sunrise', emoji: 'sunrise', tone: 'pink' },
  morning: { label: 'Morning', emoji: 'morning', tone: 'mango' },
  golden: { label: 'Golden Hour', emoji: 'golden', tone: 'mango' },
  night: { label: 'Night', emoji: 'night', tone: 'violet' },
};
export const TIMES: TimeOfDay[] = ['sunrise', 'morning', 'golden', 'night'];

export const VIBE_META: Record<Vibe, { label: string; emoji: EmojiName; tone: ToneName }> = {
  beach: { label: 'Beach & Water', emoji: 'beach', tone: 'sky' },
  nature: { label: 'Nature & Trail', emoji: 'nature', tone: 'lime' },
  cafe: { label: 'Cafe & Food', emoji: 'cafe', tone: 'pink' },
  stay: { label: 'Stay', emoji: 'stay', tone: 'mango' },
  transit: { label: 'Transit', emoji: 'transit', tone: 'violet' },
};
export const VIBES: Vibe[] = ['beach', 'nature', 'cafe', 'stay', 'transit'];

export const KIND_META: Record<MethodKind, { label: string; emoji: EmojiName }> = {
  cash: { label: 'Cash', emoji: 'cash' },
  card: { label: 'Card', emoji: 'card' },
  forex: { label: 'Forex card', emoji: 'forex' },
  prepaid: { label: 'Prepaid ₹', emoji: 'prepaid' },
};

export const GROUP_META = {
  Cash: { emoji: 'cash' as EmojiName, tone: 'mango' as ToneName },
  Cards: { emoji: 'card' as EmojiName, tone: 'pink' as ToneName },
  Prepaid: { emoji: 'prepaid' as EmojiName, tone: 'sky' as ToneName },
};

/** Wallet groups: Cash vs Cards (card + forex) vs Prepaid */
export const kindGroup = (k: MethodKind): 'Cash' | 'Cards' | 'Prepaid' =>
  k === 'cash' ? 'Cash' : k === 'prepaid' ? 'Prepaid' : 'Cards';
