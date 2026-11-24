import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useStore, findStop } from '../hooks/useAppStore';
import { useUi } from '../hooks/useUi';
import { GROUP_META, KIND_META, TONES, VIBE_META, kindGroup, toneFromHex } from '../data/meta';
import { inrToForeignDisplay } from '../utils/currency';
import { formatCompact, formatDate, formatInr, formatMoney, toIsoDate } from '../utils/format';
import { dayIndexById, totalSpent } from '../utils/tripOps';
import { shareFile, shareText } from '../lib/native';
import type { AppState, Expense } from '../types';
import { exportJson } from './TripHeader';
import { Badge, Button, Chip, Emoji, EmojiTile, Empty, Field, NumberInput, Sheet } from './ui';

type Filter = { type: 'all' } | { type: 'group'; group: 'Cash' | 'Cards' | 'Prepaid' } | { type: 'method'; id: string };

export default function ExpenseLog() {
  const { state } = useStore();
  const ui = useUi();
  const [filter, setFilter] = useState<Filter>({ type: 'all' });
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const { trip, expenses } = state;
  const foreign = trip.homeForeign;
  const spent = totalSpent(expenses);
  const left = trip.budgetInr - spent;
  const pct = trip.budgetInr > 0 ? Math.min(1, spent / trip.budgetInr) : 0;

  const groups = useMemo(() => {
    const g = { Cash: 0, Cards: 0, Prepaid: 0 };
    for (const e of expenses) g[kindGroup(e.method.kind)] += e.inr;
    return g;
  }, [expenses]);

  // Methods that appear in the feed (by snapshot) plus current ones.
  const methodChips = useMemo(() => {
    const m = new Map<string, { id: string; name: string; color: string }>();
    for (const e of expenses) m.set(e.method.id, { id: e.method.id, name: e.method.name, color: e.method.color });
    for (const x of state.methods) if (m.has(x.id)) m.set(x.id, { id: x.id, name: x.name, color: x.color });
    return [...m.values()];
  }, [expenses, state.methods]);

  const filtered = expenses
    .filter((e) =>
      filter.type === 'all' ? true : filter.type === 'group' ? kindGroup(e.method.kind) === filter.group : e.method.id === filter.id,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const filteredTotal = totalSpent(filtered);

  const byDate = useMemo(() => {
    const out: { date: string; items: Expense[] }[] = [];
    for (const e of filtered) {
      const d = toIsoDate(new Date(e.createdAt));
      const last = out[out.length - 1];
      if (last?.date === d) last.items.push(e);
      else out.push({ date: d, items: [e] });
    }
    return out;
  }, [filtered]);

  return (
    <div className="scroll-area h-full px-3 pt-[calc(10px+var(--sat))] pb-tabbar">
      <div className="flex items-center gap-2 px-1">
        <Emoji name="moneybag" size={30} />
        <h1 className="flex-1 text-[19px] font-extrabold">Shared wallet</h1>
        <Button small variant="glass" onClick={() => setExportOpen(true)}>
          <Emoji name="outbox" size={14} /> Export
        </Button>
        <Button small tone="lime" onClick={() => ui.openExpense({ draft: {} })}>
          <Plus size={14} /> Add
        </Button>
      </div>

      {/* Gauge */}
      <button type="button" onClick={() => setBudgetOpen(true)} className="glass mt-3 block w-full rounded-[20px] px-3 pt-3 pb-3 text-left active:scale-[0.99]">
        <Gauge pct={pct} over={left < 0} />
        <div className="-mt-12 text-center">
          <div className="num text-[22px] font-semibold">{formatInr(spent)}</div>
          <div className="text-[11.5px] text-muted">
            spent of <span className="num">{formatInr(trip.budgetInr)}</span> · tap to edit
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label="Spent" inr={spent} foreign={inrToForeignDisplay(spent, foreign, state.rates)} code={foreign} tone="pink" />
          <Stat label={left < 0 ? 'Over by' : 'Left'} inr={Math.abs(left)} foreign={inrToForeignDisplay(Math.abs(left), foreign, state.rates)} code={foreign} tone={left < 0 ? 'pink' : 'lime'} />
        </div>
      </button>

      {/* Payment-type tiles */}
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {(Object.keys(GROUP_META) as (keyof typeof GROUP_META)[]).map((g) => {
          const meta = GROUP_META[g];
          const t = TONES[meta.tone];
          const on = filter.type === 'group' && filter.group === g;
          return (
            <button
              key={g}
              type="button"
              onClick={() => setFilter(on ? { type: 'all' } : { type: 'group', group: g })}
              className="flex flex-col items-center rounded-[16px] py-2 transition active:scale-95"
              style={{ background: t.soft, boxShadow: on ? `0 0 0 2px ${t.to}` : undefined }}
            >
              <Emoji name={meta.emoji} size={22} />
              <span className="text-[11px] font-semibold" style={{ color: t.ink }}>
                {g === 'Prepaid' ? 'Prepaid ₹' : g}
              </span>
              <span className="num text-[12.5px] font-semibold" style={{ color: t.ink }}>
                {formatCompact(groups[g], 'INR')}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="no-scrollbar -mx-3 mt-3 flex gap-1.5 overflow-x-auto px-3 py-1">
        <Chip tone="teal" active={filter.type === 'all'} onClick={() => setFilter({ type: 'all' })}>
          All · {expenses.length}
        </Chip>
        {methodChips.map((m) => (
          <Chip key={m.id} tone={toneFromHex(m.color)} active={filter.type === 'method' && filter.id === m.id} onClick={() => setFilter({ type: 'method', id: m.id })}>
            {m.name}
          </Chip>
        ))}
      </div>
      {filter.type !== 'all' && (
        <div className="mt-1 px-1 text-[12px] text-muted">
          {filtered.length} expenses · <span className="num font-semibold text-ink">{formatInr(filteredTotal)}</span>
        </div>
      )}

      {/* Feed */}
      {!filtered.length ? (
        <Empty emoji="coconut" title="No expenses yet" body="Log one from the calculator or tap Add." />
      ) : (
        byDate.map(({ date, items }) => (
          <div key={date}>
            <div className="mt-3.5 mb-1.5 px-1 text-[11px] font-bold tracking-wider text-muted uppercase">{dateLabel(date)}</div>
            <div className="flex flex-col gap-1.5">
              {items.map((e) => (
                <ExpenseRow key={e.id} e={e} state={state} onClick={() => ui.openExpense({ expenseId: e.id })} />
              ))}
            </div>
          </div>
        ))
      )}

      <BudgetSheet open={budgetOpen} onClose={() => setBudgetOpen(false)} />
      <ExportSheet open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}

function ExpenseRow({ e, state, onClick }: { e: Expense; state: AppState; onClick: () => void }) {
  const tone = toneFromHex(e.method.color);
  const stop = e.stopId ? findStop(state, e.stopId)?.stop : undefined;
  const dayIdx = dayIndexById(state, e.dayId);
  return (
    <button type="button" onClick={onClick} className="glass flex w-full animate-rise items-center gap-2.5 rounded-[16px] px-2.5 py-2 text-left active:scale-[0.99]">
      <EmojiTile name={stop ? VIBE_META[stop.vibe].emoji : KIND_META[e.method.kind].emoji} tone={tone} size={36} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-semibold">{e.title}</div>
        <div className="mt-0.5 flex items-center gap-1">
          <Badge tone={tone}>{e.method.name}</Badge>
          {dayIdx >= 0 && <span className="text-[11px] text-muted">Day {dayIdx + 1}</span>}
        </div>
      </div>
      <div className="text-right">
        <div className="num text-[13.5px] font-semibold">{formatMoney(e.inr, 'INR', 0)}</div>
        {e.currency !== 'INR' && <div className="num text-[11px] text-muted">{formatCompact(e.amount, e.currency)}</div>}
      </div>
    </button>
  );
}

function Stat({ label, inr, foreign, code, tone }: { label: string; inr: number; foreign: number; code: Expense['currency']; tone: 'pink' | 'lime' }) {
  const t = TONES[tone];
  return (
    <div className="rounded-2xl px-3 py-2" style={{ background: t.soft }}>
      <div className="text-[11px] font-semibold" style={{ color: t.ink }}>
        {label}
      </div>
      <div className="num text-[14px] font-semibold text-ink">{formatInr(inr)}</div>
      <div className="num text-[11px] text-muted">{formatCompact(foreign, code)}</div>
    </div>
  );
}

function Gauge({ pct, over }: { pct: number; over: boolean }) {
  const r = 70;
  const len = Math.PI * r;
  return (
    <svg viewBox="0 0 180 100" className="mx-auto block h-[104px] w-[188px]">
      <defs>
        <linearGradient id="gauge-g" x1="0" x2="1">
          <stop offset="0" stopColor="#2EC4B6" />
          <stop offset="0.55" stopColor="#8BCF6A" />
          <stop offset="1" stopColor="#FFB347" />
        </linearGradient>
      </defs>
      <path d={`M ${90 - r} 90 A ${r} ${r} 0 0 1 ${90 + r} 90`} fill="none" stroke="rgb(31 41 46 / 0.08)" strokeWidth="14" strokeLinecap="round" />
      <path
        d={`M ${90 - r} 90 A ${r} ${r} 0 0 1 ${90 + r} 90`}
        fill="none"
        stroke={over ? '#FF5C80' : 'url(#gauge-g)'}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${Math.max(0.001, pct) * len} ${len}`}
        style={{ transition: 'stroke-dasharray 600ms cubic-bezier(.22,1,.36,1)' }}
      />
    </svg>
  );
}

function dateLabel(iso: string) {
  const today = toIsoDate(new Date());
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (iso === today) return 'Today';
  if (iso === toIsoDate(y)) return 'Yesterday';
  return formatDate(new Date(iso + 'T00:00'), { weekday: 'short', day: 'numeric', month: 'short' });
}

function BudgetSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, update } = useStore();
  return (
    <Sheet open={open} onClose={onClose} title="Shared budget" emoji="wallet" footer={<Button block tone="lime" onClick={onClose}>Done</Button>}>
      <Field label="Total trip budget (₹)" hint="Everything both of you spend comes out of this one pool.">
        <NumberInput value={state.trip.budgetInr} onChange={(n) => update((s) => void (s.trip.budgetInr = n))} className="text-[18px] font-semibold" />
      </Field>
    </Sheet>
  );
}

export function buildSummary(state: AppState): string {
  const { trip, expenses } = state;
  const spent = totalSpent(expenses);
  const f = trip.homeForeign;
  const lines = [
    `🌊 ${trip.title}`,
    trip.destination,
    '',
    `Budget ${formatInr(trip.budgetInr)} · Spent ${formatInr(spent)} (${formatCompact(inrToForeignDisplay(spent, f, state.rates), f)}) · Left ${formatInr(trip.budgetInr - spent)}`,
  ];
  const g = { Cash: 0, Cards: 0, Prepaid: 0 };
  for (const e of expenses) g[kindGroup(e.method.kind)] += e.inr;
  lines.push(`Cash ${formatInr(g.Cash)} · Cards ${formatInr(g.Cards)} · Prepaid ${formatInr(g.Prepaid)}`, '');
  trip.days.forEach((d, i) => {
    const items = expenses.filter((e) => e.dayId === d.id);
    const total = totalSpent(items);
    lines.push(`Day ${i + 1} · ${d.title}${total ? ` — ${formatInr(total)}` : ''}`);
    for (const s of d.stops) lines.push(`  • ${s.name}`);
    for (const e of items) lines.push(`  ₹ ${e.title}: ${formatInr(e.inr)}${e.currency !== 'INR' ? ` (${formatMoney(e.amount, e.currency)}, ${e.method.name})` : ` (${e.method.name})`}`);
  });
  const loose = expenses.filter((e) => !e.dayId);
  if (loose.length) {
    lines.push('', 'Other expenses');
    for (const e of loose) lines.push(`  ₹ ${e.title}: ${formatInr(e.inr)} (${e.method.name})`);
  }
  return lines.join('\n');
}

function ExportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useStore();
  const ui = useUi();
  const stamp = toIsoDate(new Date());
  const csv = () => {
    const rows = [['Date', 'Title', 'Day', 'Method', 'Amount', 'Currency', 'INR', 'Rate'].join(',')];
    for (const e of [...state.expenses].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      const di = dayIndexById(state, e.dayId);
      rows.push(
        [e.createdAt.slice(0, 10), e.title, di >= 0 ? `Day ${di + 1}` : '', e.method.name, e.amount, e.currency, e.inr.toFixed(2), e.method.rateLabel]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(','),
      );
    }
    return rows.join('\n');
  };
  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch {
      ui.toast('Share cancelled');
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Export" emoji="outbox">
      <div className="space-y-2 pb-2">
        <Button block tone="aqua" onClick={() => run(() => shareText(buildSummary(state), state.trip.title))}>
          <Emoji name="memo" size={16} /> Share trip summary (text)
        </Button>
        <Button block variant="glass" onClick={() => run(() => shareFile(`tide-and-trail-expenses-${stamp}.csv`, csv(), 'text/csv', 'Expense sheet'))}>
          <Emoji name="chart" size={16} /> Expense sheet (.csv)
        </Button>
        <Button block variant="glass" onClick={() => run(() => shareFile(`tide-and-trail-${stamp}.json`, exportJson(state), 'application/json', 'Tide & Trail backup'))}>
          <Emoji name="luggage" size={16} /> Full backup (.json)
        </Button>
      </div>
    </Sheet>
  );
}
