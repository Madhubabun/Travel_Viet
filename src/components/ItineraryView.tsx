import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { useStore, newId } from '../hooks/useAppStore';
import { useUi } from '../hooks/useUi';
import { TIME_META, VIBE_META, dayTone, toneVars } from '../data/meta';
import { formatCompact, formatDate, formatInr } from '../utils/format';
import { inrToForeignDisplay } from '../utils/currency';
import { dayDate, totalsByDay, totalsByStop } from '../utils/tripOps';
import { googleMapsUrl, navigateTo, openExternal } from '../lib/native';
import type { Day, Stop } from '../types';
import TripHeader from './TripHeader';
import { PhotoStrip } from './PhotoStrip';
import { Badge, Button, Emoji, Empty, IconButton, Sheet, cx, inputCls } from './ui';

export default function ItineraryView() {
  const { state, update } = useStore();
  const ui = useUi();
  const { trip } = state;
  const dayIndex = Math.max(0, trip.days.findIndex((d) => d.id === ui.dayId));
  const day = trip.days[dayIndex];
  const stopTotals = useMemo(() => totalsByStop(state.expenses), [state.expenses]);
  const dayTotals = useMemo(() => totalsByDay(state.expenses), [state.expenses]);

  const addDay = () => {
    const id = newId('d');
    update((s) => void s.trip.days.push({ id, title: `Day ${s.trip.days.length + 1}`, stops: [] }));
    ui.setDayId(id);
  };

  return (
    <div className="scroll-area h-full pb-tabbar">
      <TripHeader />
      <DayPills onAdd={addDay} />
      {day ? (
        <div className="px-3">
          <DayHeader day={day} index={dayIndex} spent={dayTotals.get(day.id) ?? 0} />
          <StopList day={day} dayIndex={dayIndex} totals={stopTotals} />
          <button
            type="button"
            onClick={() => ui.openStop({ dayId: day.id })}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-[18px] border-2 border-dashed border-ink/10 py-3 text-[13px] font-semibold text-ocean active:scale-[0.98]"
          >
            <Plus size={16} /> Add a stop to Day {dayIndex + 1}
          </button>
        </div>
      ) : (
        <Empty emoji="backpack" title="No days yet" body="Add your first day to start planning." />
      )}
    </div>
  );
}

/* ---------- Day pills ---------- */

function DayPills({ onAdd }: { onAdd: () => void }) {
  const { state } = useStore();
  const ui = useUi();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>(`[data-day="${ui.dayId}"]`);
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [ui.dayId]);

  return (
    <div className="sticky top-0 z-20 pt-[calc(6px+var(--sat))] pb-1.5">
      <div ref={ref} className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 py-1.5">
        {state.trip.days.map((d, i) => {
          const tone = dayTone(i);
          const active = d.id === ui.dayId;
          return (
            <button
              key={d.id}
              data-day={d.id}
              type="button"
              onClick={() => ui.setDayId(d.id)}
              style={active ? toneVars(tone) : undefined}
              className={cx(
                'flex shrink-0 flex-col items-start rounded-2xl px-3 py-1 text-left transition active:scale-95',
                active ? 'puff' : 'glass',
              )}
            >
              <span className="flex items-center gap-1 text-[12px] font-bold" style={active ? undefined : { color: tone.ink }}>
                {!active && <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.to }} />}
                Day {i + 1}
              </span>
              <span className={cx('text-[10.5px] font-medium', active ? 'opacity-85' : 'text-muted')}>
                {formatDate(dayDate(state.trip, i), { weekday: 'short', day: 'numeric' })}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          aria-label="Add day"
          onClick={onAdd}
          className="glass flex w-10 shrink-0 items-center justify-center rounded-2xl text-ocean active:scale-95"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}

/* ---------- Day header ---------- */

function DayHeader({ day, index, spent }: { day: Day; index: number; spent: number }) {
  const { state, update } = useStore();
  const ui = useUi();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [title, setTitle] = useState(day.title);
  const tone = dayTone(index);
  useEffect(() => setTitle(day.title), [day.title]);

  const save = () => {
    update((s) => {
      const d = s.trip.days.find((x) => x.id === day.id);
      if (d) d.title = title.trim() || `Day ${index + 1}`;
    });
    setEditing(false);
  };

  const remove = () => {
    const nextId = state.trip.days[index + 1]?.id ?? state.trip.days[index - 1]?.id ?? 'all';
    update((s) => {
      const stopIds = new Set(day.stops.map((x) => x.id));
      s.trip.days = s.trip.days.filter((d) => d.id !== day.id);
      for (const e of s.expenses) {
        if (e.dayId === day.id) e.dayId = undefined;
        if (e.stopId && stopIds.has(e.stopId)) e.stopId = undefined;
      }
    });
    ui.setDayId(nextId);
    setConfirmDelete(false);
    ui.toast('Day removed');
  };

  return (
    <div className="mt-1 mb-2 flex items-center gap-2 px-1">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold tracking-wider uppercase" style={{ color: tone.ink }}>
          Day {index + 1} · {formatDate(dayDate(state.trip, index), { weekday: 'long', day: 'numeric', month: 'short' })}
        </div>
        {editing ? (
          <div className="mt-1 flex gap-1.5">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              className={cx(inputCls, 'py-1.5 text-[15px] font-bold')}
            />
            <IconButton label="Save title" onClick={save} className="puff" style={toneVars('lime')}>
              <Check size={16} />
            </IconButton>
          </div>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-left active:opacity-70">
            <h2 className="text-[17px] leading-snug font-extrabold text-ink">{day.title}</h2>
            <Pencil size={12} className="shrink-0 text-muted" />
          </button>
        )}
      </div>
      {spent > 0 && !editing && (
        <div className="text-right">
          <div className="num text-[13px] font-semibold text-money">{formatInr(spent)}</div>
          <div className="num text-[10.5px] text-muted">
            {formatCompact(inrToForeignDisplay(spent, state.trip.homeForeign, state.rates), state.trip.homeForeign)}
          </div>
        </div>
      )}
      {!editing && (
        <IconButton label="Delete day" onClick={() => setConfirmDelete(true)}>
          <Trash2 size={15} />
        </IconButton>
      )}
      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Delete Day ${index + 1}?`} emoji="wastebasket">
        <p className="mb-4 text-[13px] text-muted">
          “{day.title}” and its {day.stops.length} stops will be removed. Expenses stay in the wallet but lose their day link.
        </p>
        <div className="grid grid-cols-2 gap-2 pb-2">
          <Button variant="glass" onClick={() => setConfirmDelete(false)}>
            Keep it
          </Button>
          <Button tone="pink" onClick={remove}>
            Delete day
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

/* ---------- Sortable stop list ---------- */

function StopList({ day, dayIndex, totals }: { day: Day; dayIndex: number; totals: Map<string, number> }) {
  const { update } = useStore();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    update((s) => {
      const d = s.trip.days.find((x) => x.id === day.id);
      if (!d) return;
      const from = d.stops.findIndex((x) => x.id === active.id);
      const to = d.stops.findIndex((x) => x.id === over.id);
      if (from >= 0 && to >= 0) d.stops = arrayMove(d.stops, from, to);
    });
  };

  if (!day.stops.length) {
    return <Empty emoji="compass" title="Nothing planned yet" body="Add a stop here, or search the map and drop it into this day." />;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={day.stops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2.5">
          {day.stops.map((stop, i) => (
            <StopCard key={stop.id} stop={stop} index={i} day={day} dayIndex={dayIndex} total={totals.get(stop.id) ?? 0} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function StopCard({ stop, index, day, dayIndex, total }: { stop: Stop; index: number; day: Day; dayIndex: number; total: number }) {
  const { state } = useStore();
  const ui = useUi();
  const tone = dayTone(dayIndex);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: stop.id });
  const active = ui.activeStopId === stop.id;
  const hasPin = stop.lat !== null && stop.lng !== null;
  const time = TIME_META[stop.time];
  const vibe = VIBE_META[stop.vibe];
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [active]);

  // Long-press Navigate → Google Maps; tap → Android maps chooser.
  const pressTimer = useRef<number | undefined>(undefined);
  const longFired = useRef(false);

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        ref.current = el;
      }}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 30 : undefined,
        ...(active ? { boxShadow: `0 0 0 2px ${tone.to}, 0 10px 26px rgb(31 41 46 / 0.14)` } : {}),
      }}
      onClick={() => ui.openStop({ stopId: stop.id })}
      className={cx('glass animate-rise rounded-[18px] p-2.5 transition-shadow', isDragging && 'scale-[1.02] shadow-lift')}
    >
      {(stop.photos === undefined ? stop.vibe !== 'transit' : stop.photos.length > 0) && (
        <div className="mb-2">
          <PhotoStrip photos={stop.photos} name={stop.name} />
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <span className="puff flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold" style={toneVars(tone)}>
          {index + 1}
        </span>
        <Emoji name={vibe.emoji} size={17} />
        <h3 className="min-w-0 flex-1 truncate text-[14px] font-bold text-ink">{stop.name}</h3>
        <button
          ref={setActivatorNodeRef}
          type="button"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="-my-1 -mr-1 flex h-8 w-7 touch-none items-center justify-center rounded-lg text-ink/30 active:bg-ink/5"
        >
          <GripVertical size={16} />
        </button>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <Badge tone={time.tone} emoji={time.emoji}>
          {time.label}
        </Badge>
        <Badge tone={vibe.tone}>{vibe.label}</Badge>
        {total > 0 && (
          <span className="num ml-auto text-[12px] font-semibold text-money">
            {formatInr(total)}
            <span className="ml-1 font-normal text-muted">
              {formatCompact(inrToForeignDisplay(total, state.trip.homeForeign, state.rates), state.trip.homeForeign)}
            </span>
          </span>
        )}
      </div>

      {stop.note && <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-snug text-muted">{stop.note}</p>}

      <div className="mt-2 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <Button small variant="glass" disabled={!hasPin} onClick={() => ui.showOnMap(stop.id, day.id)}>
          <Emoji name="map" size={13} /> Map
        </Button>
        <Button small variant="glass" onClick={() => ui.openExpense({ draft: { title: stop.name, dayId: day.id, stopId: stop.id } })}>
          <Emoji name="cash" size={13} /> Log
        </Button>
        <Button
          small
          tone="teal"
          className="ml-auto"
          disabled={!hasPin}
          onPointerDown={() => {
            longFired.current = false;
            pressTimer.current = window.setTimeout(() => {
              longFired.current = true;
              if (hasPin) void openExternal(googleMapsUrl(stop.lat!, stop.lng!));
            }, 550);
          }}
          onPointerUp={() => window.clearTimeout(pressTimer.current)}
          onPointerLeave={() => window.clearTimeout(pressTimer.current)}
          onClick={() => {
            if (longFired.current || !hasPin) return;
            void navigateTo(stop.lat!, stop.lng!, stop.name);
          }}
        >
          Navigate ↗
        </Button>
      </div>
    </div>
  );
}
