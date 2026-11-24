import { Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Clipboard } from '@capacitor/clipboard';

export const isNative = Capacitor.isNativePlatform();

export async function openExternal(url: string) {
  if (isNative) {
    try {
      await AppLauncher.openUrl({ url });
      return;
    } catch {
      // no app handled it — fall back to the browser
    }
  }
  window.open(url, '_blank', 'noopener');
}

export function geoUrl(lat: number, lng: number, name: string) {
  return `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(name)})`;
}

export function googleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** geo: opens Android's maps-app chooser; on the web we go straight to Google Maps. */
export async function navigateTo(lat: number, lng: number, name: string) {
  if (isNative) {
    try {
      await AppLauncher.openUrl({ url: geoUrl(lat, lng, name) });
      return;
    } catch {
      /* fall through */
    }
  }
  await openExternal(googleMapsUrl(lat, lng));
}

/** Share a text file through the Android share sheet (WhatsApp, Drive…) or download it on the web. */
export async function shareFile(filename: string, contents: string, mime: string, title: string) {
  if (isNative) {
    const written = await Filesystem.writeFile({
      path: filename,
      data: contents,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({ title, files: [written.uri], dialogTitle: title });
    return;
  }
  const file = new File([contents], filename, { type: mime });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch {
      /* user cancelled or unsupported — download instead */
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function shareText(text: string, title: string) {
  if (isNative) {
    await Share.share({ title, text, dialogTitle: title });
    return;
  }
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return;
    } catch {
      /* ignore */
    }
  }
  await copyText(text);
}

export async function copyText(text: string) {
  if (isNative) {
    await Clipboard.write({ string: text });
    return;
  }
  await navigator.clipboard.writeText(text);
}

export async function readClipboard(): Promise<string> {
  if (isNative) {
    const r = await Clipboard.read();
    return r.value ?? '';
  }
  return navigator.clipboard.readText();
}
