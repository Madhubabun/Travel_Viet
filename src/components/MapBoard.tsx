import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { Geolocation } from '@capacitor/geolocation';
import { Loader2, MapPin, Plus, Search, X } from 'lucide-react';
import { useStore, findStop, newId } from '../hooks/useAppStore';
import { useUi } from '../hooks/useUi';
import { useBackHandler } from '../hooks/useBackHandler';
import { TIME_META, VIBE_META, dayTone, toneVars, type Tone } from '../data/meta';
import { usePlaceSearch, type Place } from '../lib/photon';
import { cachedObjectUrl, revokeIfBlob } from '../lib/netCache';
import { navigateTo } from '../lib/native';
import { inrToForeignDisplay } from '../utils/currency';
import { formatCompact, formatInr } from '../utils/format';
import { totalsByStop } from '../utils/tripOps';
import type { Stop, Vibe } from '../types';
import { CachedImage } from './PhotoStrip';
import { Badge, Button, Chip, Emoji, cx } from './ui';

// CARTO's free basemaps now answer "API key required", so we use the standard OpenStreetMap tiles
// (free, no key — https://operations.osmfoundation.org/policies/tiles/). Viewed tiles are cached on the device.
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/* ---------- Tiles that keep what you've seen (offline-friendly) ---------- */

const CachedTileLayer = L.TileLayer.extend({
  createTile(this: L.TileLayer, coords: L.Coords, done: L.DoneCallback) {
    const img = document.createElement('img');
    img.alt = '';
    img.setAttribute('role', 'presentation');
    const url = this.getTileUrl(coords);
    void cachedObjectUrl('tiles-osm-v1', url, 2000).then((src) => {
      img.onload = () => done(undefined, img);
      img.onerror = () => done(new Error('tile failed'), img);
      img.src = src;
    });
    return img;
  },
}) as unknown as new (url: string, opts: L.TileLayerOptions) => L.TileLayer;

function Tiles() {
  const map = useMap();
  useEffect(() => {
    const layer = new CachedTileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION, className: 'tt-tiles' });
    layer.on('tileunload', (e: L.TileEvent) => revokeIfBlob((e.tile as HTMLImageElement).src));
    layer.addTo(map);
    return () => {
      layer.remove();
    };
  }, [map]);
  return null;
}

/* ---------- Pins ---------- */

function pinIcon(n: number, tone: Tone, active: boolean, vibe: Vibe, dim: boolean) {
  const vars = `--p-from:${tone.from};--p-to:${tone.to};--p-edge:${tone.edge};--p-on:${tone.on}`;
  const inner = active ? `<img src="${import.meta.env.BASE_URL}emoji/${VIBE_META[vibe].emoji}.webp" alt="">` : `<span>${n}</span>`;
  const size = active ? 40 : 26;
  return L.divIcon({
    className: `tt-pin${active ? ' is-active' : ''}${dim ? ' is-dim' : ''}`,
    html: `<div class="tt-pin-body" style="${vars}">${inner}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size + 2],
  });
}
const meIcon = L.divIcon({ className: '', html: '<div class="tt-me"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
const dropIcon = L.divIcon({ className: '', html: '<div class="tt-drop"></div>', iconSize: [20, 20], iconAnchor: [10, 10] });

function guessVibe(kind: string): Vibe {
  if (/beach|bay|water|island|lake|coast|lagoon|river|marina/i.test(kind)) return 'beach';
  if (/cafe|restaurant|bar|food|pub|bakery|fast food|ice cream|market/i.test(kind)) return 'cafe';
  if (/hotel|hostel|guest|resort|apartment|motel|camp/i.test(kind)) return 'stay';
  if (/station|airport|aerodrome|bus|ferry|terminal|pier/i.test(kind)) return 'transit';
  return 'nature';
}

type Temp = { kind: 'search'; place: Place } | { kind: 'drop'; lat: number; lng: number } | { kind: 'me'; lat: number; lng: number };

export default function MapBoard({ active }: { active: boolean }) {
  const { state, update } = useStore();
  const ui = useUi();
  const [dropMode, setDropMode] = useState(false);
  const [temp, setTemp] = useState<Temp | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const totals = useMemo(() => totalsByStop(state.expenses), [state.expenses]);

  useBackHandler(active && dropMode, () => setDropMode(false));
  useBackHandler(active && !!temp, () => setTemp(null));
  useBackHandler(active && !!ui.activeStopId && !temp, () => ui.setActiveStopId(null));

  const days = state.trip.days;
  const showAll = ui.dayId === 'all';
  const visibleDays = days.map((d, i) => ({ d, i })).filter(({ d }) => showAll || d.id === ui.dayId);
  const targetDayIdx = showAll ? 0 : Math.max(0, days.findIndex((d) => d.id === ui.dayId));
  const targetDay = days[targetDayIdx];

  const activeLoc = ui.activeStopId ? findStop(state, ui.activeStopId) : null;

  // Leaflet needs a size refresh when its tab becomes visible.
  useEffect(() => {
    if (active) setTimeout(() => mapRef.current?.invalidateSize(), 60);
  }, [active]);

  const addPlaceToDay = (p: { name: string; lat: number; lng: number; vibe: Vibe }) => {
    if (!targetDay) return;
    const stop: Stop = { id: newId('s'), name: p.name, lat: p.lat, lng: p.lng, time: 'morning', vibe: p.vibe, note: '' };
    update((s) => void s.trip.days.find((d) => d.id === targetDay.id)?.stops.push(stop));
    ui.setDayId(targetDay.id);
    ui.setActiveStopId(stop.id);
    setTemp(null);
    ui.toast(`Added to Day ${targetDayIdx + 1}`);
  };

  const locate = async () => {
    setLocating(true);
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 12000 });
      const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setMe(here);
      setTemp({ kind: 'me', ...here });
      ui.setActiveStopId(null);
      mapRef.current?.flyTo([here.lat, here.lng], 16, { duration: 0.8 });
    } catch {
      ui.toast('Location unavailable — check permission or GPS');
    } finally {
      setLocating(false);
    }
  };

  const bottomCard = 'absolute inset-x-3 bottom-[calc(var(--tabbar-h)+14px)] z-[600] animate-rise';

  return (
    <div className="relative h-full">
      <MapContainer
        ref={mapRef}
        center={[16.2, 106.5]}
        zoom={6}
        zoomControl={false}
        className={cx('h-full w-full', dropMode && 'cursor-crosshair')}
        attributionControl
      >
        <Tiles />
        <MapController visibleStops={visibleDays.flatMap(({ d }) => d.stops)} />
        <ClickCatcher
          onClick={(lat, lng) => {
            if (dropMode) {
              setTemp({ kind: 'drop', lat, lng });
              setDropMode(false);
              ui.setActiveStopId(null);
            } else {
              ui.setActiveStopId(null);
              setTemp(null);
            }
          }}
        />
        {visibleDays.map(({ d, i }) => {
          const tone = dayTone(i);
          const pts = d.stops.filter((s) => s.lat !== null).map((s) => [s.lat!, s.lng!] as [number, number]);
          return (
            <Polyline
              key={`line-${d.id}`}
              positions={pts}
              pathOptions={{ color: tone.to, weight: 3.5, opacity: 0.85, dashArray: '7 7', lineCap: 'round' }}
            />
          );
        })}
        {visibleDays.flatMap(({ d, i }) =>
          d.stops
            .filter((s) => s.lat !== null && s.lng !== null)
            .map((s, n) => {
              const isActive = s.id === ui.activeStopId;
              return (
                <Marker
                  key={s.id}
                  position={[s.lat!, s.lng!]}
                  zIndexOffset={isActive ? 1000 : 0}
                  icon={pinIcon(d.stops.indexOf(s) + 1 || n + 1, dayTone(i), isActive, s.vibe, false)}
                  eventHandlers={{
                    click: () => {
                      setTemp(null);
                      ui.setActiveStopId(s.id);
                    },
                  }}
                />
              );
            }),
        )}
        {me && <Marker position={[me.lat, me.lng]} icon={meIcon} />}
        {temp?.kind === 'drop' && <Marker position={[temp.lat, temp.lng]} icon={dropIcon} />}
        {temp?.kind === 'search' && <Marker position={[temp.place.lat, temp.place.lng]} icon={dropIcon} />}
      </MapContainer>

      {/* Floating top controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[700] px-3 pt-[calc(10px+var(--sat))]">
        <SearchBox
          bias={activeLoc?.stop.lat != null ? { lat: activeLoc.stop.lat, lng: activeLoc.stop.lng! } : undefined}
          dayLabel={targetDay ? `Day ${targetDayIdx + 1}` : ''}
          dayTone={dayTone(targetDayIdx)}
          onPick={(place) => {
            setTemp({ kind: 'search', place });
            ui.setActiveStopId(null);
            mapRef.current?.flyTo([place.lat, place.lng], 15, { duration: 0.8 });
          }}
          onQuickAdd={(place) => addPlaceToDay({ name: place.name, lat: place.lat, lng: place.lng, vibe: guessVibe(place.kind) })}
        />
        <div className="no-scrollbar pointer-events-auto mt-2 flex gap-1.5 overflow-x-auto pb-1">
          <Chip tone="teal" active={showAll} onClick={() => ui.setDayId('all')}>
            <Emoji name="map" size={13} /> All days
          </Chip>
          {days.map((d, i) => (
            <Chip key={d.id} tone={dayTone(i)} active={d.id === ui.dayId} onClick={() => ui.setDayId(d.id)}>
              Day {i + 1}
            </Chip>
          ))}
        </div>
      </div>

      {/* Floating side buttons */}
      <div className="absolute top-[calc(118px+var(--sat))] right-3 z-[650] flex flex-col gap-2">
        <button
          type="button"
          aria-label={dropMode ? 'Cancel drop pin' : 'Drop a custom pin'}
          onClick={() => {
            setDropMode((v) => !v);
            setTemp(null);
          }}
          style={dropMode ? toneVars('pink') : undefined}
          className={cx('flex h-10 w-10 items-center justify-center rounded-2xl active:scale-90', dropMode ? 'puff' : 'glass')}
        >
          <Emoji name="pushpin" size={20} />
        </button>
        <button
          type="button"
          aria-label="Show my location"
          onClick={locate}
          className="glass flex h-10 w-10 items-center justify-center rounded-2xl active:scale-90"
        >
          {locating ? <Loader2 size={18} className="animate-spin text-sky" /> : <Emoji name="compass" size={20} />}
        </button>
      </div>

      {dropMode && (
        <div className="pointer-events-none absolute inset-x-0 top-[calc(118px+var(--sat))] z-[640] flex justify-center">
          <div className="puff animate-pop rounded-full px-3 py-1.5 text-[12px] font-semibold" style={toneVars('pink')}>
            Tap anywhere to drop a pin
          </div>
        </div>
      )}

      {/* Bottom preview cards */}
      {activeLoc && !temp && (
        <StopPreview key={activeLoc.stop.id} stop={activeLoc.stop} dayIndex={activeLoc.dayIndex} total={totals.get(activeLoc.stop.id) ?? 0} className={bottomCard} />
      )}

      {temp && (
        <div className={cx(bottomCard, 'glass rounded-[20px] p-3')}>
          <div className="flex items-start gap-2.5">
            <Emoji name={temp.kind === 'me' ? 'compass' : temp.kind === 'drop' ? 'pushpin' : VIBE_META[guessVibe(temp.place.kind)].emoji} size={30} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-bold">
                {temp.kind === 'search' ? temp.place.name : temp.kind === 'me' ? 'You are here' : 'New custom spot'}
              </div>
              <div className="truncate text-[12px] text-muted">
                {temp.kind === 'search'
                  ? [temp.place.kind, temp.place.label].filter(Boolean).join(' · ')
                  : `${temp.lat.toFixed(5)}, ${temp.lng.toFixed(5)}`}
              </div>
            </div>
            <button type="button" aria-label="Dismiss" onClick={() => setTemp(null)} className="p-1 text-muted">
              <X size={16} />
            </button>
          </div>
          <div className="mt-2.5 flex gap-2">
            <Button
              small
              variant="glass"
              onClick={() => {
                const base =
                  temp.kind === 'search'
                    ? { name: temp.place.name, lat: temp.place.lat, lng: temp.place.lng, vibe: guessVibe(temp.place.kind) }
                    : { name: temp.kind === 'me' ? 'Spot I found' : 'Hidden spot', lat: temp.lat, lng: temp.lng, vibe: 'nature' as Vibe };
                ui.openStop({ dayId: targetDay?.id, draft: base });
                setTemp(null);
              }}
            >
              Add with details…
            </Button>
            <Button
              small
              className="ml-auto"
              style={toneVars(dayTone(targetDayIdx))}
              disabled={!targetDay}
              onClick={() =>
                addPlaceToDay(
                  temp.kind === 'search'
                    ? { name: temp.place.name, lat: temp.place.lat, lng: temp.place.lng, vibe: guessVibe(temp.place.kind) }
                    : { name: temp.kind === 'me' ? 'Spot I found' : 'Hidden spot', lat: temp.lat, lng: temp.lng, vibe: 'nature' },
                )
              }
            >
              <Plus size={14} /> {temp.kind === 'me' ? 'Drop pin here' : 'Add'} to Day {targetDayIdx + 1}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Map helpers ---------- */

function ClickCatcher({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

/** Fits the selected day(s) and flies to a stop when asked from the itinerary. */
function MapController({ visibleStops }: { visibleStops: Stop[] }) {
  const map = useMap();
  const ui = useUi();
  const { state } = useStore();
  const key = visibleStops.map((s) => `${s.id}:${s.lat}:${s.lng}`).join('|');
  const lastFocus = useRef(0);

  useEffect(() => {
    if (ui.mapFocusNonce !== lastFocus.current) return; // a focus request wins
    const pts = visibleStops.filter((s) => s.lat !== null).map((s) => [s.lat!, s.lng!] as [number, number]);
    if (!pts.length) return;
    if (pts.length === 1) map.setView(pts[0], 14);
    else map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], paddingTopLeft: [40, 150], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.dayId, key]);

  useEffect(() => {
    if (ui.mapFocusNonce === lastFocus.current) return;
    lastFocus.current = ui.mapFocusNonce;
    const loc = ui.activeStopId ? findStop(state, ui.activeStopId) : null;
    if (loc?.stop.lat != null) {
      setTimeout(() => map.flyTo([loc.stop.lat!, loc.stop.lng!], 15, { duration: 0.9 }), 80);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.mapFocusNonce]);

  return null;
}

function SearchBox({
  bias,
  dayLabel,
  dayTone: tone,
  onPick,
  onQuickAdd,
}: {
  bias?: { lat: number; lng: number };
  dayLabel: string;
  dayTone: Tone;
  onPick: (p: Place) => void;
  onQuickAdd: (p: Place) => void;
}) {
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const { results, loading, error } = usePlaceSearch(q, bias);
  const open = focused && q.trim().length >= 2;
  useBackHandler(open, () => setFocused(false));

  return (
    <div className="pointer-events-auto relative">
      <div className="glass flex items-center gap-2 rounded-full px-3 py-2">
        <Emoji name="search" size={17} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Search beaches, cafes, viewpoints…"
          className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted/70"
        />
        {loading ? (
          <Loader2 size={16} className="animate-spin text-muted" />
        ) : q ? (
          <button type="button" aria-label="Clear search" onClick={() => setQ('')} className="text-muted">
            <X size={16} />
          </button>
        ) : (
          <Search size={16} className="text-muted/60" />
        )}
      </div>
      {open && (
        <div className="glass-solid mt-1.5 max-h-[50vh] animate-rise overflow-y-auto rounded-[18px] shadow-lift">
          {error && <div className="p-3 text-[13px] text-[#C2255C]">{error}</div>}
          {!error && !loading && !results.length && <div className="p-3 text-[13px] text-muted">No places found.</div>}
          {results.map((r) => (
            <div key={r.id} className="flex items-center gap-2 border-b border-ink/5 px-3 py-2 last:border-0">
              <button
                type="button"
                onClick={() => {
                  onPick(r);
                  setFocused(false);
                  (document.activeElement as HTMLElement | null)?.blur();
                }}
                className="flex min-w-0 flex-1 items-start gap-2 text-left"
              >
                <MapPin size={15} className="mt-0.5 shrink-0 text-pink" />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold">{r.name}</span>
                  <span className="block truncate text-[11.5px] text-muted">{[r.kind, r.label].filter(Boolean).join(' · ')}</span>
                </span>
              </button>
              {dayLabel && (
                <button
                  type="button"
                  onClick={() => {
                    onQuickAdd(r);
                    setQ('');
                    setFocused(false);
                  }}
                  style={toneVars(tone)}
                  className="puff flex shrink-0 items-center gap-0.5 rounded-full px-2 py-1 text-[11px] font-bold"
                >
                  <Plus size={12} />
                  {dayLabel}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StopPreview({ stop, dayIndex, total, className }: { stop: Stop; dayIndex: number; total: number; className: string }) {
  const { state } = useStore();
  const ui = useUi();
  const photo = stop.photos?.[0];
  const time = TIME_META[stop.time];
  return (
    <div className={cx(className, 'glass rounded-[20px] p-2.5')}>
      <div className="flex gap-2.5">
        {photo ? (
          <CachedImage src={photo.thumb} alt={stop.name} className="h-[68px] w-[68px] shrink-0 rounded-2xl" />
        ) : (
          <span className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-2xl" style={{ background: dayTone(dayIndex).soft }}>
            <Emoji name={VIBE_META[stop.vibe].emoji} size={34} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-bold">{stop.name}</div>
          <div className="mt-0.5 flex flex-wrap gap-1">
            <Badge tone={dayTone(dayIndex)}>Day {dayIndex + 1}</Badge>
            <Badge tone={time.tone} emoji={time.emoji}>
              {time.label}
            </Badge>
          </div>
          {total > 0 ? (
            <div className="num mt-1 text-[12px] font-semibold text-money">
              {formatInr(total)} · {formatCompact(inrToForeignDisplay(total, state.trip.homeForeign, state.rates), state.trip.homeForeign)}
            </div>
          ) : (
            stop.note && <div className="mt-1 line-clamp-1 text-[12px] text-muted">{stop.note}</div>
          )}
        </div>
      </div>
      {total > 0 && stop.note && <div className="mt-1.5 line-clamp-2 text-[12px] text-muted">{stop.note}</div>}
      <div className="mt-2 flex gap-1.5">
        <Button small variant="glass" onClick={() => ui.openStop({ stopId: stop.id })}>
          <Emoji name="pencil" size={12} /> Edit
        </Button>
        <Button
          small
          variant="glass"
          onClick={() => {
            ui.setDayId(state.trip.days[dayIndex].id);
            ui.setTab('itinerary');
          }}
        >
          <Emoji name="trip" size={12} /> In plan
        </Button>
        <Button small tone="teal" className="ml-auto" onClick={() => void navigateTo(stop.lat!, stop.lng!, stop.name)}>
          Navigate ↗
        </Button>
      </div>
    </div>
  );
}
