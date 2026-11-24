import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowDownUp, Delete } from 'lucide-react';
import { useStore } from '../hooks/useAppStore';
import { useUi } from '../hooks/useUi';
import { CURRENCY_META, FOREIGN_CODES, STREET_CHIPS } from '../data/currencies';
import { KIND_META, TONES, toneFromHex, toneVars, type ToneName } from '../data/meta';
import { quoteForeign, quoteInr, roundTo, type Quote } from '../utils/currency';
import { formatMoney, formatNumber } from '../utils/format';
import { displayInput, parseInput, pressKey, toInput, type KeypadKey } from '../utils/keypad';
import type { CurrencyCode } from '../types';
import { Chip, Emoji, cx } from './ui';

const PREF_KEY = 'tide-and-trail/calc';

function loadPrefs(): { currency?: CurrencyCode; methodId?: string } {
  try {
    return JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export default function CurrencyCalculator() {
  const { state } = useStore();
  const ui = useUi();
  const prefs = useMemo(loadPrefs, []);
  const [currency, setCurrency] = useState<CurrencyCode>(prefs.currency ?? state.trip.homeForeign ?? 'VND');
  const [direction, setDirection] = useState<'foreign' | 'inr'>('foreign');
  const [input, setInput] = useState('');

  const methods = state.methods.filter((m) => m.kind !== 'prepaid');
  const [methodId, setMethodId] = useState(prefs.methodId ?? methods[0]?.id ?? '');
  const method = methods.find((m) => m.id === methodId) ?? methods[0];

  useEffect(() => {
    localStorage.setItem(PREF_KEY, JSON.stringify({ currency, methodId }));
  }, [currency, methodId]);

  const meta = CURRENCY_META[currency];
  const inputDecimals = direction === 'foreign' ? meta.decimals : 2;
  const value = parseInput(input);

  const quotes = useMemo(() => {
    const map = new Map<string, Quote>();
    for (const m of methods) {
      map.set(m.id, direction === 'foreign' ? quoteForeign(value, currency, m, state.rates) : quoteInr(value, currency, m, state.rates));
    }
    return map;
  }, [methods, value, currency, direction, state.rates]);

  const q = method ? quotes.get(method.id) : undefined;
  const cheapestId = useMemo(() => {
    if (value <= 0) return null;
    let best: string | null = null;
    let bestScore = direction === 'foreign' ? Infinity : -Infinity;
    for (const [id, qt] of quotes) {
      const score = direction === 'foreign' ? qt.inr : qt.amount;
      if (direction === 'foreign' ? score < bestScore - 1e-9 : score > bestScore + 1e-9) {
        bestScore = score;
        best = id;
      }
    }
    return best;
  }, [quotes, value, direction]);

  const press = (k: KeypadKey) => setInput((s) => pressKey(s, k, inputDecimals));

  const flip = () => {
    if (q && value > 0) setInput(direction === 'foreign' ? toInput(q.inr, 2) : toInput(q.amount, meta.decimals));
    setDirection((d) => (d === 'foreign' ? 'inr' : 'foreign'));
  };

  const shown = displayInput(input, direction === 'inr' ? 'en-IN' : 'en-US');
  const foreignAmount = q ? roundTo(q.amount, meta.decimals) : 0;

  const log = () => {
    if (!q || value <= 0 || !method) return;
    ui.openExpense({ draft: { amount: foreignAmount, currency, methodId: method.id } });
  };

  return (
    <div className="scroll-area h-full px-3 pt-[calc(10px+var(--sat))] pb-tabbar">
      {/* Currency switcher */}
      <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 py-1">
        {FOREIGN_CODES.map((c) => (
          <Chip
            key={c}
            tone="mango"
            active={c === currency}
            onClick={() => {
              setCurrency(c);
              setInput('');
            }}
          >
            <span className="text-[13px]">{CURRENCY_META[c].flag}</span> {c}
          </Chip>
        ))}
      </div>

      {/* Display */}
      <div
        className="relative mt-2 overflow-hidden rounded-[22px] px-4 py-3 text-white"
        style={{
          background: 'linear-gradient(135deg,#1E6B7B 0%,#1FA698 60%,#3FD3C4 100%)',
          boxShadow: '0 14px 30px rgb(31 166 152 / 0.35), inset 0 1px 0 rgb(255 255 255 / 0.3)',
        }}
      >
        <div className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
        <div className="flex items-center justify-between text-[12px] font-semibold text-white/80">
          <span>{direction === 'foreign' ? `You pay in ${currency}` : 'You spend in ₹'}</span>
          <button
            type="button"
            onClick={flip}
            aria-label="Swap direction"
            className="flex items-center gap-1 rounded-full bg-white/18 px-2.5 py-1 text-[11px] font-bold text-white active:scale-90"
          >
            <ArrowDownUp size={12} /> {direction === 'foreign' ? `${currency} → ₹` : `₹ → ${currency}`}
          </button>
        </div>
        <div className="num mt-1 truncate text-[28px] leading-tight font-semibold">
          {direction === 'foreign' ? (meta.suffix ? `${shown} ${meta.symbol}` : `${meta.symbol}${shown}`) : `₹${shown}`}
        </div>
        <div className="num truncate text-[18px] font-semibold text-[#FFE08A]">
          ={' '}
          {q
            ? direction === 'foreign'
              ? formatMoney(q.inr, 'INR', 2)
              : formatMoney(q.amount, currency)
            : '—'}
        </div>
        {q && value > 0 && (
          <div className="mt-1 text-[11px] leading-snug text-white/80">
            {q.breakdown && q.breakdown.markup > 0
              ? `₹${formatNumber(q.breakdown.base, 'INR', 2)} + ₹${formatNumber(q.breakdown.markup, 'INR', 2)} markup${q.breakdown.gst > 0 ? ` + ₹${formatNumber(q.breakdown.gst, 'INR', 2)} GST` : ''}`
              : q.rateLabel}
          </div>
        )}
      </div>

      {/* Methods compared */}
      <div className="no-scrollbar -mx-3 mt-2.5 flex gap-2 overflow-x-auto px-3 pt-1 pb-2">
        {methods.map((m) => {
          const qt = quotes.get(m.id)!;
          const sel = m.id === method?.id;
          const cheap = m.id === cheapestId && methods.length > 1;
          const tone = toneFromHex(m.color);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethodId(m.id)}
              className={cx('relative flex w-[92px] shrink-0 flex-col items-center rounded-[16px] px-1.5 py-2 transition active:scale-95', !sel && 'glass')}
              style={
                sel
                  ? { background: tone.soft, boxShadow: `0 0 0 2px ${tone.to}, 0 8px 18px rgb(31 41 46 / 0.1)` }
                  : cheap
                    ? { boxShadow: `0 0 0 2px ${TONES.lime.to}, 0 8px 18px rgb(111 191 78 / 0.3)` }
                    : undefined
              }
            >
              {cheap && (
                <span className="puff absolute -top-1.5 rounded-full px-1.5 text-[9.5px] font-bold" style={toneVars('lime')}>
                  cheapest
                </span>
              )}
              <Emoji name={KIND_META[m.kind].emoji} size={22} />
              <span className="mt-0.5 w-full truncate text-center text-[11px] font-semibold">{m.name}</span>
              <span className="num text-[12px] font-semibold" style={{ color: tone.ink }}>
                {value > 0 ? (direction === 'foreign' ? formatMoney(qt.inr, 'INR', 0) : formatMoney(qt.amount, currency)) : '—'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Street-price chips */}
      {currency === 'VND' && direction === 'foreign' && (
        <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1">
          {STREET_CHIPS.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => setInput(String(c.amount))}
              className="flex shrink-0 items-center gap-1 rounded-full py-1 pr-2.5 pl-1 text-[11.5px] font-semibold active:scale-95"
              style={{ background: TONES[c.tone].soft, color: TONES[c.tone].ink }}
            >
              <Emoji name={c.emoji} size={16} /> {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Keypad */}
      <div className="mt-2.5 grid grid-cols-4 gap-2.5">
        {(['1', '2', '3'] as const).map((k) => (
          <Key key={k} label={k} onPress={() => press(k)} />
        ))}
        <Key label="+k" sub="000" tone="mango" onPress={() => press('k')} />
        {(['4', '5', '6'] as const).map((k) => (
          <Key key={k} label={k} onPress={() => press(k)} />
        ))}
        <Key label="+M" sub="000,000" tone="pink" onPress={() => press('M')} />
        {(['7', '8', '9'] as const).map((k) => (
          <Key key={k} label={k} onPress={() => press(k)} />
        ))}
        <Key label={<Delete size={18} />} tone="sky" onPress={() => press('back')} onLong={() => press('clear')} />
        <Key label="C" onPress={() => press('clear')} muted />
        <Key label="0" onPress={() => press('0')} />
        <Key label="." onPress={() => press('.')} muted disabled={inputDecimals === 0} />
        <Key label="00" onPress={() => setInput((s) => pressKey(pressKey(s, '0', inputDecimals), '0', inputDecimals))} muted />
      </div>

      <button
        type="button"
        disabled={!q || value <= 0}
        onClick={log}
        className="puff mt-3 flex w-full items-center justify-center gap-2 rounded-[18px] py-3 text-[14px] font-bold disabled:opacity-40"
        style={toneVars('lime')}
      >
        <Emoji name="wallet" size={20} /> Log to couple’s wallet
      </button>
    </div>
  );
}

function Key({
  label,
  sub,
  tone,
  muted,
  disabled,
  onPress,
  onLong,
}: {
  label: ReactNode;
  sub?: string;
  tone?: ToneName;
  muted?: boolean;
  disabled?: boolean;
  onPress: () => void;
  onLong?: () => void;
}) {
  const timer = useRef<number | undefined>(undefined);
  const longFired = useRef(false);
  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={() => {
        longFired.current = false;
        if (onLong) {
          timer.current = window.setTimeout(() => {
            longFired.current = true;
            onLong();
          }, 500);
        }
      }}
      onPointerUp={() => window.clearTimeout(timer.current)}
      onPointerLeave={() => window.clearTimeout(timer.current)}
      onClick={() => !longFired.current && onPress()}
      style={tone ? toneVars(tone) : undefined}
      className={cx(
        'flex h-[54px] flex-col items-center justify-center rounded-2xl font-semibold disabled:opacity-30',
        tone ? 'puff' : 'key',
        muted ? 'text-[16px] text-muted' : 'text-[20px] text-ink',
        tone && 'text-[16px] font-bold',
      )}
    >
      <span className={cx(!tone && 'num')}>{label}</span>
      {sub && <span className="num text-[9.5px] leading-none font-bold opacity-85">{sub}</span>}
    </button>
  );
}
