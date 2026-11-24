// Renders the Tide & Trail icon + splash sources for `npx @capacitor/assets generate`.
// Run: node scripts/make-icons.mjs
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('assets', { recursive: true });

const bg = `
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7DD3F5"/>
      <stop offset="0.55" stop-color="#3FD3C4"/>
      <stop offset="1" stop-color="#1E6B7B"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#sky)"/>`;

// Everything important sits inside the central 66% so adaptive-icon masks never clip it.
const fg = `
  <defs>
    <radialGradient id="sun" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#FFE9A8"/>
      <stop offset="0.6" stop-color="#FFC870"/>
      <stop offset="1" stop-color="#FF9F2E"/>
    </radialGradient>
    <linearGradient id="w1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#E3F7F4"/>
    </linearGradient>
    <linearGradient id="w2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2EC4B6"/>
      <stop offset="1" stop-color="#1E6B7B"/>
    </linearGradient>
    <linearGradient id="pin" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FF8FA8"/>
      <stop offset="1" stop-color="#FF5C80"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#0B3B44" flood-opacity="0.28"/>
    </filter>
  </defs>
  <g filter="url(#soft)">
    <circle cx="512" cy="455" r="150" fill="url(#sun)"/>
    <path d="M-20 575 C 80 520, 180 520, 280 565 S 460 615, 560 570 S 760 515, 860 555 S 1000 590, 1044 570 L 1044 1044 L -20 1044 Z" fill="url(#w1)"/>
    <path d="M-20 640 C 90 600, 190 600, 300 640 S 480 690, 590 645 S 780 600, 880 630 S 1000 660, 1044 640 L 1044 1044 L -20 1044 Z" fill="url(#w2)"/>
    <path d="M300 760 C 380 700, 470 720, 540 690 S 650 640, 690 600" fill="none" stroke="#FFF1DC" stroke-width="20" stroke-linecap="round" stroke-dasharray="2 44"/>
    <g transform="translate(690 470)">
      <path d="M0 125 C -18 95 -62 62 -62 22 A 62 62 0 0 1 62 22 C 62 62 18 95 0 125 Z" fill="url(#pin)" stroke="#FFFFFF" stroke-width="12"/>
      <circle cx="0" cy="22" r="22" fill="#FFFFFF"/>
    </g>
  </g>`;

const svg = (inner, size = 1024) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${inner}</svg>`);

await sharp(svg(bg + fg)).png().toFile('assets/icon-only.png');
await sharp(svg(fg)).png().toFile('assets/icon-foreground.png');
await sharp(svg(bg)).png().toFile('assets/icon-background.png');

// Splash: warm sand with the rounded icon in the middle.
const rounded = await sharp(svg(`<clipPath id="r"><rect width="1024" height="1024" rx="230"/></clipPath><g clip-path="url(#r)">${bg + fg}</g>`))
  .resize(620, 620)
  .png()
  .toBuffer();
for (const [name, color] of [['splash.png', '#FFF7EE'], ['splash-dark.png', '#FFF7EE']]) {
  await sharp({ create: { width: 2732, height: 2732, channels: 4, background: color } })
    .composite([{ input: rounded, gravity: 'center' }])
    .png()
    .toFile(`assets/${name}`);
}

// Web favicon too.
writeFileSync('public/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><clipPath id="r"><rect width="1024" height="1024" rx="230"/></clipPath><g clip-path="url(#r)">${bg + fg}</g></svg>`);
console.log('icons written');
