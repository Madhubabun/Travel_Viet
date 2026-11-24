import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useStore, newId } from '../hooks/useAppStore';
import { useUi } from '../hooks/useUi';
import { CURRENCY_META, FOREIGN_CODES } from '../data/currencies';
import { KIND_META, dayTone, toneFromHex } from '../data/meta';
import { quoteForeign, snapshotMethod } from '../utils/currency';
import { formatMoney } from '../utils/format';
import type { AnyCurrency, AppState, Breakdown, Expense, PaymentMethod } from '../types';
import { Button, Chip, Emoji, Field, NumberInput, Sheet, TextInput, Toggle } from './ui';

interface Computed {
  inr: number;
  perInr: number;
  breakdown?: Breakdown;
  rateLabel: string;
}

export function computeExpense(amount: number, currency: AnyCurrency, method: PaymentMethod, rates: AppState['rates']): Computed {
  if (method.kind === 'prepaid' || currency === 'INR') {
    return { inr: amount, perInr: 1, rateLabel: 'Paid in ₹' };
  }
  const q = quoteForeign(amount, currency, method, rates);
  return { inr: q.inr, perInr: q.perInr, breakdown: q.breakdown, rateLabel: q.rateLabel };
}

export default function ExpenseEditor() {
  const { state, update } = useStore();
  const ui = useUi();
  const req = ui.expenseRequest;
  const existing = req?.expenseId ? state.expenses.find((e) => e.id === req.expenseId) : undefined;

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState<AnyCurrency>('VND');
  const [methodId, setMethodId] = useState('');
  const [dayId, setDayId] = useState<string | undefined>();
  const [stopId, setStopId] = useState<string | undefined>();
  const [recalc, setRecalc] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!req) return;
    const d = req.draft ?? {};
    if (existing) {
      setTitle(existing.title);
      setAmount(existing.amount);
      setCurrency(existing.currency);
      setMethodId(existing.method.id);
      setDayId(existing.dayId);
      setStopId(existing.stopId);
    } else {
      const m = state.methods.find((x) => x.id === d.methodId) ?? state.methods[0];
      setTitle(d.title ?? '');
      setAmount(d.amount ?? 0);
      setCurrency(m?.kind === 'prepaid' ? 'INR' : (d.currency ?? state.trip.homeForeign));
      setMethodId(m?.id ?? '');
      setDayId(d.dayId ?? (ui.dayId !== 'all' ? ui.dayId : undefined));
      setStopId(d.stopId);
    }
    setRecalc(false);
    setConfirmDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);

  const method = state.methods.find((m) => m.id === methodId);
  const methodChanged = !!existing && methodId !== existing.method.id;
  const currencyChanged = !!existing && currency !== existing.currency;
  const useCurrentRates = !existing || recalc || methodChanged || currencyChanged;

  const preview = useMemo<Computed | null>(() => {
    if (useCurrentRates) return method ? computeExpense(amount, currency, method, state.rates) : null;
    if (!existing) return null;
    // Same method & currency: keep the rate you actually paid.
    return { inr: amount / existing.perInr, perInr: existing.perInr, rateLabel: existing.method.rateLabel, breakdown: existing.breakdown && scale(existing.breakdown, amount / existing.amount) };
  }, [useCurrentRates, method, amount, currency, state.rates, existing]);

  if (!req) return null;
  const close = () => ui.openExpense(null);
  const day = state.trip.days.find((d) => d.id === dayId);

  const save = () => {
    if (!preview || amount <= 0) return;
    const snap = useCurrentRates && method ? snapshotMethod(method, preview.rateLabel) : existing!.method;
    const entry: Expense = {
      id: existing?.id ?? newId('e'),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      title: title.trim() || (stopId ? (day?.stops.find((s) => s.id === stopId)?.name ?? 'Expense') : 'Expense'),
      amount,
      currency: method?.kind === 'prepaid' ? 'INR' : currency,
      inr: preview.inr,
      perInr: preview.perInr,
      breakdown: preview.breakdown,
      method: snap,
      dayId,
      stopId: stopId && day?.stops.some((s) => s.id === stopId) ? stopId : undefined,
    };
    update((s) => {
      const i = s.expenses.findIndex((e) => e.id === entry.id);
      if (i >= 0) s.expenses[i] = entry;
      else s.expenses.push(entry);
    });
    ui.toast(existing ? 'Expense updated' : `Logged ${formatMoney(entry.inr, 'INR', 0)} to the wallet`);
    close();
  };

  const remove = () => {
    update((s) => void (s.expenses = s.expenses.filter((e) => e.id !== existing?.id)));
    ui.toast('Expense deleted');
    close();
  };

  const prepaid = method?.kind === 'prepaid';

  return (
    <Sheet
      open
      tall
      onClose={close}
      emoji={existing ? 'memo' : 'moneybag'}
      title={existing ? 'Edit expense' : 'Log to couple’s wallet'}
      footer={
        <div className="flex gap-2">
          {existing && (
            <Button variant="danger" aria-label="Delete expense" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} />
            </Button>
          )}
          <Button block tone="lime" disabled={!preview || amount <= 0} onClick={save}>
            {existing ? 'Save changes' : `Save ${preview && amount > 0 ? formatMoney(preview.inr, 'INR', 0) : ''}`}
          </Button>
        </div>
      }
    >
      {confirmDelete && (
        <div className="mb-3 animate-rise rounded-2xl bg-pink-soft p-3">
          <div className="text-[13px] font-semibold text-[#C2255C]">Delete this expense?</div>
          <div className="mt-2 flex gap-2">
            <Button small variant="glass" onClick={() => setConfirmDelete(false)}>
              Keep
            </Button>
            <Button small tone="pink" onClick={remove}>
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Live total */}
      <div className="mb-3 rounded-[18px] p-3" style={{ background: 'linear-gradient(135deg,#E2F8E0,#D3F5F1)' }}>
        <div className="text-[11px] font-bold tracking-wider text-[#2F7A1F] uppercase">Comes out of the shared pool</div>
        <div className="num text-[22px] font-semibold text-ink">{preview ? formatMoney(preview.inr, 'INR', 2) : '—'}</div>
        {preview && <div className="text-[11.5px] text-muted">{preview.rateLabel}</div>}
      </div>

      <Field label="What was it?">
        <TextInput value={title} placeholder="An Bang Beach smoothie bowls" onChange={(e) => setTitle(e.target.value)} />
      </Field>

      <Field label="Paid with">
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1">
          {state.methods.map((m) => (
            <Chip
              key={m.id}
              tone={toneFromHex(m.color)}
              active={m.id === methodId}
              onClick={() => {
                setMethodId(m.id);
                if (m.kind === 'prepaid') setCurrency('INR');
                else if (currency === 'INR') setCurrency(state.trip.homeForeign);
              }}
            >
              <Emoji name={KIND_META[m.kind].emoji} size={14} /> {m.name}
            </Chip>
          ))}
          {existing && !method && <Chip active>{existing.method.name} (deleted)</Chip>}
        </div>
      </Field>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Field label={`Amount ${CURRENCY_META[prepaid ? 'INR' : currency].symbol}`}>
          <NumberInput value={amount} onChange={setAmount} placeholder="250000" className="text-[17px] font-semibold" />
        </Field>
        {!prepaid && (
          <Field label="Currency">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as AnyCurrency)}
              className="h-[46px] rounded-2xl border border-ink/8 bg-white/80 px-3 text-[14px] font-semibold outline-none"
            >
              {FOREIGN_CODES.map((c) => (
                <option key={c} value={c}>
                  {CURRENCY_META[c].flag} {c}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
      {!prepaid && amount > 0 && (
        <div className="-mt-2 mb-3 px-1 text-[11.5px] text-muted">
          {formatMoney(amount, currency)}
        </div>
      )}

      {existing && !methodChanged && !currencyChanged && method && (
        <div className="mb-3.5">
          <Toggle checked={recalc} onChange={setRecalc} label="Recalculate at today’s rate" />
        </div>
      )}

      <Field label="Link to day (optional)">
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1">
          <Chip tone="sand" active={!dayId} onClick={() => (setDayId(undefined), setStopId(undefined))}>
            None
          </Chip>
          {state.trip.days.map((d, i) => (
            <Chip
              key={d.id}
              tone={dayTone(i)}
              active={d.id === dayId}
              onClick={() => {
                setDayId(d.id);
                if (d.id !== dayId) setStopId(undefined);
              }}
            >
              Day {i + 1}
            </Chip>
          ))}
        </div>
      </Field>

      {day && day.stops.length > 0 && (
        <Field label="…and stop (optional)">
          <div className="flex flex-wrap gap-1.5">
            {day.stops.map((s) => (
              <Chip key={s.id} tone="aqua" active={s.id === stopId} onClick={() => setStopId(s.id === stopId ? undefined : s.id)}>
                {s.name}
              </Chip>
            ))}
          </div>
        </Field>
      )}
    </Sheet>
  );
}

function scale(b: Breakdown, f: number): Breakdown {
  return { base: b.base * f, markup: b.markup * f, gst: b.gst * f };
}

/** Exposed for the wallet's colour tiles. */
export const methodTone = (hex: string) => toneFromHex(hex);
