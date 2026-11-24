import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, MapPin, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { useStore, findStop, newId } from '../hooks/useAppStore';
import { useUi } from '../hooks/useUi';
import { TIMES, TIME_META, VIBES, VIBE_META, dayTone } from '../data/meta';
import { usePlaceSearch } from '../lib/photon';
import { findPhotos } from '../lib/photos';
import { googleMapsUrl, openExternal } from '../lib/native';
import type { Stop } from '../types';
import { PhotoStrip } from './PhotoStrip';
import { Button, Chip, Emoji, Field, Sheet, TextInput, cx, inputCls } from './ui';

const blank = (): Stop => ({
  id: newId('s'),
  name: '',
  lat: null,
  lng: null,
  time: 'morning',
  vibe: 'nature',
  note: '',
});

export default function StopEditor() {
  const { state, update } = useStore();
  const ui = useUi();
  const req = ui.stopRequest;
  const existing = req?.stopId ? findStop(state, req.stopId) : null;

  const [draft, setDraft] = useState<Stop>(blank);
  const [dayId, setDayId] = useState('');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [photosTouched, setPhotosTouched] = useState(false);

  // Load the request into a local draft whenever the sheet opens.
  useEffect(() => {
    if (!req) return;
    if (existing) {
      setDraft(structuredClone(existing.stop));
      setDayId(existing.day.id);
    } else {
      setDraft({ ...blank(), ...req.draft });
      setDayId(req.dayId ?? state.trip.days[0]?.id ?? '');
    }
    setQuery('');
    setSearching(false);
    setConfirmDelete(false);
    setPhotosTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);

  const bias = useMemo(() => {
    const day = state.trip.days.find((d) => d.id === dayId);
    const s = day?.stops.find((x) => x.lat !== null);
    return s ? { lat: s.lat!, lng: s.lng! } : undefined;
  }, [state.trip.days, dayId]);
  const { results, loading, error } = usePlaceSearch(searching ? query : '', bias);

  if (!req) return null;
  const close = () => ui.openStop(null);
  const set = <K extends keyof Stop>(k: K, v: Stop[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = () => {
    const name = draft.name.trim() || 'Untitled stop';
    update((s) => {
      const loc = findStop(s, draft.id);
      // Name or pin changed → look photos up again.
      const prev = loc?.stop;
      const photos =
        prev && !photosTouched && (prev.name !== name || prev.lat !== draft.lat || prev.lng !== draft.lng)
          ? undefined
          : draft.photos;
      const next: Stop = { ...draft, name, photos };
      if (loc && loc.day.id === dayId) {
        loc.day.stops[loc.stopIndex] = next;
      } else {
        if (loc) loc.day.stops.splice(loc.stopIndex, 1);
        s.trip.days.find((d) => d.id === dayId)?.stops.push(next);
        for (const e of s.expenses) if (e.stopId === next.id) e.dayId = dayId;
      }
    });
    if (dayId !== ui.dayId) ui.setDayId(dayId);
    ui.setActiveStopId(draft.id);
    ui.toast(existing ? 'Stop updated' : 'Stop added');
    close();
  };

  const remove = () => {
    update((s) => {
      const loc = findStop(s, draft.id);
      if (loc) loc.day.stops.splice(loc.stopIndex, 1);
      for (const e of s.expenses) if (e.stopId === draft.id) e.stopId = undefined;
    });
    ui.toast('Stop deleted');
    close();
  };

  const refreshPhotos = async () => {
    setPhotoBusy(true);
    try {
      const photos = await findPhotos(draft.name, draft.lat, draft.lng, 6);
      set('photos', photos);
      setPhotosTouched(true);
      ui.toast(photos.length ? `Found ${photos.length} photos` : 'No photos found for this place');
    } catch {
      ui.toast('Couldn’t reach Wikimedia — try again online');
    } finally {
      setPhotoBusy(false);
    }
  };

  const hasPin = draft.lat !== null && draft.lng !== null;

  return (
    <Sheet
      open
      tall
      onClose={close}
      emoji={VIBE_META[draft.vibe].emoji}
      title={existing ? 'Edit stop' : 'New stop'}
      footer={
        <div className="flex gap-2">
          {existing && (
            <Button variant="danger" onClick={() => setConfirmDelete(true)} aria-label="Delete stop">
              <Trash2 size={16} />
            </Button>
          )}
          <Button block tone="aqua" onClick={save}>
            {existing ? 'Save changes' : 'Add stop'}
          </Button>
        </div>
      }
    >
      {confirmDelete && (
        <div className="mb-3 animate-rise rounded-2xl bg-pink-soft p-3">
          <div className="text-[13px] font-semibold text-[#C2255C]">Delete “{draft.name || 'this stop'}”?</div>
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

      <Field label="Place name">
        <TextInput value={draft.name} placeholder="An Bang Beach" onChange={(e) => set('name', e.target.value)} />
      </Field>

      <Field label="Location">
        {searching ? (
          <div>
            <div className="relative">
              <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search beaches, cafes, viewpoints…"
                className={cx(inputCls, 'pr-9 pl-9')}
              />
              <button type="button" aria-label="Cancel search" onClick={() => setSearching(false)} className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-muted">
                <X size={16} />
              </button>
            </div>
            <div className="mt-1.5 overflow-hidden rounded-2xl">
              {loading && (
                <div className="flex items-center gap-2 p-3 text-[13px] text-muted">
                  <Loader2 size={14} className="animate-spin" /> Searching…
                </div>
              )}
              {error && <div className="p-3 text-[13px] text-[#C2255C]">{error}</div>}
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setDraft((d) => ({ ...d, lat: r.lat, lng: r.lng, name: d.name.trim() ? d.name : r.name, photos: undefined }));
                    setSearching(false);
                  }}
                  className="flex w-full items-start gap-2 border-b border-ink/5 bg-white/70 px-3 py-2.5 text-left active:bg-aqua-soft"
                >
                  <MapPin size={15} className="mt-0.5 shrink-0 text-pink" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold">{r.name}</span>
                    <span className="block truncate text-[11.5px] text-muted">{[r.kind, r.label].filter(Boolean).join(' · ')}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setQuery(draft.name);
                setSearching(true);
              }}
              className={cx(inputCls, 'flex items-center gap-2 text-left')}
            >
              <Emoji name="pushpin" size={16} />
              {hasPin ? (
                <span className="num text-[12.5px]">
                  {draft.lat!.toFixed(5)}, {draft.lng!.toFixed(5)}
                </span>
              ) : (
                <span className="text-muted">Search to pin this place</span>
              )}
            </button>
            {hasPin && (
              <Button variant="glass" small onClick={() => void openExternal(googleMapsUrl(draft.lat!, draft.lng!))}>
                <ExternalLink size={13} /> Google
              </Button>
            )}
          </div>
        )}
      </Field>

      <Field label="Day">
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1">
          {state.trip.days.map((d, i) => (
            <Chip key={d.id} tone={dayTone(i)} active={d.id === dayId} onClick={() => setDayId(d.id)}>
              Day {i + 1}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Time of day">
        <div className="grid grid-cols-4 gap-1.5">
          {TIMES.map((t) => (
            <Chip key={t} tone={TIME_META[t].tone} active={draft.time === t} onClick={() => set('time', t)} className="flex-col !gap-0.5 !rounded-2xl !py-1.5">
              <Emoji name={TIME_META[t].emoji} size={20} />
              <span className="text-[10.5px]">{TIME_META[t].label}</span>
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Vibe">
        <div className="flex flex-wrap gap-1.5">
          {VIBES.map((v) => (
            <Chip key={v} tone={VIBE_META[v].tone} active={draft.vibe === v} onClick={() => set('vibe', v)}>
              <Emoji name={VIBE_META[v].emoji} size={15} /> {VIBE_META[v].label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Couple’s vibe note">
        <textarea
          value={draft.note}
          onChange={(e) => set('note', e.target.value)}
          placeholder="Go at sunset, share the coconut ice cream…"
          className={cx(inputCls, 'h-20 resize-none')}
        />
      </Field>

      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-muted uppercase">
          <Emoji name="camera" size={15} /> Photos · Wikimedia Commons
        </span>
        <Button small variant="glass" disabled={photoBusy || !draft.name.trim()} onClick={refreshPhotos}>
          <RefreshCw size={12} className={photoBusy ? 'animate-spin' : ''} /> Find photos
        </Button>
      </div>
      {draft.photos?.length ? (
        <PhotoStrip photos={draft.photos} name={draft.name} height={110} />
      ) : (
        <div className="rounded-2xl bg-ink/[0.03] p-3 text-center text-[12px] text-muted">
          {draft.photos === undefined ? 'Photos are found automatically after you save.' : 'No photos found for this place yet.'}
        </div>
      )}
    </Sheet>
  );
}
