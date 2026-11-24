import { useMemo, useRef, useState } from 'react';
import { ClipboardPaste, Copy, Download, FileUp, RotateCcw, Share2, Sparkles } from 'lucide-react';
import { CachedImage } from './PhotoStrip';
import { useStore } from '../hooks/useAppStore';
import { useUi } from '../hooks/useUi';
import { CURRENCY_META, FOREIGN_CODES } from '../data/currencies';
import { buildBlankState, buildSampleState } from '../data/sampleTrip';
import { formatCompact, formatDate, formatInr, toIsoDate } from '../utils/format';
import { inrToForeignDisplay } from '../utils/currency';
import { totalSpent, tripEnd } from '../utils/tripOps';
import { copyText, readClipboard, shareFile } from '../lib/native';
import { normalizeState } from '../lib/storage';
import type { AppState } from '../types';
import { Button, Chip, Emoji, Field, NumberInput, Sheet, TextInput, Toggle, cx, inputCls } from './ui';

export default function TripHeader() {
  const { state } = useStore();
  const ui = useUi();
  const [editing, setEditing] = useState(false);
  const [backup, setBackup] = useState(false);
  const { trip } = state;
  const spent = totalSpent(state.expenses);
  const remaining = trip.budgetInr - spent;
  const over = remaining < 0;
  const pct = trip.budgetInr > 0 ? Math.min(100, (spent / trip.budgetInr) * 100) : 0;
  const foreign = trip.homeForeign;

  // The selected day's first photo sets the mood of the whole screen.
  const day = trip.days.find((d) => d.id === ui.dayId) ?? trip.days[0];
  const hero = day?.stops.find((s) => s.photos?.length)?.photos?.[0]
    ?? trip.days.flatMap((d) => d.stops).find((s) => s.photos?.length)?.photos?.[0];

  return (
    <header className="relative">
      <div className="absolute inset-x-0 top-0 h-[250px] overflow-hidden [mask-image:linear-gradient(to_bottom,black_55%,transparent)]">
        {hero ? (
          <CachedImage key={hero.thumb} src={hero.thumb} alt="" className="h-full w-full scale-105" />
        ) : (
          <div className="h-full w-full bg-gradient-to-b from-[#4FB6E0] via-[#7FD8CF] to-[#FFD39A]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/5 to-transparent" />
      </div>

      <div className="relative px-4 pt-[calc(10px+var(--sat))]">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="glass flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1.5 text-[12px] font-bold text-ocean active:scale-95"
          >
            <Emoji name="calendar" size={16} />
            {formatDate(new Date(trip.startDate + 'T00:00'))} – {formatDate(tripEnd(trip))} · {trip.days.length}d
          </button>
          <button
            type="button"
            aria-label="Backup & trip options"
            onClick={() => setBackup(true)}
            className="glass flex h-8 w-8 items-center justify-center rounded-full active:scale-90"
          >
            <Emoji name="sparkles" size={16} />
          </button>
        </div>

        <button type="button" onClick={() => setEditing(true)} className="mt-14 block w-full text-left active:opacity-80">
          <h1 className="text-[23px] leading-tight font-extrabold text-white [text-shadow:0_2px_12px_rgb(0_0_0/0.35)]">
            {trip.title}
          </h1>
          {trip.destination && (
            <div className="mt-0.5 truncate text-[12px] font-medium text-white/90 [text-shadow:0_1px_6px_rgb(0_0_0/0.4)]">
              {trip.destination}
            </div>
          )}
        </button>

        {/* Shared budget pill */}
        <button
          type="button"
          onClick={() => ui.setTab('wallet')}
          className="glass mt-3 flex w-full items-center gap-2.5 rounded-[18px] px-3 py-2.5 text-left active:scale-[0.99]"
        >
          <Emoji name="wallet" size={28} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-semibold text-muted">{over ? 'Over budget' : 'Left to spend'}</span>
              <span className="num text-[12px] font-semibold text-[#D9480F]">
                ≈ {formatCompact(inrToForeignDisplay(remaining, foreign, state.rates), foreign)}
              </span>
            </div>
            <div className={cx('num text-[17px] font-semibold', over ? 'text-pink' : 'text-ink')}>{formatInr(remaining)}</div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/8">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(pct, 2)}%`,
                  background: over ? '#FF5C80' : 'linear-gradient(90deg,#2EC4B6,#8BCF6A,#FFB347)',
                }}
              />
            </div>
          </div>
        </button>
      </div>

      <TripDetailsSheet open={editing} onClose={() => setEditing(false)} />
      <BackupSheet open={backup} onClose={() => setBackup(false)} />
    </header>
  );
}

function TripDetailsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, update } = useStore();
  const t = state.trip;
  return (
    <Sheet open={open} onClose={onClose} title="Trip details" emoji="backpack" footer={<Button block onClick={onClose}>Done</Button>}>
      <Field label="Trip title">
        <TextInput value={t.title} onChange={(e) => update((s) => void (s.trip.title = e.target.value))} />
      </Field>
      <Field label="Destination / route">
        <TextInput
          value={t.destination}
          placeholder="Hanoi → Hoi An → Da Nang"
          onChange={(e) => update((s) => void (s.trip.destination = e.target.value))}
        />
      </Field>
      <Field label="Start date" hint={`Ends ${formatDate(tripEnd(t), { weekday: 'short', day: 'numeric', month: 'short' })} — add or remove days to change the length.`}>
        <input
          type="date"
          className={inputCls}
          value={t.startDate}
          onChange={(e) => e.target.value && update((s) => void (s.trip.startDate = e.target.value))}
        />
      </Field>
      <Field label="Shared budget (₹)">
        <NumberInput value={t.budgetInr} onChange={(n) => update((s) => void (s.trip.budgetInr = n))} placeholder="150000" />
      </Field>
      <Field label="Show budget also in">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {FOREIGN_CODES.map((c) => (
            <Chip key={c} tone="mango" active={t.homeForeign === c} onClick={() => update((s) => void (s.trip.homeForeign = c))}>
              {CURRENCY_META[c].flag} {c}
            </Chip>
          ))}
        </div>
      </Field>
    </Sheet>
  );
}

function stamp() {
  return toIsoDate(new Date());
}

export function exportJson(state: AppState) {
  return JSON.stringify({ app: 'tide-and-trail', exportedAt: new Date().toISOString(), ...state }, null, 1);
}

function BackupSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, replace } = useStore();
  const ui = useUi();
  const [mode, setMode] = useState<'menu' | 'import' | 'reset'>('menu');
  const [text, setText] = useState('');
  const [alsoRates, setAlsoRates] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => {
    if (!text.trim()) return null;
    try {
      return { ok: true as const, state: normalizeState(JSON.parse(text)) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message || 'Not valid JSON' };
    }
  }, [text]);

  const close = () => {
    setMode('menu');
    setText('');
    onClose();
  };

  const doExport = async () => {
    try {
      await shareFile(`tide-and-trail-${stamp()}.json`, exportJson(state), 'application/json', 'Tide & Trail backup');
    } catch {
      ui.toast('Share cancelled');
    }
  };

  const doImport = () => {
    if (!parsed?.ok) return;
    const next = alsoRates ? parsed.state : { ...parsed.state, rates: state.rates, methods: state.methods };
    replace(next);
    ui.setDayId(next.trip.days[0]?.id ?? 'all');
    ui.toast('Trip imported');
    close();
  };

  return (
    <Sheet
      open={open}
      onClose={mode === 'menu' ? close : () => setMode('menu')}
      title={mode === 'import' ? 'Import a trip' : mode === 'reset' ? 'Start fresh' : 'Backup & share'}
      emoji={mode === 'import' ? 'inbox' : mode === 'reset' ? 'sparkles' : 'outbox'}
      tall={mode === 'import'}
    >
      {mode === 'menu' && (
        <div className="space-y-3 pb-2">
          <p className="text-sm text-muted">
            Everything is stored on this phone. Share the trip file to your partner over WhatsApp or Telegram — they import it to get the same plan.
          </p>
          <Button block tone="aqua" onClick={doExport}>
            <Share2 size={18} /> Share trip file (.json)
          </Button>
          <Button
            block
            variant="glass"
            onClick={async () => {
              await copyText(exportJson(state));
              ui.toast('Trip JSON copied');
            }}
          >
            <Copy size={18} /> Copy trip as text
          </Button>
          <Button block variant="glass" onClick={() => setMode('import')}>
            <Download size={18} /> Import a trip…
          </Button>
          <Button block variant="danger" onClick={() => setMode('reset')}>
            <RotateCcw size={18} /> New trip / reset…
          </Button>
        </div>
      )}

      {mode === 'import' && (
        <div className="space-y-3 pb-2">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="glass" onClick={() => fileRef.current?.click()}>
              <FileUp size={18} /> Pick file
            </Button>
            <Button
              variant="glass"
              onClick={async () => {
                try {
                  setText(await readClipboard());
                } catch {
                  ui.toast('Clipboard is empty or blocked');
                }
              }}
            >
              <ClipboardPaste size={18} /> Paste
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json,text/plain"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setText(await f.text());
              e.target.value = '';
            }}
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="…or paste the trip JSON here"
            className={cx(inputCls, 'num h-32 text-xs')}
          />
          {parsed && !parsed.ok && <div className="rounded-2xl bg-pink-soft p-3 text-sm text-[#C2255C]">{parsed.error}</div>}
          {parsed?.ok && (
            <div className="rounded-2xl bg-lime-soft p-3.5 text-sm">
              <div className="font-bold text-[#2F7A1F]">{parsed.state.trip.title}</div>
              <div className="mt-1 text-ink">
                {parsed.state.trip.days.length} days · {parsed.state.trip.days.reduce((a, d) => a + d.stops.length, 0)} stops ·{' '}
                {parsed.state.expenses.length} expenses
              </div>
            </div>
          )}
          <Toggle checked={alsoRates} onChange={setAlsoRates} label="Also replace my rates & payment methods" />
          <Button block tone="pink" disabled={!parsed?.ok} onClick={doImport}>
            Replace my current trip
          </Button>
          <p className="text-center text-xs text-muted">This overwrites the trip and expenses on this phone.</p>
        </div>
      )}

      {mode === 'reset' && (
        <div className="space-y-3 pb-2">
          <p className="text-sm text-muted">Your current trip and its expenses will be replaced. Export a backup first if you might want them later.</p>
          <Button block variant="glass" onClick={doExport}>
            <Share2 size={18} /> Export backup first
          </Button>
          <Button
            block
            tone="pink"
            onClick={() => {
              const next = buildBlankState(state);
              replace(next);
              ui.setDayId(next.trip.days[0].id);
              ui.toast('Fresh trip started');
              close();
            }}
          >
            <RotateCcw size={18} /> Start a blank trip
          </Button>
          <Button
            block
            variant="glass"
            onClick={() => {
              const next = { ...buildSampleState(), rates: state.rates, methods: state.methods };
              replace(next);
              ui.setDayId(next.trip.days[0].id);
              ui.toast('Sample Vietnam trip loaded');
              close();
            }}
          >
            <Sparkles size={18} /> Load the Vietnam sample trip
          </Button>
        </div>
      )}
    </Sheet>
  );
}
