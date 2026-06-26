"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlayerAvatar } from "@/features/avatar/PlayerAvatar";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  loadPhotos,
  signedUrlFor,
  uploadPhoto,
  deletePhoto,
  markRead,
} from "@/lib/supabase/clubhouse";
import type { Player, TripPhoto } from "@/types";

// ---- helpers ---------------------------------------------------------------

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** Decode → resize longest edge to ~1600px → JPEG ~0.8. Phone photos are huge. */
async function compressImage(
  file: File,
  maxEdge = 1600,
  quality = 0.8
): Promise<{ blob: Blob; width: number; height: number }> {
  // createImageBitmap honors EXIF orientation on modern browsers (phones).
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    } as ImageBitmapOptions);
  } catch {
    bitmap = await createImageBitmap(file).catch(() => null);
  }

  let source: CanvasImageSource;
  let srcW: number;
  let srcH: number;

  if (bitmap) {
    source = bitmap;
    srcW = bitmap.width;
    srcH = bitmap.height;
  } else {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const el = new Image();
        el.onload = () => res(el);
        el.onerror = () => rej(new Error("Couldn't read that image."));
        el.src = url;
      });
      source = img;
      srcW = img.naturalWidth;
      srcH = img.naturalHeight;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't process that image.");
  ctx.drawImage(source, 0, 0, width, height);
  if (bitmap) bitmap.close();

  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob((b) => res(b), "image/jpeg", quality)
  );
  if (!blob) throw new Error("Couldn't process that image.");
  return { blob, width, height };
}

type Composer = { previewUrl: string; file: File; caption: string };

// ---- component -------------------------------------------------------------

export function PhotosTab({ onRead }: { onRead?: () => void }) {
  const { trip, players } = useTripState();
  const { user } = useAuth();

  const [photos, setPhotos] = useState<TripPhoto[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [composer, setComposer] = useState<Composer | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const playerByAccount = useCallback(
    (userId: string): Player | undefined =>
      players.find((p) => p.accountId === userId),
    [players]
  );

  // Resolve a signed URL for any photo we don't have one for yet.
  const ensureUrls = useCallback(async (list: TripPhoto[]) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await Promise.all(
      list.map(async (photo) => {
        const url = await signedUrlFor(supabase, photo.storagePath);
        if (url) setUrls((prev) => ({ ...prev, [photo.id]: url }));
      })
    );
  }, []);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      setError("Photos need a live connection — try again in a moment.");
      return;
    }
    setLoading(true);
    loadPhotos(supabase, trip.id)
      .then((list) => {
        if (!active) return;
        setPhotos(list);
        setError(null);
        void ensureUrls(list);
        if (user) {
          void markRead(supabase, trip.id, user.id, "photos");
          onRead?.();
        }
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Couldn't load photos.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [trip.id, ensureUrls]);

  function openPicker() {
    fileInputRef.current?.click();
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file later
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That doesn't look like a photo.");
      return;
    }
    setError(null);
    setComposer({ previewUrl: URL.createObjectURL(file), file, caption: "" });
  }

  function cancelComposer() {
    if (composer) URL.revokeObjectURL(composer.previewUrl);
    setComposer(null);
  }

  async function post() {
    if (!composer || !user) return;
    setUploading(true);
    setError(null);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setUploading(false);
      setError("Lost the connection — try again in a moment.");
      return;
    }
    try {
      const { blob, width, height } = await compressImage(composer.file);
      const photo = await uploadPhoto(supabase, {
        tripId: trip.id,
        userId: user.id,
        blob,
        width,
        height,
        caption: composer.caption,
      });
      setPhotos((prev) => [photo, ...prev]);
      void ensureUrls([photo]);
      cancelComposer();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Couldn't post that photo.");
    } finally {
      setUploading(false);
    }
  }

  async function remove(photo: TripPhoto) {
    if (!window.confirm("Delete this photo? This can't be undone.")) return;
    setDeletingId(photo.id);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setDeletingId(null);
      return;
    }
    try {
      await deletePhoto(supabase, photo);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Couldn't delete that photo.");
    } finally {
      setDeletingId(null);
    }
  }

  const AddButton = (
    <button
      onClick={openPicker}
      className="inline-flex items-center gap-2 rounded-xl bg-fairway-900 px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_20px_-12px_rgba(19,100,63,0.9)] transition active:scale-95"
    >
      <span className="text-base leading-none">＋</span> Add photo
    </button>
  );

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileChosen}
        className="hidden"
      />

      {/* Top bar: count + add */}
      {!loading && photos.length > 0 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm font-extrabold text-slate-500">
            {photos.length} {photos.length === 1 ? "photo" : "photos"}
          </p>
          {AddButton}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-team-north/30 bg-red-50 px-4 py-3 text-sm font-semibold text-team-north">
          {error}
        </div>
      ) : null}

      {/* Composer */}
      {composer ? (
        <div className="overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_14px_30px_-22px_rgba(14,76,48,0.4)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={composer.previewUrl}
            alt="Selected"
            className="max-h-80 w-full object-cover"
          />
          <div className="space-y-3 p-4">
            <input
              value={composer.caption}
              onChange={(ev) =>
                setComposer((c) =>
                  c ? { ...c, caption: ev.target.value } : c
                )
              }
              maxLength={140}
              placeholder="Add a caption (optional)…"
              className="w-full rounded-xl border border-line bg-sand-50 px-3 py-2.5 text-sm font-semibold text-ink outline-none placeholder:text-slate-400 focus:border-fairway-900"
            />
            <div className="flex gap-2">
              <button
                onClick={post}
                disabled={uploading}
                className="flex-1 rounded-xl bg-fairway-900 px-4 py-2.5 text-sm font-extrabold text-white transition active:scale-95 disabled:opacity-60"
              >
                {uploading ? "Posting…" : "Post"}
              </button>
              <button
                onClick={cancelComposer}
                disabled={uploading}
                className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-extrabold text-slate-600 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Loading */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-[20px] border border-line bg-white"
            >
              <div className="h-64 w-full animate-pulse bg-sand-100" />
            </div>
          ))}
        </div>
      ) : null}

      {/* Empty state */}
      {!loading && photos.length === 0 && !composer ? (
        <EmptyState
          img="/brand/clubhouse-birdy.png"
          title="No photos yet"
          message="Snap the first one — tee shots, trophies, and questionable swings welcome."
        >
          {AddButton}
        </EmptyState>
      ) : null}

      {/* Feed */}
      {!loading && photos.length > 0 ? (
        <div className="space-y-4">
          {photos.map((photo) => {
            const poster = playerByAccount(photo.userId);
            const isMine = !!user && photo.userId === user.id;
            const name = poster?.name ?? (isMine ? "You" : "Member");
            const url = urls[photo.id];
            const ratio =
              photo.width && photo.height
                ? `${photo.width} / ${photo.height}`
                : "4 / 3";

            return (
              <div
                key={photo.id}
                className="overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_14px_30px_-22px_rgba(14,76,48,0.4)]"
              >
                <div className="flex items-center gap-3 px-4 pt-3.5">
                  <PlayerAvatar
                    avatarId={poster?.avatarId}
                    emoji={poster?.avatarEmoji}
                    name={name}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-ink">
                      {name}
                    </p>
                    <p className="text-xs font-semibold text-slate-400">
                      {relativeTime(photo.createdAt)}
                    </p>
                  </div>
                  {isMine ? (
                    <button
                      onClick={() => remove(photo)}
                      disabled={deletingId === photo.id}
                      aria-label="Delete photo"
                      className="rounded-lg px-2 py-1 text-slate-300 transition hover:text-team-north disabled:opacity-50"
                    >
                      {deletingId === photo.id ? "…" : "🗑"}
                    </button>
                  ) : null}
                </div>

                <div
                  className="mt-3 w-full bg-sand-100"
                  style={{ aspectRatio: ratio }}
                >
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={photo.caption ?? "Trip photo"}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full animate-pulse bg-sand-100" />
                  )}
                </div>

                {photo.caption ? (
                  <p className="px-4 py-3 text-sm font-semibold text-slate-600">
                    {photo.caption}
                  </p>
                ) : (
                  <div className="pb-2" />
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
