import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, ImageOff, X } from 'lucide-react';
import type { Photo } from '../types';
import { cachedObjectUrl, revokeIfBlob } from '../lib/netCache';
import { openExternal } from '../lib/native';
import { useBackHandler } from '../hooks/useBackHandler';
import { cx } from './ui';

export function CachedImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    let made: string | null = null;
    cachedObjectUrl('photos-v1', src, 800).then((u) => {
      if (!alive) return revokeIfBlob(u);
      made = u;
      setUrl(u);
    });
    return () => {
      alive = false;
      revokeIfBlob(made);
    };
  }, [src]);
  if (failed) {
    return (
      <div className={cx('flex items-center justify-center bg-sand-2 text-muted', className)}>
        <ImageOff size={18} />
      </div>
    );
  }
  return url ? (
    <img src={url} alt={alt} draggable={false} onError={() => setFailed(true)} className={cx('animate-fade-in object-cover', className)} />
  ) : (
    <div className={cx('animate-pulse bg-sand-2', className)} />
  );
}

export function PhotoStrip({ photos, name, height = 96 }: { photos: Photo[] | undefined; name: string; height?: number }) {
  const [open, setOpen] = useState<number | null>(null);
  if (photos === undefined) {
    return (
      <div className="no-scrollbar flex gap-2 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ height }} className="w-32 shrink-0 animate-pulse rounded-2xl bg-ink/5" />
        ))}
      </div>
    );
  }
  if (!photos.length) return null;
  return (
    <>
      <div
        className="no-scrollbar -mx-2.5 flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-2.5"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {photos.map((p, i) => (
          <button
            key={p.thumb}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(i);
            }}
            style={{ height }}
            className={cx('shrink-0 snap-start overflow-hidden rounded-[14px] active:scale-[0.98]', i === 0 ? 'w-40' : 'w-28')}
          >
            <CachedImage src={p.thumb} alt={name} className="h-full w-full" />
          </button>
        ))}
      </div>
      {open !== null && <Lightbox photos={photos} start={open} name={name} onClose={() => setOpen(null)} />}
    </>
  );
}

function Lightbox({ photos, start, name, onClose }: { photos: Photo[]; start: number; name: string; onClose: () => void }) {
  useBackHandler(true, onClose);
  const [idx, setIdx] = useState(start);
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (el) el.scrollTo({ left: start * el.clientWidth });
  }, [el, start]);
  const p = photos[idx];
  return createPortal(
    <div className="fixed inset-0 z-[3000] flex animate-fade-in flex-col bg-black" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-3 pt-[calc(8px+var(--sat))] pb-2 text-white">
        <div className="min-w-0 px-2">
          <div className="truncate font-semibold">{name}</div>
          <div className="text-xs text-white/60">
            {idx + 1} / {photos.length}
          </div>
        </div>
        <button type="button" aria-label="Close" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full active:bg-white/10">
          <X />
        </button>
      </div>
      <div
        ref={setEl}
        onScroll={(e) => setIdx(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="no-scrollbar flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto"
      >
        {photos.map((ph) => (
          <div key={ph.thumb} className="flex h-full w-full shrink-0 snap-center items-center justify-center">
            <CachedImage src={ph.thumb} alt={name} className="max-h-full w-full !object-contain" />
          </div>
        ))}
      </div>
      {p && (
        <button
          type="button"
          onClick={() => void openExternal(p.page)}
          className="flex items-center gap-2 px-5 pt-3 pb-[calc(16px+var(--sab))] text-left text-xs text-white/70"
        >
          <span className="min-w-0 flex-1 truncate">
            📷 {p.credit} · {p.license} · Wikimedia Commons
          </span>
          <ExternalLink size={14} />
        </button>
      )}
    </div>,
    document.body,
  );
}
