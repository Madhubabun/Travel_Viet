# 🌊 Tide & Trail

A colourful, spatial-glass **couple's travel planner** for Android: shared day-by-day itinerary with real place photos, an offline-friendly map, a shared wallet (one pool, no bill-splitting), and a Vietnam-first **INR ↔ VND** pocket calculator that compares your cash, cards and forex cards side by side.

100% free stack — no accounts, no API keys, all data stays on the phone.

| | |
|---|---|
| **Trip** | Day pills, drag-to-reorder stops, time-of-day & vibe tags, couple's notes, Wikimedia photos per place, Navigate ↗ (long-press → Google Maps) |
| **Map** | OpenStreetMap tiles (cached as you browse), numbered pins per day colour, dashed routes, Photon search with 1-tap "+ Day N", Drop-pin mode, Locate me |
| **Calc** | VND/THB/IDR/MYR/SGD/USD, `+k` / `+M` keys, street-price chips, every payment method compared live (cheapest glows), log to wallet |
| **Wallet** | Budget gauge in ₹ + ₫, Cash / Cards / Prepaid totals, per-method filters, edit/delete, text summary, CSV and JSON export |
| **Rates** | Cash & base rates per currency, ↻ live refresh (open.er-api.com), your own cards: base + markup % (+18% GST on markup) or fixed rates |

## 📲 Install on your phone

1. Open **[Releases](../../releases/latest)** on your Android phone.
2. Tap the `tide-and-trail-v1.0.N.apk` file → allow *Install unknown apps* for your browser if asked.
3. Every push to `main` builds a new release; installing it updates the app and keeps your data.

**Sharing with your partner:** both install the APK → ✨ (top-right on the Trip tab) → *Share trip file* → send over WhatsApp/Telegram → the other phone uses *Import a trip…*.

## 🔐 One-time setup: signing secrets

So that each new APK installs *over* the previous one, CI signs with a permanent key. Add these repository secrets
(**Settings → Secrets and variables → Actions → New repository secret**):

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | the keystore file, base64-encoded |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| `ANDROID_KEY_ALIAS` | `tideandtrail` |
| `ANDROID_KEY_PASSWORD` | key password |

Without them CI still builds a *debug* APK, but debug keys change every run, so updates would need an uninstall.
**Back up the keystore** — if it's lost, future builds can't update the installed app.

## 🛠 Develop

```bash
npm install
npm run dev        # http://localhost:5173 — use the browser's phone view
npm test           # currency / keypad maths
npm run build      # type-check + production build
```

### Build the APK locally (optional)

Needs **JDK 21** and the **Android SDK** (Android Studio installs both).

```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
npm run build; npx cap sync android; cd android; .\gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

### Regenerate icons / sample photos

```bash
node scripts/make-icons.mjs && npx @capacitor/assets generate --android --iconBackgroundColor '#3FD3C4' --splashBackgroundColor '#FFF7EE'
node scripts/fetch-sample-photos.ts   # re-fetch Wikimedia photos for the sample trip
```

## Credits

Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors · Search by [Photon](https://photon.komoot.io) · Place photos from [Wikimedia Commons](https://commons.wikimedia.org) (author + licence shown on each photo) · Exchange rates by [open.er-api.com](https://www.exchangerate-api.com) · 3D icons: [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji) (MIT) · Fonts: Plus Jakarta Sans & JetBrains Mono (OFL).
