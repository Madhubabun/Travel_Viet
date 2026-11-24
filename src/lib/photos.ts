import type { Photo, Stop } from '../types';

/**
 * Free place photos from Wikimedia Commons (no API key).
 * 1. Search Commons by place name.  2. Top up with photos taken within ~1 km of the pin.
 */

const API = 'https://commons.wikimedia.org/w/api.php';
const BAD_TITLE = /\b(map|logo|flag|diagram|plan|chart|coat of arms|seal|icon|locator|svg|pdf)\b/i;

interface ImageInfo {
  thumburl?: string;
  width: number;
  height: number;
  mime?: string;
  descriptionurl: string;
  extmetadata?: Record<string, { value: string } | undefined>;
}
interface Page {
  title: string;
  index?: number;
  imageinfo?: ImageInfo[];
}

function baseParams(): URLSearchParams {
  return new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: '960',
    iiextmetadatafilter: 'Artist|LicenseShortName',
  });
}

async function query(params: URLSearchParams, signal?: AbortSignal): Promise<Page[]> {
  const res = await fetch(`${API}?${params}`, {
    signal,
    headers: { 'Api-User-Agent': 'TideAndTrail/1.0 (personal travel planner)' },
  });
  if (!res.ok) throw new Error(`Commons ${res.status}`);
  const json = (await res.json()) as { query?: { pages?: Record<string, Page> } };
  const pages = Object.values(json.query?.pages ?? {});
  return pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
}

function stripHtml(s: string): string {
  const txt = s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return txt.length > 60 ? `${txt.slice(0, 57)}…` : txt;
}

function toPhoto(p: Page): Photo | null {
  const info = p.imageinfo?.[0];
  if (!info?.thumburl) return null;
  if (info.mime && !/^image\/(jpeg|png|webp)$/.test(info.mime)) return null;
  if (BAD_TITLE.test(p.title)) return null;
  if (info.width < 900) return null;
  const ratio = info.width / info.height;
  if (ratio < 0.55 || ratio > 2.4) return null;
  return {
    thumb: info.thumburl,
    page: info.descriptionurl,
    credit: stripHtml(info.extmetadata?.Artist?.value ?? 'Wikimedia Commons') || 'Wikimedia Commons',
    license: stripHtml(info.extmetadata?.LicenseShortName?.value ?? 'CC'),
  };
}

export function searchName(name: string): string {
  return name
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[→⇄&,+/|"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function findPhotos(
  name: string,
  lat: number | null,
  lng: number | null,
  limit = 6,
  signal?: AbortSignal,
): Promise<Photo[]> {
  const out: Photo[] = [];
  const seen = new Set<string>();
  const add = (pages: Page[]) => {
    for (const p of pages) {
      if (out.length >= limit) return;
      if (seen.has(p.title)) continue;
      seen.add(p.title);
      const photo = toPhoto(p);
      if (photo) out.push(photo);
    }
  };

  const search = async (text: string) => {
    const params = baseParams();
    params.set('generator', 'search');
    params.set('gsrsearch', `${text} filetype:bitmap`);
    params.set('gsrnamespace', '6');
    params.set('gsrlimit', '14');
    add(await query(params, signal));
  };

  const words = searchName(name).split(' ').filter(Boolean);
  const hasPin = lat !== null && lng !== null;
  if (words.length && hasPin) {
    // Name search restricted to geotagged photos near the pin, so "Dragon Bridge"
    // finds Da Nang rather than Ljubljana. Drop trailing words if nothing matches
    // ("Lan Ha Bay kayak lagoons" → "Lan Ha Bay").
    for (let n = words.length, tries = 0; n >= Math.min(2, words.length) && tries < 3 && out.length < 3; n--, tries++) {
      await search(`${words.slice(0, n).join(' ')} nearcoord:15km,${lat},${lng}`);
    }
  } else if (words.length) {
    await search(words.join(' '));
  }
  if (out.length < limit && hasPin) {
    const params = baseParams();
    params.set('generator', 'geosearch');
    params.set('ggscoord', `${lat}|${lng}`);
    params.set('ggsradius', '1000');
    params.set('ggsnamespace', '6');
    params.set('ggslimit', '20');
    add(await query(params, signal));
  }
  return out;
}

/** Stops we look up automatically (transit legs rarely have useful photos). */
export function wantsAutoPhotos(stop: Stop): boolean {
  return stop.photos === undefined && stop.vibe !== 'transit' && stop.name.trim().length > 2;
}
