"use client";

// Home, while a round is live.
//
// One screen instead of five. During the 2026 trip the live picture was spread
// across Tee It Up, three Pecking Order tabs and The Nest - each computed
// separately, and at times disagreeing. Players could enter a score easily and
// then had no idea what it meant: "could you tell how your team was doing"
// scored 2.5 out of 5, the lowest number in the survey.
//
// So the order here is the order a golfer asks: am I winning, what do I do
// on this hole, how is everyone else doing.

import { useMemo, useState } from "react";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useAuth } from "@/features/auth/AuthContext";
import { useLiveRound } from "@/features/trip/scoring/useLiveRound";
import { toParLabel } from "@/features/trip/scoring/liveStandings";
import { AddScoreScreen } from "@/features/trip/screens/AddScoreScreen";
import { StandingsCard } from "@/features/trip/components/StandingsCard";
import type { Round } from "@/types";

export function RoundHome({
  round,
  onOpenMatch,
  onOpenPlayer,
}: {
  round: Round;
  onOpenMatch: (matchId: string) => void;
  onOpenPlayer: (playerId: string) => void;
}) {
  const { players, matches } = useTripState();
  const { user } = useAuth();
  const live = useLiveRound();
  const [open, setOpen] = useState<"team" | "matches" | "card" | null>(null);

  const me = players.find((p) => p.accountId === user?.id) ?? null;
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "-";

  const roundMatches = matches.filter((m) => m.roundId === round.id);
  const myMatch = me
    ? roundMatches.find((m) => m.aPlayers.includes(me.id) || m.bPlayers.includes(me.id)) ?? null
    : null;
  const myState = myMatch ? live.matchStates.find((s) => s.matchId === myMatch.id) ?? null : null;
  const mySide = myMatch && me ? (myMatch.aPlayers.includes(me.id) ? "A" : "B") : null;
  const myRow = me ? live.rows.find((r) => r.playerId === me.id) ?? null : null;

  // Everything from MY side's point of view: positive means I'm up.
  const myStanding = myState && mySide ? (mySide === "A" ? myState.standing : -myState.standing) : 0;
  const opponents = myMatch && mySide ? (mySide === "A" ? myMatch.bPlayers : myMatch.aPlayers) : [];
  const partners = myMatch && mySide && me
    ? (mySide === "A" ? myMatch.aPlayers : myMatch.bPlayers).filter((id) => id !== me.id)
    : [];

  const tally = useMemo(() => {
    const t = { won: 0, lost: 0, halved: 0 };
    for (const h of myState?.holes ?? []) {
      if (h.winner === "T") t.halved += 1;
      else if (h.winner === mySide) t.won += 1;
      else t.lost += 1;
    }
    return t;
  }, [myState, mySide]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
        <span className="text-[13px] font-black text-fairway-900">{round.title}</span>
        {myState ? (
          <span className="ml-auto text-[13px] font-bold text-slate-400">
            thru {myState.thru} of {live.holeCount}
          </span>
        ) : null}
      </div>

      {/* 1. Am I winning. The loudest complaint in the survey was not being
          able to see the match score - so it is the biggest thing here. */}
      {myMatch ? (
        <button
          type="button"
          onClick={() => onOpenMatch(myMatch.id)}
          className="block w-full rounded-2xl border border-line bg-white p-4 text-left"
        >
          <p className="text-[13px] font-bold text-slate-500">
            {partners.length ? `You and ${partners.map(nameOf).join(", ")}` : "Your match"} vs{" "}
            {opponents.map(nameOf).join(" and ")}
          </p>
          <p
            className={`mt-1 font-anton text-4xl tracking-tight ${
              myStanding > 0 ? "text-fairway-900" : myStanding < 0 ? "text-red-700" : "text-ink"
            }`}
          >
            {!myState || myState.thru === 0
              ? "Not started"
              : myStanding === 0
              ? "All square"
              : myStanding > 0
              ? `${myStanding} up`
              : `${-myStanding} down`}
          </p>

          {/* Per hole: the payoff of entering scores hole by hole. */}
          <div className="mt-3 flex gap-[3px]" aria-hidden="true">
            {Array.from({ length: live.holeCount }).map((_, i) => {
              const h = myState?.holes[i];
              const tone = !h
                ? "bg-sand-100"
                : h.winner === "T"
                ? "bg-slate-300"
                : h.winner === mySide
                ? "bg-fairway-900"
                : "bg-red-600";
              return <span key={i} className={`h-1.5 flex-1 rounded-full ${tone}`} />;
            })}
          </div>
          {myState && myState.thru > 0 ? (
            <p className="mt-2 text-[12px] font-bold text-slate-500">
              Won {tally.won}, lost {tally.lost}, halved {tally.halved}
            </p>
          ) : null}
        </button>
      ) : myRow ? (
        // No match this round - an individual format like net score.
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="text-[13px] font-bold text-slate-500">Your round, net of your strokes</p>
          <p className="mt-1 font-anton text-4xl tracking-tight text-ink">{toParLabel(myRow.netToPar)}</p>
          <p className="mt-1 text-[12px] font-bold text-slate-500">
            {myRow.gross} shot, thru {myRow.thru}
          </p>
        </div>
      ) : null}

      {/* 2. What do I do on this hole. The existing scoring flow, unchanged -
          it just lives here now instead of behind its own tab. */}
      <AddScoreScreen />

      {/* 3. How is everyone else doing. One tap down, not competing. */}
      <div className="rounded-2xl border border-line bg-white px-4">
        <Row
          label="Team points"
          open={open === "team"}
          onToggle={() => setOpen(open === "team" ? null : "team")}
        >
          <StandingsCard />
        </Row>

        {roundMatches.length > 0 ? (
          <Row
            label="All matches"
            detail={`${roundMatches.length} this round`}
            open={open === "matches"}
            onToggle={() => setOpen(open === "matches" ? null : "matches")}
          >
            <div className="space-y-1.5 pb-2">
              {roundMatches.map((m) => {
                const st = live.matchStates.find((s) => s.matchId === m.id);
                const leader =
                  !st || st.thru === 0
                    ? "Not started"
                    : st.standing === 0
                    ? "All square"
                    : `${(st.standing > 0 ? m.aPlayers : m.bPlayers).map(nameOf).join(" and ")} ${st.label}`;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onOpenMatch(m.id)}
                    className="flex w-full items-center gap-2 rounded-xl bg-[#f3efe6] px-3 py-2 text-left"
                  >
                    <span className="flex-1 truncate text-[13px] font-black text-ink">{leader}</span>
                    {st && st.thru > 0 ? (
                      <span className="text-[12px] font-bold text-slate-500">thru {st.thru}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </Row>
        ) : null}

        {me && live.holes.length > 0 ? (
          <Row
            label="Full scorecard"
            detail={myRow ? `${toParLabel(myRow.toPar)} thru ${myRow.thru}` : undefined}
            open={open === "card"}
            onToggle={() => setOpen(open === "card" ? null : "card")}
            last
          >
            <Scorecard
              playerIds={
                round.teeTimes?.find((t) => t.players.includes(me.id))?.players ?? [me.id]
              }
              meId={me.id}
              onOpenPlayer={onOpenPlayer}
            />
          </Row>
        ) : null}
      </div>
    </div>
  );
}

function Row({
  label,
  detail,
  open,
  onToggle,
  children,
  last,
}: {
  label: string;
  detail?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={last ? "" : "border-b border-sand-100"}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 py-3 text-left"
      >
        <span className="flex-1 text-[14px] font-black text-ink">{label}</span>
        {detail ? <span className="text-[13px] font-bold text-slate-500">{detail}</span> : null}
        <span className={`text-slate-400 transition ${open ? "rotate-180" : ""}`} aria-hidden="true">
          ⌄
        </span>
      </button>
      {open ? <div className="pb-3">{children}</div> : null}
    </div>
  );
}

/**
 * The whole card at once, not one hole at a time - the survey asked for it
 * directly. Holes where a player gets a shot are shaded, which fixes "I didn't
 * notice he was stroking for five holes".
 */
function Scorecard({
  playerIds,
  meId,
  onOpenPlayer,
}: {
  playerIds: string[];
  meId: string;
  onOpenPlayer: (id: string) => void;
}) {
  const { players } = useTripState();
  const live = useLiveRound();
  const nines = [live.holes.slice(0, 9), live.holes.slice(9)].filter((n) => n.length > 0);
  const score = (pid: string, hole: number) =>
    live.holeScores.find((s) => s.playerId === pid && s.hole === hole)?.strokes;

  return (
    <div className="space-y-3">
      {nines.map((nine, n) => (
        <div key={n} className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-center text-[12px]">
            <thead>
              <tr className="text-slate-400">
                <th className="w-[76px] text-left font-bold">Hole</th>
                {nine.map((h) => (
                  <th key={h.hole} className="font-bold">
                    {h.hole}
                  </th>
                ))}
              </tr>
              <tr className="text-slate-400">
                <td className="text-left font-bold">Par</td>
                {nine.map((h) => (
                  <td key={h.hole}>{h.par}</td>
                ))}
              </tr>
            </thead>
            <tbody>
              {playerIds.map((pid) => {
                const p = players.find((x) => x.id === pid);
                return (
                  <tr key={pid} className={pid === meId ? "font-black text-ink" : "text-slate-600"}>
                    <td className="truncate py-1 text-left">
                      <button type="button" onClick={() => onOpenPlayer(pid)} className="truncate">
                        {pid === meId ? "You" : p?.name ?? "-"}
                      </button>
                    </td>
                    {nine.map((h) => {
                      const s = score(pid, h.hole);
                      const shots = live.strokes[pid]?.[h.hole] ?? 0;
                      return (
                        <td
                          key={h.hole}
                          className={`py-1 ${shots > 0 ? "rounded bg-amber-100" : ""}`}
                          title={shots > 0 ? `Gets ${shots} shot${shots > 1 ? "s" : ""}` : undefined}
                        >
                          {s ?? ""}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
      <p className="text-[11px] text-slate-400">Shaded holes are where that player gets a shot.</p>
    </div>
  );
}
