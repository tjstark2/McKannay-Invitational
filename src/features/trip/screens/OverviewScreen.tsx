import { PlayerAvatar } from "@/features/avatar/PlayerAvatar";
import { useState } from "react";
import { formatRoundFormat } from "@/lib/format";
import {
  buildCurrentRoundStandings,
  getBestNetRound,
  getBiggestMover,
  getCurrentRoundRace,
  getOverviewAwards,
  getRoundStatus,
  getTournamentProgress,
  type AwardResult,
} from "@/lib/scoring";
import { Card } from "@/components/ui/Card";
import { NextRoundCard } from "@/features/trip/components/NextRoundCard";
import { StandingsCard } from "@/features/trip/components/StandingsCard";
import { useTripState } from "@/features/trip/state/TripStateContext";
import type { Screen } from "@/types";

function AwardTile({
  img,
  label,
  award,
}: {
  img: string;
  label: string;
  award: AwardResult;
}) {
  return (
    <Card className="p-3 text-center">
      <img src={img} alt={label} className="mx-auto h-14 w-14 object-contain" />
      <p className="mt-1 truncate text-sm font-black">
        {award ? award.players.map((p) => p.name).join(" & ") : "—"}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-500">
        {award ? award.detail : "Not enough data"}
      </p>
    </Card>
  );
}

export function OverviewScreen({
  setActiveScreen,
}: {
  setActiveScreen: (screen: Screen) => void;
}) {
  const {
    trip,
    teams,
    players,
    rounds,
    matches,
    scores,
    groupScores,
    courses,
    scoringSettings,
    currentRoundId,
  } = useTripState();

  const teamAName = teams.find((team) => team.id === "A")?.name ?? "Team A";
  const teamBName = teams.find((team) => team.id === "B")?.name ?? "Team B";

  const [showAllLeaders, setShowAllLeaders] = useState(false);

  // Featured round: the admin's active round unless it's complete, in which
  // case auto-advance to the first round that isn't finished yet.
  const adminRound = rounds.find((round) => round.id === currentRoundId);
  const adminComplete = adminRound
    ? getRoundStatus(adminRound, players, scores) === "complete"
    : false;
  const featuredRound =
    (adminRound && !adminComplete ? adminRound : null) ??
    rounds.find((round) => getRoundStatus(round, players, scores) !== "complete") ??
    rounds[rounds.length - 1] ??
    adminRound ??
    rounds[0];

  if (!featuredRound) {
    return (
      <div className="space-y-6">
        <Card className="p-5">
          <p className="font-black">No Rounds Yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Add a round in Admin to get the tournament started.
          </p>
        </Card>
      </div>
    );
  }

  const featuredStatus = getRoundStatus(featuredRound, players, scores);

  const progress = getTournamentProgress(
    trip.totalPoints,
    matches,
    players,
    rounds,
    scores,
    courses,
    scoringSettings
  );

  const awards = getOverviewAwards(
    players,
    rounds,
    matches,
    scores,
    courses,
    scoringSettings
  );

  const bestNet = getBestNetRound(
    players,
    rounds,
    scores,
    courses,
    scoringSettings
  );

  const biggestMover = getBiggestMover(
    players,
    rounds,
    scores,
    courses,
    scoringSettings
  );

  const race = getCurrentRoundRace(
    trip.totalPoints,
    featuredRound,
    matches,
    players,
    rounds,
    scores,
    courses,
    scoringSettings
  );

  const roundScores = scores.filter(
    (score) => score.roundId === featuredRound.id
  );
  const frontNineSubmitted = roundScores.filter(
    (score) => typeof score.frontNineScore === "number"
  ).length;
  const finalSubmitted = roundScores.filter(
    (score) => typeof score.grossScore === "number"
  ).length;

  const standings = buildCurrentRoundStandings(
    featuredRound,
    players,
    scores,
    courses,
    scoringSettings
  );

  const leaders = standings.filter((row) => row.displayNet !== null).slice(0, 3);

  const hot =
    [...standings]
      .filter((row) => row.frontNet !== null && !row.isFinal)
      .sort((a, b) => (a.frontNet ?? 999) - (b.frontNet ?? 999))[0] ?? null;

  // Team momentum — who is projected to take the live round, and by how much.
  const projA = race.currentProjectedPoints.A;
  const projB = race.currentProjectedPoints.B;
  const momentumLeader =
    projA > projB ? teamAName : projB > projA ? teamBName : null;
  const momentumMargin = Math.abs(projA - projB);

  // Overall projected race → momentum bar fill + golf-ball marker position.
  const projTotalA = race.projectedTotalPoints.A;
  const projTotalB = race.projectedTotalPoints.B;
  const projTotal = projTotalA + projTotalB;
  const aPct = projTotal > 0 ? (projTotalA / projTotal) * 100 : 50;
  const ballPct = Math.min(94, Math.max(6, aPct));
  const momentumNote =
    projTotalA > projTotalB
      ? `${teamAName} ahead in the projected race`
      : projTotalB > projTotalA
      ? `${teamBName} ahead in the projected race`
      : "Dead even in the projected race";

  // Grouped rounds (Scramble / Best Ball 2v2-4v4) record one combined score
  // per SIDE, not per player — so progress, status, and leaders come from
  // group_scores, not per-player score entries.
  const isGroupedRound = featuredRound.groupSize != null;
  const roundMatches = matches.filter((m) => m.roundId === featuredRound.id);
  const roundMatchIds = new Set(roundMatches.map((m) => m.id));
  const roundGroupScores = groupScores.filter((g) =>
    roundMatchIds.has(g.matchId)
  );
  const totalSides = roundMatches.length * 2;
  const groupFrontIn = roundGroupScores.filter(
    (g) => g.frontNineScore != null
  ).length;
  const groupFinalIn = roundGroupScores.filter(
    (g) => g.grossScore != null
  ).length;
  const groupStatus =
    totalSides > 0 && groupFinalIn === totalSides
      ? "complete"
      : groupFrontIn > 0 || groupFinalIn > 0
      ? "live"
      : "not_started";

  const dispStatus = isGroupedRound ? groupStatus : featuredStatus;
  const dispFrontIn = isGroupedRound ? groupFrontIn : frontNineSubmitted;
  const dispFinalIn = isGroupedRound ? groupFinalIn : finalSubmitted;
  const dispTotal = isGroupedRound ? totalSides : players.length;
  const sideNames = (ids: string[]) =>
    ids
      .map((id) => players.find((p) => p.id === id)?.name)
      .filter(Boolean)
      .join(" & ") || "—";

  return (
    <div className="space-y-6">
      {/* 0 — The Nest */}
      <div className="relative flex items-center gap-3 pr-28">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-white shadow-[0_8px_18px_-12px_rgba(14,76,48,0.5)]">
          <img
            src="/brand/the-nest.png"
            alt="The Nest"
            className="h-full w-full object-contain"
          />
        </span>
        <div className="min-w-0">
          <h2 className="font-anton text-3xl leading-none tracking-tight text-ink">
            The Nest
          </h2>
          <p className="mt-1.5 text-xs font-semibold text-slate-500">
            Your tournament home base.
          </p>
        </div>
        <img
          src="/brand/hero-mascot.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -top-5 right-2 h-24 w-auto drop-shadow-[0_10px_14px_rgba(11,36,24,0.35)]"
        />
      </div>

      {/* 1 — hero */}
      <NextRoundCard
        round={featuredRound}
        status={dispStatus}
        setActiveScreen={setActiveScreen}
      />

      {/* 1.5 — team momentum */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-anton text-2xl tracking-tight text-ink">
          <span className="h-5 w-2 rounded-[3px] bg-mint" />
          Team Momentum
        </h2>
        <Card className="p-5">
          <div className="flex items-center justify-between text-xs font-extrabold">
            <span className="text-team-north">{teamAName}</span>
            <span className="text-team-south">{teamBName}</span>
          </div>
          <div className="relative mt-2 h-4">
            <div className="absolute inset-0 overflow-hidden rounded-full border border-line bg-[#ece7db]">
              <div
                className="absolute inset-y-0 left-0 bg-team-north"
                style={{ width: `${aPct}%` }}
              />
              <div
                className="absolute inset-y-0 right-0 bg-team-south"
                style={{ left: `${aPct}%` }}
              />
            </div>
            <span
              className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-300 bg-white shadow-[0_3px_6px_-2px_rgba(0,0,0,0.5)]"
              style={{
                left: `${ballPct}%`,
                backgroundImage:
                  "radial-gradient(#cdd3cd 1px, transparent 1.4px)",
                backgroundSize: "5px 5px",
              }}
            />
          </div>
          <p className="mt-3 text-center text-sm font-semibold text-slate-600">
            {momentumNote}
          </p>
        </Card>
      </section>

      {/* 2 — who's winning */}
      <StandingsCard />

      {/* 3 — this round */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-anton text-2xl tracking-tight text-ink"><span className="h-5 w-2 rounded-[3px] bg-mint" />This Round</h2>
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-fairway-900">
                Round {featuredRound.roundNumber} ·{" "}
                {formatRoundFormat(featuredRound.format)}
              </p>
              <h3 className="mt-1 text-lg font-black">{featuredRound.title}</h3>
            </div>
            <div className="rounded-full bg-[#ece7db] px-3 py-1 text-xs font-black text-slate-600">
              {dispStatus === "complete"
                ? "Final"
                : dispStatus === "live"
                ? "In Progress"
                : "Not Started"}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-[#f3efe6] p-3">
              <p className="text-xs font-bold text-slate-500">Front 9 In</p>
              <p className="mt-1 font-anton text-2xl">
                {dispFrontIn} / {dispTotal}
              </p>
            </div>
            <div className="rounded-xl bg-[#f3efe6] p-3">
              <p className="text-xs font-bold text-slate-500">Final In</p>
              <p className="mt-1 font-anton text-2xl">
                {dispFinalIn} / {dispTotal}
              </p>
            </div>
          </div>

          {/* team momentum */}
          <div className="mt-3 rounded-xl bg-sand-50 p-3 text-sm">
            <p className="font-black">📈 Team Momentum</p>
            <p className="mt-1 text-slate-600">
              {momentumLeader
                ? `${momentumLeader} projected to take this round by ${momentumMargin} ${
                    momentumMargin === 1 ? "point" : "points"
                  } (${projA}–${projB}).`
                : dispStatus === "not_started"
                ? "No scores in yet — momentum opens once play starts."
                : `Dead even this round (${projA}–${projB}).`}
            </p>
          </div>

          {/* hot right now */}
          {!isGroupedRound && hot ? (
            <div className="mt-3 rounded-xl bg-[#f3efe6] p-3 text-sm">
              <p className="font-black">🔥 Hot Right Now</p>
              <p className="mt-1 flex items-center gap-1.5 text-slate-600">
                <PlayerAvatar
                  avatarId={hot.player.avatarId}
                  emoji={hot.player.avatarEmoji}
                  name={hot.player.name}
                  size={20}
                />
                {hot.player.name} — front net {hot.frontNet?.toFixed(1)} through
                9.
              </p>
            </div>
          ) : null}

          {/* live leaders */}
          <div className="mt-4">
            <p className="text-xs font-black uppercase text-slate-500">
              Live Leaders
            </p>
            <div className="mt-2 space-y-2">
              {isGroupedRound ? (
                roundMatches.length === 0 ? (
                  <p className="rounded-xl bg-[#f3efe6] p-3 text-sm text-slate-500">
                    No matchups set up for this round yet.
                  </p>
                ) : (
                  roundMatches.map((m) => {
                    const a = roundGroupScores.find(
                      (g) => g.matchId === m.id && g.side === "A"
                    );
                    const b = roundGroupScores.find(
                      (g) => g.matchId === m.id && g.side === "B"
                    );
                    const show = (s?: {
                      frontNineScore?: number;
                      grossScore?: number;
                    }) =>
                      s?.grossScore != null
                        ? String(s.grossScore)
                        : s?.frontNineScore != null
                        ? `${s.frontNineScore} (F9)`
                        : "—";
                    return (
                      <div
                        key={m.id}
                        className="space-y-1 rounded-xl bg-[#f3efe6] p-3 text-sm"
                      >
                        <p className="text-xs font-bold text-slate-500">
                          {m.label}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-red-800">
                            {teamAName} · {sideNames(m.aPlayers)}
                          </span>
                          <span className="font-black">{show(a)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-800">
                            {teamBName} · {sideNames(m.bPlayers)}
                          </span>
                          <span className="font-black">{show(b)}</span>
                        </div>
                        <p className="text-xs font-bold text-fairway-900">
                          {m.manualResult
                            ? m.manualResult === "T"
                              ? "Tied"
                              : `${
                                  m.manualResult === "A" ? teamAName : teamBName
                                } Wins`
                            : "In progress"}
                        </p>
                      </div>
                    );
                  })
                )
              ) : leaders.length === 0 ? (
                <p className="rounded-xl bg-[#f3efe6] p-3 text-sm text-slate-500">
                  No scores submitted for this round yet.
                </p>
              ) : (
                (showAllLeaders ? standings : leaders).map((row, index) => (
                  <div
                    key={row.player.id}
                    className="flex items-center justify-between rounded-xl bg-[#f3efe6] p-3 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <PlayerAvatar
                        avatarId={row.player.avatarId}
                        emoji={row.player.avatarEmoji}
                        name={row.player.name}
                        size={30}
                      />
                      <div className="min-w-0">
                      <p className="truncate font-black">
                        {row.displayNet !== null ? `${index + 1}. ` : ""}
                        {row.player.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Team {row.player.team} ·{" "}
                        {row.status === "final"
                          ? "Final"
                          : row.status === "through_9"
                          ? "Through 9 · proj"
                          : "Not started"}
                      </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black">
                        {row.displayNet === null
                          ? "—"
                          : row.isFinal
                          ? row.displayNet
                          : row.displayNet.toFixed(1)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {row.status === "final"
                          ? `Gross ${row.grossScore}`
                          : row.status === "through_9"
                          ? `Front ${row.frontNineScore}`
                          : "—"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {!isGroupedRound &&
            standings.length > leaders.length &&
            leaders.length > 0 ? (
              <button
                onClick={() => setShowAllLeaders((v) => !v)}
                className="mt-3 w-full rounded-xl bg-[#ece7db] py-2 text-sm font-black text-slate-600"
              >
                {showAllLeaders
                  ? "Show top 3"
                  : `Show all ${standings.length}`}
              </button>
            ) : null}
          </div>
        </Card>
      </section>

      {/* 4 — tournament race */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-anton text-2xl tracking-tight text-ink"><span className="h-5 w-2 rounded-[3px] bg-mint" />
          Tournament Race
        </h2>
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-anton text-2xl">
                Projected: {race.projectedTotalPoints.A} –{" "}
                {race.projectedTotalPoints.B}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Confirmed points plus current-round projections.
              </p>
            </div>
            <div className="rounded-full bg-[#ece7db] px-3 py-1 text-xs font-black text-slate-600">
              {race.totalProjectedRemaining} left
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-[#f3efe6] p-3">
              <p className="text-xs font-bold text-slate-500">{teamAName}</p>
              <p className="mt-1 font-anton text-2xl">
                {race.confirmedPriorPoints.A}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                +{race.currentProjectedPoints.A} this round
              </p>
            </div>
            <div className="rounded-xl bg-[#f3efe6] p-3">
              <p className="text-xs font-bold text-slate-500">{teamBName}</p>
              <p className="mt-1 font-anton text-2xl">
                {race.confirmedPriorPoints.B}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                +{race.currentProjectedPoints.B} this round
              </p>
            </div>
          </div>

        </Card>
      </section>

      {/* 5 — stat highlights */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-anton text-2xl tracking-tight text-ink"><span className="h-5 w-2 rounded-[3px] bg-mint" />Highlights</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2.5 rounded-[18px] border border-line bg-white p-3 shadow-[0_10px_24px_-20px_rgba(14,76,48,0.5)]">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden">
              <img src="/brand/best-net.png" alt="Best Net Round" className="h-full w-full object-contain" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                Best Net Round
              </p>
              <div className="flex items-center gap-1.5">
                {bestNet ? (
                  <PlayerAvatar
                    avatarId={bestNet.player.avatarId}
                    emoji={bestNet.player.avatarEmoji}
                    name={bestNet.player.name}
                    size={18}
                  />
                ) : null}
                <p className="truncate text-sm font-extrabold">
                  {bestNet ? bestNet.player.name : "—"}
                </p>
              </div>
              <p className="truncate text-[11px] text-slate-500">
                {bestNet ? bestNet.label : "No finals yet"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-[18px] border border-line bg-white p-3 shadow-[0_10px_24px_-20px_rgba(14,76,48,0.5)]">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden">
              <img src="/brand/biggest-mover.png" alt="Biggest Mover" className="h-full w-full object-contain" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                Biggest Mover
              </p>
              <div className="flex items-center gap-1.5">
                {biggestMover ? (
                  <PlayerAvatar
                    avatarId={biggestMover.player.avatarId}
                    emoji={biggestMover.player.avatarEmoji}
                    name={biggestMover.player.name}
                    size={18}
                  />
                ) : null}
                <p className="truncate text-sm font-extrabold">
                  {biggestMover ? biggestMover.player.name : "—"}
                </p>
              </div>
              <p className="truncate text-[11px] text-slate-500">
                {biggestMover ? biggestMover.label : "Needs 2+ rounds"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6 — awards */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-anton text-2xl tracking-tight text-ink"><span className="h-5 w-2 rounded-[3px] bg-mint" />Awards</h2>
        <div className="grid grid-cols-3 gap-2">
          <AwardTile img="/brand/mvp.png" label="MVP" award={awards.mvp} />
          <AwardTile img="/brand/clutch.png" label="Clutch" award={awards.clutch} />
          <AwardTile img="/brand/coldest.png" label="Coldest" award={awards.coldest} />
        </div>
      </section>

      {/* 7 — progress */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-anton text-2xl tracking-tight text-ink"><span className="h-5 w-2 rounded-[3px] bg-mint" />
          Official Progress
        </h2>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {progress.awardedPoints} / {trip.totalPoints} points awarded
            </p>
            <p className="text-sm font-black text-fairway-900">
              {Math.round(progress.progressPercent)}%
            </p>
          </div>
          <div className="mt-3 h-4 overflow-hidden rounded-full bg-[#ece7db]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-fairway-700 to-mint"
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-[#f3efe6] p-3">
              <p className="text-xs font-bold text-slate-500">{teamAName}</p>
              <p className="mt-1 font-anton text-2xl">{progress.teamPoints.A}</p>
            </div>
            <div className="rounded-xl bg-sand-50 p-3">
              <p className="text-xs font-bold text-slate-500">Remaining</p>
              <p className="mt-1 font-anton text-2xl">
                {progress.remainingPoints}
              </p>
            </div>
            <div className="rounded-xl bg-[#f3efe6] p-3">
              <p className="text-xs font-bold text-slate-500">{teamBName}</p>
              <p className="mt-1 font-anton text-2xl">{progress.teamPoints.B}</p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
