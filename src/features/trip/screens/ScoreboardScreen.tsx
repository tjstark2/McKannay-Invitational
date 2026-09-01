"use client";

import { SectionHeader } from "@/components/ui/SectionHeader";
import { StandingsCard } from "@/features/trip/components/StandingsCard";
import { useLiveRound } from "@/features/trip/scoring/useLiveRound";
import { useTripState } from "@/features/trip/state/TripStateContext";
import type { Screen, TeamId } from "@/types";

export function ScoreboardScreen({ setActiveScreen }: { setActiveScreen: (screen: Screen) => void }) {
  const live = useLiveRound();
  const { players, matches, teams } = useTripState();

  // Points a side is CURRENTLY leading on. Explicitly tentative: a match is
  // not settled until the cards are signed, and a one-hole swing on 18 can
  // move a point from one team to the other. Shown separately from the real
  // standings below so nobody mistakes one for the other.
  const tentative = (() => {
    if (live.matchStates.length === 0) return null;
    let a = 0;
    let b = 0;
    let live_ = 0;
    for (const st of live.matchStates) {
      if (st.thru === 0) continue;
      const match = matches.find((m) => m.id === st.matchId);
      if (!match) continue;
      live_ += 1;
      if (st.standing > 0) a += match.points;
      else if (st.standing < 0) b += match.points;
      else {
        a += match.points / 2;
        b += match.points / 2;
      }
    }
    return live_ > 0 ? { a, b, live: live_ } : null;
  })();

  const teamName = (code: TeamId) =>
    teams.find((t) => t.id === code)?.name ?? `Team ${code}`;
  void players;

  return (
    <div className="space-y-4">
      <div className="relative pr-28">
        <SectionHeader title="Scoreboard" subtitle="Team points and match status." />
        <img
          src="/brand/scoreboard-birdy.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -top-4 right-0 h-28 w-auto drop-shadow-[0_10px_14px_rgba(11,36,24,0.35)]"
        />
      </div>

      {tentative && live.round ? (
        <div className="rounded-2xl border-2 border-dashed border-fairway-900 bg-white p-3">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-xs font-black uppercase tracking-wide text-fairway-900">
              If the round ended now
            </span>
            <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">
              {tentative.live} match{tentative.live === 1 ? "" : "es"} out
            </span>
          </div>
          <div className="grid grid-cols-3 items-center text-center">
            <div>
              <p className="truncate text-[13px] font-black text-team-north">{teamName("A")}</p>
              <p className="font-anton text-3xl text-ink">{tentative.a}</p>
            </div>
            <p className="font-anton text-sm text-slate-400">vs</p>
            <div>
              <p className="truncate text-[13px] font-black text-team-south">{teamName("B")}</p>
              <p className="font-anton text-3xl text-ink">{tentative.b}</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-4 text-slate-500">
            Tentative. Nothing counts until the cards are signed - a hole on 18
            can move a point across.
          </p>
        </div>
      ) : null}

      <StandingsCard />

      <button
        onClick={() => setActiveScreen("matchCenter")}
        className="w-full rounded-xl bg-fairway-900 py-3 font-black text-white shadow-sm"
      >
        Open Match Center
      </button>
    </div>
  );
}
