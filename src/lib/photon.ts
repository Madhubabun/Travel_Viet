import { useEffect, useState } from 'react';

/** Free geocoding by Komoot Photon (OpenStreetMap data, no key). */

export interface Place {
  id: string;
  name: string;
  label: string;
  kind: string;
  lat: number;
  lng: number;
}

interface Feature {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_id?: number;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    osm_value?: string;
  };
}

export async function searchPlaces(q: string, bias?: { lat: number; lng: number }, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({ q, limit: '7', lang: 'en' });
  if (bias) {
    params.set('lat', bias.lat.toFixed(4));
    params.set('lon', bias.lng.toFixed(4));
  }
  const res = await fetch(`https://photon.komoot.io/api/?${params}`, { signal });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const json = (await res.json()) as { features?: Feature[] };
  return (json.features ?? []).map((f, i) => {
    const p = f.properties;
    const name = p.name || [p.street, p.housenumber].filter(Boolean).join(' ') || p.city || 'Unnamed place';
    const label = [p.city || p.county, p.state, p.country].filter((x) => x && x !== name).join(', ');
    return {
      id: `${p.osm_id ?? i}-${f.geometry.coordinates.join(',')}`,
      name,
      label,
      kind: (p.osm_value ?? '').replace(/_/g, ' '),
      lng: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
    };
  });
}

/** Debounced search hook. */
export function usePlaceSearch(query: string, bias?: { lat: number; lng: number }) {
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const biasKey = bias ? `${bias.lat.toFixed(2)},${bias.lng.toFixed(2)}` : '';

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = window.setTimeout(async () => {
      try {
        if (!navigator.onLine) throw new Error('You’re offline — tap the map to drop a pin instead.');
        setResults(await searchPlaces(q, bias, ctrl.signal));
        setError(null);
      } catch (e) {
        if (!ctrl.signal.aborted) {
          setError((e as Error).message || 'Search failed');
          setResults([]);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 380);
    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, biasKey]);

  return { results, loading, error };
}
