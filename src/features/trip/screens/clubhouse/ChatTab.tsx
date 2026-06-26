"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlayerAvatar } from "@/features/avatar/PlayerAvatar";
import { ReactionControls } from "@/features/trip/screens/clubhouse/ReactionControls";
import { NewPill } from "@/features/trip/screens/clubhouse/NewPill";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  loadMessages,
  loadReactions,
  sendMessage,
  toggleReaction,
  loadReadState,
  markRead,
} from "@/lib/supabase/clubhouse";
import type { Player, TripMessage, TripMessageReaction } from "@/types";

const EPOCH = "1970-01-01T00:00:00Z";

function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ChatTab({ onRead }: { onRead?: () => void }) {
  const { trip, players } = useTripState();
  const { user } = useAuth();

  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [reactions, setReactions] = useState<TripMessageReaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<string>(EPOCH);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const unreadRef = useRef<HTMLDivElement | null>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());
  const onReadRef = useRef(onRead);
  useEffect(() => {
    onReadRef.current = onRead;
  }, [onRead]);

  const userId = user?.id;

  const playerByAccount = useCallback(
    (userId: string): Player | undefined =>
      players.find((p) => p.accountId === userId),
    [players]
  );

  useEffect(() => {
    messageIdsRef.current = new Set(messages.map((m) => m.id));
  }, [messages]);

  const scrollToBottom = useCallback((smooth = false) => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    });
  }, []);

  // Keep this tab's read mark current (so unread stays at 0 while viewing).
  const touchRead = useCallback(() => {
    const supabase = getSupabaseClient();
    if (supabase && userId) void markRead(supabase, trip.id, userId, "chat");
    onReadRef.current?.();
  }, [trip.id, userId]);

  // Initial load + realtime subscription.
  useEffect(() => {
    let active = true;
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      setError("Chat needs a live connection - try again in a moment.");
      return;
    }

    setLoading(true);
    (async () => {
      try {
        // Capture the read baseline BEFORE marking the tab read, so we can
        // find where the user left off.
        const baseline = userId
          ? (await loadReadState(supabase, trip.id, userId)).chatReadAt
          : EPOCH;
        setBaseline(baseline);

        const msgs = await loadMessages(supabase, trip.id);
        if (!active) return;
        setMessages(msgs);

        const firstUnread = msgs.find(
          (m) => (!userId || m.userId !== userId) && m.createdAt > baseline
        );
        setFirstUnreadId(firstUnread?.id ?? null);

        const rx = await loadReactions(
          supabase,
          msgs.map((m) => m.id)
        );
        if (!active) return;
        setReactions(rx);
        setError(null);

        // Land on the first unread message, or the bottom if all caught up.
        requestAnimationFrame(() => {
          if (firstUnread && unreadRef.current) {
            unreadRef.current.scrollIntoView({ block: "center" });
          } else {
            scrollToBottom(false);
          }
        });

        touchRead();
      } catch (e: unknown) {
        if (active)
          setError(e instanceof Error ? e.message : "Couldn't load chat.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`trip-chat-${trip.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trip_messages",
          filter: `trip_id=eq.${trip.id}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            trip_id: string;
            user_id: string;
            body: string;
            created_at: string;
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [
              ...prev,
              {
                id: row.id,
                tripId: row.trip_id,
                userId: row.user_id,
                body: row.body,
                createdAt: row.created_at,
              },
            ];
          });
          scrollToBottom(true);
          // We're looking at the thread, so keep it marked read.
          if (!userId || row.user_id !== userId) touchRead();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trip_message_reactions" },
        (payload) => {
          const r = payload.new as {
            message_id: string;
            user_id: string;
            emoji: string;
          };
          if (!messageIdsRef.current.has(r.message_id)) return;
          setReactions((prev) =>
            prev.some(
              (x) =>
                x.messageId === r.message_id &&
                x.userId === r.user_id &&
                x.emoji === r.emoji
            )
              ? prev
              : [
                  ...prev,
                  { messageId: r.message_id, userId: r.user_id, emoji: r.emoji },
                ]
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "trip_message_reactions" },
        (payload) => {
          const r = payload.old as {
            message_id?: string;
            user_id?: string;
            emoji?: string;
          };
          if (!r.message_id) return;
          setReactions((prev) =>
            prev.filter(
              (x) =>
                !(
                  x.messageId === r.message_id &&
                  x.userId === r.user_id &&
                  x.emoji === r.emoji
                )
            )
          );
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [trip.id, scrollToBottom, touchRead, userId]);

  async function send() {
    const body = input.trim();
    if (!body || !user) return;
    setSending(true);
    setError(null);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setSending(false);
      setError("Lost the connection - try again in a moment.");
      return;
    }
    try {
      const msg = await sendMessage(supabase, {
        tripId: trip.id,
        userId: user.id,
        body,
      });
      setInput("");
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
      );
      scrollToBottom(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Couldn't send message.");
    } finally {
      setSending(false);
    }
  }

  async function react(messageId: string, emoji: string) {
    if (!user) return;
    const isOn = reactions.some(
      (r) =>
        r.messageId === messageId && r.userId === user.id && r.emoji === emoji
    );
    setReactions((prev) =>
      isOn
        ? prev.filter(
            (r) =>
              !(
                r.messageId === messageId &&
                r.userId === user.id &&
                r.emoji === emoji
              )
          )
        : [...prev, { messageId, userId: user.id, emoji }]
    );
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      await toggleReaction(supabase, { messageId, userId: user.id, emoji, isOn });
    } catch (e: unknown) {
      setReactions((prev) =>
        isOn
          ? [...prev, { messageId, userId: user.id, emoji }]
          : prev.filter(
              (r) =>
                !(
                  r.messageId === messageId &&
                  r.userId === user.id &&
                  r.emoji === emoji
                )
            )
      );
      setError(e instanceof Error ? e.message : "Couldn't update reaction.");
    }
  }

  const groups = useMemo(() => {
    const out: { userId: string; items: TripMessage[] }[] = [];
    for (const m of messages) {
      const last = out[out.length - 1];
      if (last && last.userId === m.userId) last.items.push(m);
      else out.push({ userId: m.userId, items: [m] });
    }
    return out;
  }, [messages]);

  function reactionsForMessage(messageId: string) {
    const counts: Record<string, { count: number; mine: boolean }> = {};
    for (const r of reactions) {
      if (r.messageId !== messageId) continue;
      const entry = counts[r.emoji] ?? { count: 0, mine: false };
      entry.count += 1;
      if (user && r.userId === user.id) entry.mine = true;
      counts[r.emoji] = entry;
    }
    return Object.entries(counts);
  }

  function renderMessage(m: TripMessage, isMine: boolean) {
    const rx = reactionsForMessage(m.id);
    const showDivider = m.id === firstUnreadId;
    const isNew = m.createdAt > baseline && (!userId || m.userId !== userId);
    return (
      <div key={m.id}>
        {showDivider ? (
          <div
            ref={unreadRef}
            className="my-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-team-north"
          >
            <span className="h-px flex-1 bg-team-north/30" />
            New messages
            <span className="h-px flex-1 bg-team-north/30" />
          </div>
        ) : null}
        <div className="flex items-end gap-1.5">
          <p
            className={`inline-block max-w-full whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm font-medium ${
              isMine
                ? "bg-fairway-50 text-ink"
                : "border border-line bg-white text-ink"
            }`}
          >
            {m.body}
          </p>
          {isNew ? <NewPill /> : null}
        </div>

        <ReactionControls summary={rx} onToggle={(e) => react(m.id, e)} tripId={trip.id} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-xl border border-team-north/30 bg-red-50 px-4 py-3 text-sm font-semibold text-team-north">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-12 w-3/4 animate-pulse rounded-2xl bg-sand-100"
            />
          ))}
        </div>
      ) : null}

      {!loading && messages.length === 0 ? (
        <EmptyState
          img="/brand/clubhouse-birdy.png"
          title="No Messages Yet"
          message="Start the trash talk - first one to chirp sets the tone."
        />
      ) : null}

      {!loading && messages.length > 0 ? (
        <div className="space-y-4 pb-28">
          {groups.map((group, gi) => {
            const poster = playerByAccount(group.userId);
            const isMine = !!user && group.userId === user.id;
            const name = poster?.name ?? (isMine ? "You" : "Member");
            return (
              <div key={gi} className="flex gap-2.5">
                <div className="w-9 shrink-0 pt-5">
                  <PlayerAvatar
                    avatarId={poster?.avatarId}
                    emoji={poster?.avatarEmoji}
                    name={name}
                    size={36}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-extrabold text-ink">
                      {name}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {clockTime(group.items[0].createdAt)}
                    </span>
                  </div>
                  <div className="mt-1 space-y-1.5">
                    {group.items.map((m) => renderMessage(m, isMine))}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      ) : null}

      <div className="sticky bottom-24 z-30">
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-white p-2 shadow-[0_12px_28px_-18px_rgba(11,36,24,.5)]">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            maxLength={1000}
            placeholder="Talk some trash…"
            className="min-w-0 flex-1 rounded-xl bg-sand-50 px-3 py-3 text-[16px] font-medium text-ink outline-none placeholder:text-slate-400"
          />
          <button
            onClick={() => void send()}
            disabled={sending || input.trim().length === 0}
            aria-label="Send message"
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-fairway-900 px-4 py-3 text-sm font-extrabold text-white transition active:scale-95 disabled:opacity-50"
          >
            <Send size={16} />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
