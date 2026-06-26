"use client";

import { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";

// Lets the owner zoom/pan a photo inside a 16:9 frame so they control exactly
// what shows. The framed region is baked into a 1600x900 JPEG, so wherever the
// image is displayed (cover-fit, centered) it shows what they framed.
const OUT_W = 1600;
const OUT_H = 900;
const ASPECT = OUT_W / OUT_H;

export function BackgroundCropper({
  file,
  onCancel,
  onDone,
}: {
  file: File;
  onCancel: () => void;
  onDone: (blob: Blob) => void;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [frame, setFrame] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  // Measure the frame once it's laid out.
  useEffect(() => {
    function measure() {
      const el = frameRef.current;
      if (!el) return;
      const w = el.clientWidth;
      setFrame({ w, h: Math.round(w / ASPECT) });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [url]);

  // cover scale: smallest scale so the image fills the frame at zoom 1
  const coverScale =
    nat && frame.w
      ? Math.max(frame.w / nat.w, frame.h / nat.h)
      : 1;
  const dispW = nat ? nat.w * coverScale * zoom : 0;
  const dispH = nat ? nat.h * coverScale * zoom : 0;

  function clamp(x: number, y: number) {
    const minX = frame.w - dispW;
    const minY = frame.h - dispH;
    return {
      x: Math.min(0, Math.max(minX, x)),
      y: Math.min(0, Math.max(minY, y)),
    };
  }

  // Re-clamp / recenter whenever zoom or sizes change.
  useEffect(() => {
    if (!nat || !frame.w) return;
    setOffset((o) => {
      // keep the frame center stable on zoom
      const cx = (frame.w / 2 - o.x) / (dispW || 1);
      const cy = (frame.h / 2 - o.y) / (dispH || 1);
      const nx = frame.w / 2 - cx * dispW;
      const ny = frame.h / 2 - cy * dispH;
      return clamp(nx, ny);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, nat, frame.w, frame.h]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const nx = drag.current.ox + (e.clientX - drag.current.x);
    const ny = drag.current.oy + (e.clientY - drag.current.y);
    setOffset(clamp(nx, ny));
  }
  function onPointerUp() {
    drag.current = null;
  }

  async function apply() {
    const img = imgRef.current;
    if (!img || !nat || !frame.w) return;
    const k = coverScale * zoom; // displayed px per natural px
    const srcX = -offset.x / k;
    const srcY = -offset.y / k;
    const srcW = frame.w / k;
    const srcH = frame.h / k;

    const canvas = document.createElement("canvas");
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUT_W, OUT_H);
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob((b) => r(b), "image/jpeg", 0.85)
    );
    if (blob) onDone(blob);
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <h2 className="font-anton text-2xl tracking-tight text-ink">
          Frame your photo
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Drag to move, zoom to fill. Everything inside the box will show.
        </p>

        <div
          ref={frameRef}
          className="relative mt-4 w-full touch-none select-none overflow-hidden rounded-2xl bg-sand-50"
          style={{ height: frame.h || undefined, aspectRatio: frame.h ? undefined : `${OUT_W} / ${OUT_H}` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={url}
              alt=""
              draggable={false}
              onLoad={(e) =>
                setNat({
                  w: e.currentTarget.naturalWidth,
                  h: e.currentTarget.naturalHeight,
                })
              }
              style={{
                position: "absolute",
                left: offset.x,
                top: offset.y,
                width: dispW || undefined,
                height: dispH || undefined,
                maxWidth: "none",
                cursor: "grab",
              }}
            />
          ) : null}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <ZoomOut size={18} className="shrink-0 text-slate-400" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer accent-fairway-900"
          />
          <ZoomIn size={18} className="shrink-0 text-slate-400" />
        </div>

        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={onCancel}
            className="rounded-2xl px-4 py-3 text-sm font-bold text-slate-500"
          >
            Cancel
          </button>
          <button
            onClick={apply}
            disabled={!nat}
            className="flex-1 rounded-2xl bg-fairway-900 px-4 py-3.5 font-black text-white disabled:opacity-50"
          >
            Use this photo
          </button>
        </div>
      </div>
    </div>
  );
}
