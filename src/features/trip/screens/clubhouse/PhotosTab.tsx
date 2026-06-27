"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { AvatarWithFrame } from "@/features/cosmetics/AvatarWithFrame";
import { ReactionControls } from "@/features/trip/screens/clubhouse/ReactionControls";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  loadPhotos,
  signedUrlFor,
  uploadPhoto,
  deletePhoto,
  markRead,
  loadReadState,
  loadPhotoReactions,
  togglePhotoReaction,
  loadPhotoComments,
  addPhotoComment,
  deletePhotoComment,
} from "@/lib/supabase/clubhouse";
import { NewPill } from "@/features/trip/screens/clubhouse/NewPill";
import type {
  Player,
  PhotoComment,
  PhotoReaction,
  TripPhoto,
} from "@/types";

const EPOCH = "1970-01-01T00:00:00Z";

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

export function PhotosTab({ onRead }: { onRead?: () => void }) {
  const { trip, players } = useTripState();
  const { user } = useAuth();
  const userId = user?.id;

  const [photos, setPhotos] = useState<TripPhoto[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [reactions, setReactions] = useState<PhotoReaction[]>([]);
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [baselineReadAt, setBaselineReadAt] = useState<string>(EPOCH);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [composer, setComposer] = useState<Composer | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const photoIdsRef = useRef<Set<string>>(new Set());
  const onReadRef = useRef(onRead);
  useEffect(() => {
    onReadRef.current = onRead;
  }, [onRead]);
  useEffect(() => {
    photoIdsRef.current = new Set(photos.map((p) => p.id));
  }, [photos]);

  const playerByAccount = useCallback(
    (uid: string): Player | undefined =>
      players.find((p) => p.accountId === uid),
    [players]
  );

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

  const touchRead = useCallback(() => {
    const supabase = getSupabaseClient();
    if (supabase && userId) void markRead(supabase, trip.id, userId, "photos");
    onReadRef.current?.();
  }, [trip.id, userId]);

  // Load + live subscription.
  useEffect(() => {
    let active = true;
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      setError("Photos need a live connection - try again in a moment.");
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const baseline = userId
          ? (await loadReadState(supabase, trip.id, userId)).photosReadAt
          : EPOCH;
        setBaselineReadAt(baseline);

        const list = await loadPhotos(supabase, trip.id);
        if (!active) return;
        setPhotos(list);
        setError(null);
        void ensureUrls(list);
        const ids = list.map((p) => p.id);
        const [rx, cm] = await Promise.all([
          loadPhotoReactions(supabase, ids),
          loadPhotoComments(supabase, ids),
        ]);
        if (!active) return;
        setReactions(rx);
        setComments(cm);
        touchRead();
      } catch (e: unknown) {
        if (active)
          setError(e instanceof Error ? e.message : "Couldn't load photos.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`trip-photos-${trip.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trip_photos",
          filter: `trip_id=eq.${trip.id}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            trip_id: string;
            user_id: string;
            storage_path: string;
            caption: string | null;
            width: number | null;
            height: number | null;
            created_at: string;
          };
          const photo: TripPhoto = {
            id: row.id,
            tripId: row.trip_id,
            userId: row.user_id,
            storagePath: row.storage_path,
            caption: row.caption,
            width: row.width,
            height: row.height,
            createdAt: row.created_at,
          };
          setPhotos((prev) =>
            prev.some((p) => p.id === photo.id) ? prev : [photo, ...prev]
          );
          void ensureUrls([photo]);
          if (!userId || row.user_id !== userId) touchRead();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trip_photo_reactions" },
        (payload) => {
          const r = payload.new as {
            photo_id: string;
            user_id: string;
            emoji: string;
          };
          if (!photoIdsRef.current.has(r.photo_id)) return;
          setReactions((prev) =>
            prev.some(
              (x) =>
                x.photoId === r.photo_id &&
                x.userId === r.user_id &&
                x.emoji === r.emoji
            )
              ? prev
              : [
                  ...prev,
                  { photoId: r.photo_id, userId: r.user_id, emoji: r.emoji },
                ]
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "trip_photo_reactions" },
        (payload) => {
          const r = payload.old as {
            photo_id?: string;
            user_id?: string;
            emoji?: string;
          };
          if (!r.photo_id) return;
          setReactions((prev) =>
            prev.filter(
              (x) =>
                !(
                  x.photoId === r.photo_id &&
                  x.userId === r.user_id &&
                  x.emoji === r.emoji
                )
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trip_photo_comments" },
        (payload) => {
          const c = payload.new as {
            id: string;
            photo_id: string;
            user_id: string;
            body: string;
            created_at: string;
          };
          if (!photoIdsRef.current.has(c.photo_id)) return;
          setComments((prev) =>
            prev.some((x) => x.id === c.id)
              ? prev
              : [
                  ...prev,
                  {
                    id: c.id,
                    photoId: c.photo_id,
                    userId: c.user_id,
                    body: c.body,
                    createdAt: c.created_at,
                  },
                ]
          );
          if (!userId || c.user_id !== userId) touchRead();
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "trip_photo_comments" },
        (payload) => {
          const c = payload.old as { id?: string };
          if (!c.id) return;
          setComments((prev) => prev.filter((x) => x.id !== c.id));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [trip.id, ensureUrls, touchRead, userId]);

  function openPicker() {
    fileInputRef.current?.click();
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
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
      setError("Lost the connection - try again in a moment.");
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
      setPhotos((prev) =>
        prev.some((p) => p.id === photo.id) ? prev : [photo, ...prev]
      );
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

  function reactionsForPhoto(
    photoId: string
  ): [string, { count: number; mine: boolean }][] {
    const counts: Record<string, { count: number; mine: boolean }> = {};
    for (const r of reactions) {
      if (r.photoId !== photoId) continue;
      const entry = counts[r.emoji] ?? { count: 0, mine: false };
      entry.count += 1;
      if (userId && r.userId === userId) entry.mine = true;
      counts[r.emoji] = entry;
    }
    return Object.entries(counts);
  }

  async function reactPhoto(photoId: string, emoji: string) {
    if (!userId) return;
    const isOn = reactions.some(
      (r) => r.photoId === photoId && r.userId === userId && r.emoji === emoji
    );
    setReactions((prev) =>
      isOn
        ? prev.filter(
            (r) =>
              !(
                r.photoId === photoId &&
                r.userId === userId &&
                r.emoji === emoji
              )
          )
        : [...prev, { photoId, userId, emoji }]
    );
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      await togglePhotoReaction(supabase, { photoId, userId, emoji, isOn });
    } catch (e: unknown) {
      setReactions((prev) =>
        isOn
          ? [...prev, { photoId, userId, emoji }]
          : prev.filter(
              (r) =>
                !(
                  r.photoId === photoId &&
                  r.userId === userId &&
                  r.emoji === emoji
                )
            )
      );
      setError(e instanceof Error ? e.message : "Couldn't update reaction.");
    }
  }

  async function postComment(photoId: string) {
    const body = (drafts[photoId] ?? "").trim();
    if (!body || !userId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setDrafts((d) => ({ ...d, [photoId]: "" }));
    try {
      const c = await addPhotoComment(supabase, {
        tripId: trip.id,
        photoId,
        userId,
        body,
      });
      setComments((prev) =>
        prev.some((x) => x.id === c.id) ? prev : [...prev, c]
      );
    } catch (e: unknown) {
      setDrafts((d) => ({ ...d, [photoId]: body }));
      setError(e instanceof Error ? e.message : "Couldn't add comment.");
    }
  }

  async function removeComment(comment: PhotoComment) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setComments((prev) => prev.filter((x) => x.id !== comment.id));
    try {
      await deletePhotoComment(supabase, comment.id);
    } catch (e: unknown) {
      setComments((prev) => [...prev, comment]);
      setError(e instanceof Error ? e.message : "Couldn't delete comment.");
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
                setComposer((c) => (c ? { ...c, caption: ev.target.value } : c))
              }
              maxLength={140}
              placeholder="Add a caption (optional)…"
              className="w-full rounded-xl border border-line bg-sand-50 px-3 py-2.5 text-[16px] font-semibold text-ink outline-none placeholder:text-slate-400 focus:border-fairway-900"
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

      {!loading && photos.length === 0 && !composer ? (
        <EmptyState
          img="/brand/clubhouse-birdy.png"
          title="No Photos Yet"
          message="Snap the first one - tee shots, trophies, and questionable swings welcome."
        >
          {AddButton}
        </EmptyState>
      ) : null}

      {!loading && photos.length > 0 ? (
        <div className="space-y-4">
          {photos.map((photo) => {
            const poster = playerByAccount(photo.userId);
            const isMine = !!userId && photo.userId === userId;
            const name = poster?.name ?? (isMine ? "You" : "Member");
            const url = urls[photo.id];
            const ratio =
              photo.width && photo.height
                ? `${photo.width} / ${photo.height}`
                : "4 / 3";
            const photoComments = comments.filter(
              (c) => c.photoId === photo.id
            );
            const photoIsNew =
              photo.createdAt > baselineReadAt && !isMine;

            return (
              <div
                key={photo.id}
                className="overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_14px_30px_-22px_rgba(14,76,48,0.4)]"
              >
                <div className="flex items-center gap-3 px-4 pt-3.5">
                  <AvatarWithFrame
                    frameId={poster?.frameId}
                    avatarId={poster?.avatarId}
                    emoji={poster?.avatarEmoji}
                    name={name}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-extrabold text-ink">
                        {name}
                      </p>
                      {photoIsNew ? <NewPill /> : null}
                    </div>
                    <p className="text-xs font-semibold text-slate-400">
                      {relativeTime(photo.createdAt)}
                    </p>
                  </div>
                  {isMine ? (
                    <button
                      onClick={() => remove(photo)}
                      disabled={deletingId === photo.id}
                      aria-label="Delete photo"
                      className="rounded-lg p-1.5 text-slate-300 transition hover:text-team-north disabled:opacity-50"
                    >
                      <Trash2 size={18} />
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

                <div className="px-4 pb-3 pt-3">
                  {photo.caption ? (
                    <p className="text-sm font-semibold text-slate-600">
                      {photo.caption}
                    </p>
                  ) : null}

                  <ReactionControls
                    summary={reactionsForPhoto(photo.id)}
                    onToggle={(e) => reactPhoto(photo.id, e)}
                    tripId={trip.id}
                  />

                  {photoComments.length > 0 ? (
                    <div className="mt-3 space-y-2 border-t border-line pt-3">
                      {photoComments.map((c) => {
                        const cp = playerByAccount(c.userId);
                        const cMine = !!userId && c.userId === userId;
                        const cName =
                          cp?.name ?? (cMine ? "You" : "Member");
                        return (
                          <div key={c.id} className="flex items-start gap-2">
                            <div className="pt-0.5">
                              <AvatarWithFrame
                                frameId={cp?.frameId}
                                avatarId={cp?.avatarId}
                                emoji={cp?.avatarEmoji}
                                name={cName}
                                size={24}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-ink">
                                <span className="font-extrabold">{cName}</span>{" "}
                                <span className="font-medium text-slate-600">
                                  {c.body}
                                </span>
                              </p>
                              <p className="text-[11px] font-semibold text-slate-400">
                                {relativeTime(c.createdAt)}
                              </p>
                            </div>
                            {c.createdAt > baselineReadAt && !cMine ? (
                              <NewPill />
                            ) : null}
                            {cMine ? (
                              <button
                                onClick={() => removeComment(c)}
                                aria-label="Delete comment"
                                className="shrink-0 p-1 text-slate-300 transition hover:text-team-north"
                              >
                                <Trash2 size={14} />
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  <div className="mt-3 flex items-center gap-2">
                    <input
                      value={drafts[photo.id] ?? ""}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [photo.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void postComment(photo.id);
                        }
                      }}
                      maxLength={500}
                      placeholder="Add a comment…"
                      className="min-w-0 flex-1 rounded-xl bg-sand-50 px-3 py-2 text-[16px] font-medium text-ink outline-none placeholder:text-slate-400"
                    />
                    <button
                      onClick={() => void postComment(photo.id)}
                      disabled={(drafts[photo.id] ?? "").trim().length === 0}
                      className="shrink-0 rounded-xl bg-fairway-900 px-3 py-2 text-sm font-extrabold text-white transition active:scale-95 disabled:opacity-50"
                    >
                      Post
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
