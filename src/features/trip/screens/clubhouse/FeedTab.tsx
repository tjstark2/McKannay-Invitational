"use client";

// The Feed: automatic scoring moments, grouped by round.
//
// These used to be posted as chat messages, which meant a busy round buried
// actual conversation under forty automated lines and the unread badge told
// you nothing. Now they live here, tabbed by round, and people can comment on
// a specific moment rather than replying into a general stream.

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { loadMessages, sendMessage } from "@/lib/supabase/clubhouse";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useAuth } from "@/features/auth/AuthContext";
import { AvatarWithFrame } from "@/features/cosmetics/AvatarWithFrame";
import type { TripMessage } from "@/types";

export function FeedTab({ onRead }: { onRead?: () => void }) {
  const { trip, rounds, players } = useTripState();
  const { user } = useAuth();
  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [roundFilter, setRoundFilter] = useState<string | "all">("all");
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      setMessages(await loadMessages(supabase, trip.id));
    } catch {
      /* offline - keep whatever is on screen */
    } finally {
      setLoading(false);
    }
  }, [trip.id]);

  useEffect(() => {
    load();
    onRead?.();
  }, [load, onRead]);

  // Live, so a moment appears while people are still on the hole.
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const channel = supabase.channel(`feed-${trip.id}`);
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "trip_messages" },
      () => load()
    );
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [trip.id, load]);

  const callouts = useMemo(
    () =>
      messages
        .filter((m) => m.kind === "callout" && !m.parentId)
        .filter((m) => roundFilter === "all" || m.roundId === roundFilter)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [messages, roundFilter]
  );

  const commentsFor = (id: string) =>
    messages
      .filter((m) => m.parentId === id)
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

  // Only offer round tabs that actually have something in them.
  const roundsWithMoments = rounds.filter((r) =>
    messages.some((m) => m.kind === "callout" && m.roundId === r.id)
  );

  const nameFor = (userId: string) =>
    players.find((p) => p.accountId === userId)?.name ?? "Someone";
  const playerFor = (userId: string) =>
    players.find((p) => p.accountId === userId);

  async function postComment(parentId: string) {
    const supabase = getSupabaseClient();
    if (!supabase || !user?.id || busy) return;
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    try {
      await sendMessage(supabase, {
        tripId: trip.id,
        userId: user.id,
        body,
        kind: "chat",
        parentId,
      });
      setDraft("");
      await load();
    } catch {
      /* non-blocking */
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading the feed…</p>;

  if (callouts.length === 0) {
    return (
      <div className="rounded-2xl border-[1.5px] border-dashed border-sand-200 bg-white p-6 text-center">
        <p className="text-3xl">⛳</p>
        <p className="mt-2 font-black text-ink">Nothing has happened yet</p>
        <p className="mx-auto mt-1 max-w-xs text-[13px] leading-5 text-slate-500">
          Birdies, eagles, snowmen and lead changes land here as they happen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {roundsWithMoments.length > 1 ? (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setRoundFilter("all")}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-black ${
              roundFilter === "all"
                ? "bg-fairway-900 text-white"
                : "border-[1.5px] border-sand-200 bg-white text-slate-600"
            }`}
          >
            All
          </button>
          {roundsWithMoments.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRoundFilter(r.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-black ${
                roundFilter === r.id
                  ? "bg-fairway-900 text-white"
                  : "border-[1.5px] border-sand-200 bg-white text-slate-600"
              }`}
            >
              {r.title.replace(/^Round\s*/i, "R")}
            </button>
          ))}
        </div>
      ) : null}

      {callouts.map((m) => {
        const comments = commentsFor(m.id);
        const open = openThread === m.id;
        const round = rounds.find((r) => r.id === m.roundId);
        return (
          <div
            key={m.id}
            className="rounded-2xl border-[1.5px] border-sand-200 bg-white p-3"
          >
            <p className="text-[14px] font-bold leading-5 text-ink">{m.body}</p>
            <div className="mt-1 flex items-center gap-2 text-[11px] font-bold text-slate-400">
              {round ? <span>{round.title}</span> : null}
              {m.hole ? <span>· hole {m.hole}</span> : null}
              <span className="ml-auto">
                {new Date(m.createdAt).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setOpenThread(open ? null : m.id);
                setDraft("");
              }}
              className="mt-2 text-[12px] font-black text-fairway-900"
            >
              {comments.length > 0
                ? `${comments.length} comment${comments.length === 1 ? "" : "s"}`
                : "Add a comment"}
            </button>

            {open ? (
              <div className="mt-2 space-y-2 border-t border-sand-100 pt-2">
                {comments.map((c) => {
                  const p = playerFor(c.userId);
                  return (
                    <div key={c.id} className="flex items-start gap-2">
                      <AvatarWithFrame
                        frameId={p?.frameId}
                        avatarId={p?.avatarId}
                        emoji={p?.avatarEmoji}
                        name={nameFor(c.userId)}
                        size={24}
                        playerId={p?.id}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-black text-ink">
                          {nameFor(c.userId)}
                        </p>
                        <p className="text-[13px] leading-5 text-slate-600">{c.body}</p>
                      </div>
                    </div>
                  );
                })}

                <div className="flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Say something"
                    aria-label="Comment on this moment"
                    className="flex-1 rounded-xl border-[1.5px] border-sand-200 px-3 py-2 text-[14px] outline-none focus:border-fairway-900"
                  />
                  <button
                    type="button"
                    disabled={busy || !draft.trim()}
                    onClick={() => postComment(m.id)}
                    className="rounded-xl bg-fairway-900 px-3 py-2 text-[13px] font-black text-white disabled:opacity-40"
                  >
                    Post
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
