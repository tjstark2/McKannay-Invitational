"use client";

import { useState } from "react";
import { SmilePlus } from "lucide-react";

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

/**
 * Presentational reaction control: shows existing reaction chips plus an
 * "add reaction" button that opens an emoji grid. The parent owns the data
 * and handles the toggle.
 */
export function ReactionControls({
  summary,
  onToggle,
}: {
  summary: ReactionSummary;
  onToggle: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);

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
            <span className="text-sm leading-none">{emoji}</span>
            {info.count}
          </button>
        ))}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Add reaction"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-300 transition hover:bg-sand-50 hover:text-fairway-900"
        >
          <SmilePlus size={18} />
        </button>
      </div>

      {open ? (
        <div className="mt-1.5 grid grid-cols-7 gap-1 rounded-2xl border border-line bg-white p-2 shadow-[0_8px_18px_-12px_rgba(14,76,48,.5)]">
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
      ) : null}
    </div>
  );
}
