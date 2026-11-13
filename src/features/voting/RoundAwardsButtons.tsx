"use client";

// On a finished round: watch the awards again, and for organizers, rebuild
// them from the current scores (a round that closed before awards existed,
// or a score fixed after the close). Pro only, like the awards themselves.

import { useState } from "react";
import type { Round } from "@/types/domain";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useViewer } from "@/features/trip/state/ViewerContext";
import { openAwards } from "@/features/voting/awardsSignal";
import { rebuildAwards } from "@/lib/roundActions";

export function RoundAwardsButtons({ round }: { round: Round }) {
  const { trip } = useTripState();
  const { canManage } = useViewer();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  if (!trip.isPro) return null;

  const rebuild = async () => {
    setBusy(true);
    setNote(null);
    const result = await rebuildAwards(round.id);
    setBusy(false);
    if (!result.ok) {
      setNote(result.error ?? "Couldn't rebuild the awards.");
      return;
    }
    const n = Number(result.awards ?? 0);
    setNote(n === 0 ? "No awards - this round needs hole-by-hole scores." : `${n} awards ready.`);
    if (n > 0) openAwards(round.id);
  };

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <button
          onClick={() => openAwards(round.id)}
          className="flex-1 rounded-xl bg-fairway-900 px-4 py-2.5 text-sm font-black text-white"
        >
          🏆 See the awards
        </button>
        {canManage ? (
          <button
            onClick={rebuild}
            disabled={busy}
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-black text-fairway-900 disabled:opacity-60"
          >
            {busy ? "Building..." : "Rebuild"}
          </button>
        ) : null}
      </div>
      {note ? <p className="mt-2 text-xs font-bold text-slate-500">{note}</p> : null}
    </div>
  );
}
