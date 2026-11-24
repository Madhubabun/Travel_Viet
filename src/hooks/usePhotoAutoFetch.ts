import { useEffect, useRef } from 'react';
import { useStore } from './useAppStore';
import { findPhotos, wantsAutoPhotos } from '../lib/photos';

/**
 * Looks up Wikimedia Commons photos for stops that have never been checked,
 * one at a time, politely spaced, only while online. Results are stored on the stop.
 */
export function usePhotoAutoFetch() {
  const { state, update } = useStore();
  const busy = useRef(false);
  const failed = useRef(new Set<string>());

  useEffect(() => {
    if (busy.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const next = state.trip.days.flatMap((d) => d.stops).find((s) => wantsAutoPhotos(s) && !failed.current.has(s.id));
    if (!next) return;

    busy.current = true;
    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const photos = await findPhotos(next.name, next.lat, next.lng, 5, ctrl.signal);
        update((s) => {
          for (const d of s.trip.days) {
            const st = d.stops.find((x) => x.id === next.id);
            // Only store if the stop wasn't renamed in the meantime.
            if (st && st.name === next.name) st.photos = photos;
          }
        });
      } catch {
        if (!ctrl.signal.aborted) failed.current.add(next.id); // try again next app launch
      } finally {
        busy.current = false;
      }
    }, 900);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
      busy.current = false;
    };
  }, [state.trip.days, update]);
}
