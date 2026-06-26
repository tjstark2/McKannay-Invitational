"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2, Upload, X } from "lucide-react";
import {
  STOCK_BACKGROUNDS,
  GREEN_FALLBACK,
  backgroundThumb,
} from "@/lib/backgrounds";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  loadTripBackgrounds,
  uploadTripBackground,
  deleteTripBackground,
  MAX_CUSTOM_BACKGROUNDS,
  type TripBackground,
} from "@/lib/supabase/backgrounds";

async function compress(file: File, maxEdge = 1600, quality = 0.82): Promise<Blob> {
  const bmp = await createImageBitmap(file).catch(() => null);
  let src: CanvasImageSource, w: number, h: number;
  if (bmp) {
    src = bmp;
    w = bmp.width;
    h = bmp.height;
  } else {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = () => rej(new Error("Couldn't read that image."));
      el.src = url;
    });
    URL.revokeObjectURL(url);
    src = img;
    w = img.naturalWidth;
    h = img.naturalHeight;
  }
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't process that image.");
  ctx.drawImage(src, 0, 0, cw, ch);
  if (bmp) bmp.close();
  const blob = await new Promise<Blob | null>((r) =>
    canvas.toBlob((b) => r(b), "image/jpeg", quality)
  );
  if (!blob) throw new Error("Couldn't process that image.");
  return blob;
}

export function BackgroundPicker({
  open,
  onClose,
  value,
  onSelect,
  tripId,
  canUpload,
  title = "Choose a background",
}: {
  open: boolean;
  onClose: () => void;
  value: string | null | undefined;
  onSelect: (value: string | null) => void;
  tripId?: string;
  canUpload?: boolean;
  title?: string;
}) {
  const [pool, setPool] = useState<TripBackground[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const refreshPool = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !tripId || !canUpload) return;
    try {
      setPool(await loadTripBackgrounds(supabase, tripId));
    } catch {
      /* non-fatal */
    }
  }, [tripId, canUpload]);

  useEffect(() => {
    if (open) {
      setError(null);
      void refreshPool();
    }
  }, [open, refreshPool]);

  if (!open) return null;

  function pick(v: string | null) {
    onSelect(v);
    onClose();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !tripId) return;
    if (!file.type.startsWith("image/")) {
      setError("That doesn't look like an image.");
      return;
    }
    if (pool.length >= MAX_CUSTOM_BACKGROUNDS) {
      setError(`You can upload up to ${MAX_CUSTOM_BACKGROUNDS} images.`);
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await compress(file);
      const bg = await uploadTripBackground(supabase, { tripId, blob });
      setPool((p) => [bg, ...p]);
      pick(bg.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function removePool(bg: TripBackground) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setPool((p) => p.filter((x) => x.id !== bg.id));
    try {
      await deleteTripBackground(supabase, bg);
    } catch {
      void refreshPool();
    }
  }

  const Thumb = ({
    src,
    label,
    selected,
    onClick,
    children,
  }: {
    src?: string;
    label: string;
    selected: boolean;
    onClick: () => void;
    children?: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className={`relative aspect-[4/3] overflow-hidden rounded-xl border-2 text-left transition ${
        selected ? "border-fairway-900" : "border-transparent"
      }`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="h-full w-full object-cover" />
      ) : (
        <span className="block h-full w-full" style={{ backgroundColor: GREEN_FALLBACK }} />
      )}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-2 py-1 text-[11px] font-black text-white">
        {label}
      </span>
      {children}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-anton text-2xl tracking-tight text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400">
            <X size={22} />
          </button>
        </div>

        {error ? (
          <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-team-north">
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Thumb label="Light green" selected={!value} onClick={() => pick(null)} />
          {STOCK_BACKGROUNDS.map((b) => (
            <Thumb
              key={b.id}
              src={backgroundThumb(b.id)}
              label={b.title}
              selected={value === b.id}
              onClick={() => pick(b.id)}
            />
          ))}
        </div>

        {canUpload ? (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Your uploads ({pool.length}/{MAX_CUSTOM_BACKGROUNDS})
              </p>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy || pool.length >= MAX_CUSTOM_BACKGROUNDS}
                className="inline-flex items-center gap-1.5 rounded-xl bg-fairway-900 px-3 py-1.5 text-sm font-extrabold text-white disabled:opacity-50"
              >
                <Upload size={15} /> {busy ? "Uploading…" : "Upload"}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
            {pool.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {pool.map((bg) => (
                  <Thumb
                    key={bg.id}
                    src={bg.url}
                    label="Your image"
                    selected={value === bg.url}
                    onClick={() => pick(bg.url)}
                  >
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        void removePool(bg);
                      }}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white"
                    >
                      <Trash2 size={13} />
                    </span>
                  </Thumb>
                ))}
              </div>
            ) : (
              <p className="rounded-xl bg-sand-50 px-3 py-3 text-sm text-slate-500">
                Upload up to {MAX_CUSTOM_BACKGROUNDS} of your own course photos.
                One image works for both phone and desktop.
              </p>
            )}
          </div>
        ) : tripId ? (
          <p className="mt-5 rounded-xl bg-sand-50 px-3 py-3 text-sm text-slate-500">
            Want your own photos? Upgrade this tournament to{" "}
            <span className="font-bold text-fairway-900">Pro</span> to upload up
            to {MAX_CUSTOM_BACKGROUNDS} custom backgrounds.
          </p>
        ) : null}
      </div>
    </div>
  );
}
