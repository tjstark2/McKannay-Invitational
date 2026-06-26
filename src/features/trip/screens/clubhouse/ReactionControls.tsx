"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SmilePlus, Crown, X } from "lucide-react";
import { useBirdieBoss } from "@/features/account/birdieBoss";
import {
  BOSS_STICKERS,
  bossSrc,
  bossValue,
  isBossReaction,
  bossIdOf,
} from "@/lib/bossStickers";

// Shared reaction set for chat messages and photos.
export const REACTIONS = [
  "👍",
  "❤️",
  "😂",
  "🔥",
  "👏",
  "😮",
  "⛳",
  "🏌️",
  "🏆",
  "💪",
  "🍺",
  "🐦",
  "😢",
  "💩",
];

export type ReactionSummary = [string, { count: number; mine: boolean }][];

const DECLINE_LIMIT = 3;
function declineKey(tripId?: string) {
  return `tb_boss_declines_${tripId ?? "none"}`;
}
function readDeclines(tripId?: string) {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(declineKey(tripId)) || "0");
}

/** Small chip face: unicode emoji or a Boss sticker image. */
function ReactionFace({ value, size = 16 }: { value: string; size?: number }) {
  if (isBossReaction(value)) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={bossSrc(bossIdOf(value))}
        alt=""
        style={{ width: size + 6, height: size + 6 }}
        className="object-contain"
      />
    );
  }
  return <span className="leading-none" style={{ fontSize: size }}>{value}</span>;
}

export function ReactionControls({
  summary,
  onToggle,
  tripId,
}: {
  summary: ReactionSummary;
  onToggle: (emoji: string) => void;
  tripId?: string;
}) {
  const router = useRouter();
  const { isBoss, upgrade } = useBirdieBoss();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"standard" | "boss">("standard");
  const [declines, setDeclines] = useState(() => readDeclines(tripId));
  const [upsell, setUpsell] = useState(false);

  function openPicker() {
    setTab(isBoss ? "boss" : "standard");
    setOpen((o) => !o);
  }

  function tapBoss(id: string) {
    if (isBoss) {
      onToggle(bossValue(id));
      setOpen(false);
      return;
    }
    if (declines >= DECLINE_LIMIT) return; // locked view is shown instead
    setUpsell(true);
  }

  function declineUpsell() {
    const n = declines + 1;
    setDeclines(n);
    if (typeof window !== "undefined")
      window.localStorage.setItem(declineKey(tripId), String(n));
    setUpsell(false);
  }

  async function acceptUpsell() {
    await upgrade();
    setUpsell(false);
  }

  const bossLocked = !isBoss && declines >= DECLINE_LIMIT;

  return (
    <div className="mt-1.5">
      <div className="flex flex-wrap items-center gap-1">
        {summary.map(([emoji, info]) => (
          <button
            key={emoji}
            onClick={() => onToggle(emoji)}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold transition ${
              info.mine
                ? "border-fairway-900 bg-fairway-50 text-fairway-900"
                : "border-line bg-white text-slate-500"
            }`}
          >
            <ReactionFace value={emoji} size={14} />
            {info.count}
          </button>
        ))}
        <button
          onClick={openPicker}
          aria-label="Add reaction"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-300 transition hover:bg-sand-50 hover:text-fairway-900"
        >
          <SmilePlus size={18} />
        </button>
      </div>

      {open ? (
        <div className="mt-1.5 rounded-2xl border border-line bg-white p-2 shadow-[0_8px_18px_-12px_rgba(14,76,48,.5)]">
          {/* Tabs */}
          <div className="mb-2 flex items-center gap-1 border-b border-line pb-2">
            <button
              onClick={() => setTab("standard")}
              className={`rounded-lg px-2.5 py-1 text-sm font-extrabold ${
                tab === "standard" ? "bg-sand-50 text-ink" : "text-slate-400"
              }`}
            >
              Emoji
            </button>
            <button
              onClick={() => setTab("boss")}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-extrabold ${
                tab === "boss"
                  ? "bg-accent/15 text-[#a07a06]"
                  : "text-slate-400"
              }`}
            >
              <Crown size={14} /> Boss
            </button>
          </div>

          {tab === "standard" ? (
            <div className="grid grid-cols-7 gap-1">
              {REACTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => {
                    onToggle(e);
                    setOpen(false);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-2xl leading-none transition hover:bg-sand-50 active:scale-90"
                >
                  {e}
                </button>
              ))}
            </div>
          ) : bossLocked ? (
            <div className="px-3 py-5 text-center">
              <div className="text-3xl">👑🔒</div>
              <p className="mt-2 text-sm font-black text-ink">
                Boss stickers are a Birdie Boss perk
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Upgrade to Birdie Boss in your Profile to unlock them.
              </p>
              <button
                onClick={() => router.push("/profile")}
                className="mx-auto mt-3 block rounded-xl bg-accent px-4 py-2 text-sm font-black text-ink"
              >
                Go to Profile
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {BOSS_STICKERS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => tapBoss(s.id)}
                  title={s.label}
                  className="relative flex aspect-square items-center justify-center rounded-xl bg-sand-50 p-1 transition hover:bg-sand-100 active:scale-90"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bossSrc(s.id)}
                    alt={s.label}
                    className={`h-full w-full object-contain ${isBoss ? "" : "opacity-60"}`}
                  />
                  {!isBoss ? (
                    <span className="absolute bottom-0.5 right-0.5 text-[10px]">🔒</span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Become-a-Boss upsell (first 3 taps) */}
      {upsell ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/45" onClick={declineUpsell} />
          <div className="relative z-10 w-full max-w-xs overflow-hidden rounded-3xl border-2 border-accent/60 bg-white shadow-2xl">
            <button
              onClick={declineUpsell}
              aria-label="Close"
              className="absolute right-2 top-2 z-10 rounded-lg p-1 text-white/80"
            >
              <X size={18} />
            </button>
            <div className="bg-gradient-to-br from-[#1d1402] to-[#3a2a06] px-5 py-5 text-center text-white">
              <div className="text-4xl">👑</div>
              <p className="mt-1 font-anton text-xl tracking-tight">
                Become a Birdie Boss?
              </p>
            </div>
            <div className="p-5 text-center">
              <p className="text-sm font-semibold text-slate-600">
                Boss stickers are an individual upgrade - unlock them plus every
                avatar and an ad-free app. Free while in preview.
              </p>
              <button
                onClick={acceptUpsell}
                className="mt-4 w-full rounded-2xl bg-accent px-4 py-3 font-black text-ink"
              >
                Become a Birdie Boss
              </button>
              <button
                onClick={declineUpsell}
                className="mt-1 w-full rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-500"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
