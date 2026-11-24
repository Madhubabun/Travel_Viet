import { useState } from 'react';
import { ChevronRight, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useStore, newId } from '../hooks/useAppStore';
import { useUi } from '../hooks/useUi';
import { CURRENCY_META, DEFAULT_RATES, FOREIGN_CODES, METHOD_COLORS } from '../data/currencies';
import { KIND_META, toneFromHex } from '../data/meta';
import { chargeFactor, fromNaturalRate, naturalRate } from '../utils/currency';
import { describeRate, formatNumber } from '../utils/format';
import type { CurrencyCode, MethodKind, PaymentMethod, RateMode } from '../types';
import { Button, Chip, Emoji, EmojiTile, Field, NumberInput, SectionTitle, Sheet, TextInput, Toggle, cx } from './ui';

export default function RatesView() {
  const { state, update } = useStore();
  const ui = useUi();
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);

  const lastUpdated = FOREIGN_CODES.map((c) => state.rates[c].updatedAt).filter(Boolean).sort().pop();

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/INR');
      const json = (await res.json()) as { result?: string; rates?: Record<string, number> };
      if (json.result !== 'success' || !json.rates) throw new Error('bad response');
      const now = new Date().toISOString();
      update((s) => {
        for (const c of FOREIGN_CODES) {
          const r = json.rates![c];
          if (r > 0) s.rates[c] = { ...s.rates[c], basePerInr: r, updatedAt: now };
        }
      });
      ui.toast('Base rates updated');
    } catch {
      ui.toast('Couldn’t refresh — using your saved rates');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="scroll-area h-full px-3 pt-[calc(10px+var(--sat))] pb-tabbar">
      <div className="flex items-center gap-2 px-1">
        <Emoji name="rates" size={30} />
        <div className="flex-1">
          <h1 className="text-[19px] font-extrabold">Rates & cards</h1>
          <div className="text-[11.5px] text-muted">
            {lastUpdated ? `Base rates updated ${new Date(lastUpdated).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}` : 'Using starter rates — refresh when online'}
          </div>
        </div>
        <Button small tone="sky" onClick={refresh} disabled={refreshing}>
          {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Refresh
        </Button>
      </div>

      <SectionTitle emoji="card">Payment methods</SectionTitle>
      <div className="flex flex-col gap-2">
        {state.methods.map((m) => (
          <button key={m.id} type="button" onClick={() => setEditing(structuredClone(m))} className="glass flex items-center gap-2.5 rounded-[16px] px-2.5 py-2 text-left active:scale-[0.99]">
            <EmojiTile name={KIND_META[m.kind].emoji} tone={toneFromHex(m.color)} size={38} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-semibold">{m.name}</div>
              <div className="truncate text-[11.5px] text-muted">{describeMethod(m)}</div>
            </div>
            <ChevronRight size={16} className="text-muted" />
          </button>
        ))}
        <button
          type="button"
          onClick={() =>
            setEditing({
              id: newId('m'),
              name: '',
              color: METHOD_COLORS[state.methods.length % METHOD_COLORS.length],
              kind: 'forex',
              rateMode: 'markup',
              markupPct: 0,
              gstOnMarkup: false,
              fixedPerInr: {},
            })
          }
          className="flex items-center justify-center gap-1.5 rounded-[16px] border-2 border-dashed border-ink/10 py-2.5 text-[13px] font-semibold text-ocean active:scale-[0.98]"
        >
          <Plus size={15} /> Add a card or forex card
        </button>
      </div>

      <SectionTitle emoji="cash">Exchange rates</SectionTitle>
      <p className="-mt-1 mb-2 px-1 text-[11.5px] text-muted">
        <b>Cash</b> is what money-changers give you. <b>Base</b> is the interbank rate cards start from before markup.
      </p>
      <div className="flex flex-col gap-2">
        {FOREIGN_CODES.map((c) => (
          <RateCard key={c} code={c} />
        ))}
      </div>

      <SectionTitle emoji="sparkles">Free & open</SectionTitle>
      <div className="glass rounded-[16px] p-3 text-[11.5px] leading-relaxed text-muted">
        Maps © OpenStreetMap contributors · Search by Photon (Komoot) · Photos from Wikimedia Commons (credited on each photo) · Rates from
        open.er-api.com · 3D icons: Microsoft Fluent Emoji (MIT). No accounts, no API keys — your data stays on this phone.
      </div>

      {editing && <MethodEditor method={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function describeMethod(m: PaymentMethod): string {
  if (m.kind === 'prepaid') return 'Paid in rupees, no conversion';
  if (m.rateMode === 'cash') return 'Uses each currency’s cash rate';
  const fixed = Object.entries(m.fixedPerInr).filter(([, v]) => v && v > 0) as [CurrencyCode, number][];
  const fx = fixed.map(([c, v]) => describeRate(v, c)).join(' · ');
  const markup = m.markupPct > 0 ? `${m.markupPct}% markup${m.gstOnMarkup ? ' + GST' : ''} (${(chargeFactor(m) * 100).toFixed(2)}%)` : '0% markup';
  if (m.rateMode === 'fixed') return fixed.length ? `Fixed ${fx}${m.markupPct > 0 ? ` · else ${markup}` : ''}` : `No fixed rates yet · ${markup}`;
  return markup;
}

function RateCard({ code }: { code: CurrencyCode }) {
  const { state, update } = useStore();
  const r = state.rates[code];
  const meta = CURRENCY_META[code];
  // Direction is fixed per currency (₹1 = X ₫, but 1 $ = ₹Y) so typing never flips it.
  const inv = DEFAULT_RATES[code].basePerInr < 1;
  const r2 = (v: number) => Math.round(v * 100) / 100;
  const cash = { inverted: inv, value: r2(inv ? 1 / r.cashPerInr : r.cashPerInr) };
  const base = { inverted: inv, value: r2(inv ? 1 / r.basePerInr : r.basePerInr) };
  const label = (inverted: boolean) => (inverted ? `1 ${meta.symbol} = ₹` : `₹1 = ${meta.symbol}`);

  return (
    <div className="glass rounded-[16px] p-2.5">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-[16px]">{meta.flag}</span>
        <span className="text-[13.5px] font-bold">{code}</span>
        <span className="text-[11.5px] text-muted">{meta.name}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[10.5px] font-bold text-[#9A5B00]">CASH · {label(cash.inverted)}</span>
          <NumberInput
            value={cash.value}
            onChange={(n) => n > 0 && update((s) => void (s.rates[code].cashPerInr = fromNaturalRate(n, cash.inverted)))}
            className="mt-0.5 !py-2"
          />
        </label>
        <label className="block">
          <span className="text-[10.5px] font-bold text-[#1B6E96]">BASE · {label(base.inverted)}</span>
          <NumberInput
            value={base.value}
            onChange={(n) => n > 0 && update((s) => void (s.rates[code].basePerInr = fromNaturalRate(n, base.inverted)))}
            className="mt-0.5 !py-2"
          />
        </label>
      </div>
    </div>
  );
}

const KINDS: MethodKind[] = ['cash', 'card', 'forex', 'prepaid'];

function MethodEditor({ method, onClose }: { method: PaymentMethod; onClose: () => void }) {
  const { state, update } = useStore();
  const ui = useUi();
  const [m, setM] = useState<PaymentMethod>(method);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isNew = !state.methods.some((x) => x.id === m.id);
  const set = <K extends keyof PaymentMethod>(k: K, v: PaymentMethod[K]) => setM((p) => ({ ...p, [k]: v }));

  const setKind = (kind: MethodKind) => {
    const rateMode: RateMode = kind === 'prepaid' ? 'inr' : kind === 'cash' ? (m.rateMode === 'fixed' ? 'fixed' : 'cash') : m.rateMode === 'fixed' ? 'fixed' : 'markup';
    setM((p) => ({ ...p, kind, rateMode }));
  };

  const save = () => {
    const clean: PaymentMethod = {
      ...m,
      name: m.name.trim() || KIND_META[m.kind].label,
      markupPct: Math.max(0, m.markupPct),
    };
    update((s) => {
      const i = s.methods.findIndex((x) => x.id === clean.id);
      if (i >= 0) s.methods[i] = clean;
      else s.methods.push(clean);
    });
    ui.toast(isNew ? 'Payment method added' : 'Payment method saved');
    onClose();
  };

  const remove = () => {
    update((s) => void (s.methods = s.methods.filter((x) => x.id !== m.id)));
    ui.toast('Removed — past expenses keep their rate');
    onClose();
  };

  const canDelete = !isNew && state.methods.length > 1;
  const showMarkup = m.kind !== 'prepaid' && m.rateMode !== 'cash';

  return (
    <Sheet
      open
      tall
      onClose={onClose}
      emoji={KIND_META[m.kind].emoji}
      title={isNew ? 'New payment method' : 'Edit payment method'}
      footer={
        <div className="flex gap-2">
          {canDelete && (
            <Button variant="danger" aria-label="Delete method" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} />
            </Button>
          )}
          <Button block tone="sky" onClick={save}>
            {isNew ? 'Add method' : 'Save'}
          </Button>
        </div>
      }
    >
      {confirmDelete && (
        <div className="mb-3 animate-rise rounded-2xl bg-pink-soft p-3">
          <div className="text-[13px] font-semibold text-[#C2255C]">Remove “{m.name}”? Logged expenses keep the rate they were saved with.</div>
          <div className="mt-2 flex gap-2">
            <Button small variant="glass" onClick={() => setConfirmDelete(false)}>
              Keep
            </Button>
            <Button small tone="pink" onClick={remove}>
              Remove
            </Button>
          </div>
        </div>
      )}

      <Field label="Name">
        <TextInput value={m.name} placeholder="Niyo Global, HDFC Regalia…" onChange={(e) => set('name', e.target.value)} />
      </Field>

      <Field label="Colour">
        <div className="flex gap-2">
          {METHOD_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Colour ${c}`}
              onClick={() => set('color', c)}
              className={cx('h-8 w-8 rounded-full transition active:scale-90', m.color === c && 'ring-3 ring-offset-2')}
              style={{ background: `linear-gradient(180deg, ${toneFromHex(c).from}, ${c})`, ['--tw-ring-color' as string]: c }}
            />
          ))}
        </div>
      </Field>

      <Field label="Type">
        <div className="grid grid-cols-4 gap-1.5">
          {KINDS.map((k) => (
            <Chip key={k} tone={toneFromHex(m.color)} active={m.kind === k} onClick={() => setKind(k)} className="flex-col !gap-0.5 !rounded-2xl !py-1.5">
              <Emoji name={KIND_META[k].emoji} size={20} />
              <span className="text-[10.5px]">{KIND_META[k].label}</span>
            </Chip>
          ))}
        </div>
      </Field>

      {m.kind !== 'prepaid' && (
        <Field label="How the rate works">
          <div className="flex flex-wrap gap-1.5">
            {m.kind === 'cash' ? (
              <Chip tone="mango" active={m.rateMode === 'cash'} onClick={() => set('rateMode', 'cash')}>
                Use cash rates
              </Chip>
            ) : (
              <Chip tone="sky" active={m.rateMode === 'markup'} onClick={() => set('rateMode', 'markup')}>
                Base rate + markup %
              </Chip>
            )}
            <Chip tone="violet" active={m.rateMode === 'fixed'} onClick={() => set('rateMode', 'fixed')}>
              Fixed rate I enter
            </Chip>
          </div>
        </Field>
      )}

      {showMarkup && (
        <>
          <Field
            label={m.rateMode === 'fixed' ? 'Markup for currencies without a fixed rate (%)' : 'Bank / forex markup (%)'}
            hint={m.markupPct > 0 ? `Effective extra: ${(chargeFactor(m) * 100).toFixed(3)}% on every spend` : 'Zero-markup cards pay the base rate exactly.'}
          >
            <NumberInput value={m.markupPct} onChange={(n) => set('markupPct', n)} placeholder="0" />
          </Field>
          <div className="mb-3.5">
            <Toggle checked={m.gstOnMarkup} onChange={(v) => set('gstOnMarkup', v)} label="Add 18% GST on the markup" />
          </div>
        </>
      )}

      {m.rateMode === 'fixed' && (
        <div className="mb-2">
          <div className="mb-1 text-[11px] font-bold tracking-wider text-muted uppercase">Fixed rates (leave blank to skip)</div>
          <div className="grid grid-cols-2 gap-2">
            {FOREIGN_CODES.map((c) => {
              const meta = CURRENCY_META[c];
              const current = m.fixedPerInr[c];
              const inv = DEFAULT_RATES[c].basePerInr < 1;
              const guess = naturalRate(state.rates[c].basePerInr);
              const nat = { inverted: inv, value: current ? Math.round((inv ? 1 / current : current) * 100) / 100 : 0 };
              return (
                <label key={c} className="block">
                  <span className="text-[11px] font-semibold text-muted">
                    {meta.flag} {nat.inverted ? `1 ${meta.symbol} = ₹` : `₹1 = ${meta.symbol}`}
                  </span>
                  <NumberInput
                    value={nat.value}
                    placeholder={formatNumber(guess.value, 'INR', 2)}
                    onChange={(n) =>
                      setM((p) => {
                        const fixedPerInr = { ...p.fixedPerInr };
                        if (n > 0) fixedPerInr[c] = fromNaturalRate(n, nat.inverted);
                        else delete fixedPerInr[c];
                        return { ...p, fixedPerInr };
                      })
                    }
                    className="mt-0.5 !py-2"
                  />
                </label>
              );
            })}
          </div>
        </div>
      )}
    </Sheet>
  );
}
