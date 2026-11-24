// Pre-fetches Wikimedia Commons photos for the built-in sample trip.
// Run: node scripts/fetch-sample-photos.ts   (re-run to fill any gaps; existing entries are kept)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { SAMPLE_DAYS } from '../src/data/sampleDays.ts';
import { findPhotos } from '../src/lib/photos.ts';

const file = new URL('../src/data/samplePhotos.json', import.meta.url);
const out: Record<string, unknown[]> = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};

const realFetch = globalThis.fetch;
globalThis.fetch = (input, init) =>
  realFetch(input, {
    ...init,
    headers: { ...(init?.headers as Record<string, string>), 'User-Agent': 'TideAndTrail-build/1.0 (sample data script)' },
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

for (const [, stops] of SAMPLE_DAYS) {
  for (const [name, lat, lng, , vibe] of stops) {
    if (vibe === 'transit' || out[name]?.length) continue;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        out[name] = await findPhotos(name, lat, lng, 5);
        console.log(`${out[name].length}  ${name}`);
        break;
      } catch (e) {
        console.log(`retry ${name}: ${(e as Error).message}`);
        await sleep(8000 * (attempt + 1));
      }
    }
    writeFileSync(file, JSON.stringify(out, null, 1));
    await sleep(2500);
  }
}
