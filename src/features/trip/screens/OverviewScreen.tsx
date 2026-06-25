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
  emoji,
  label,
  award,
}: {
  emoji: string;
  label: string;
  award: AwardResult;
}) {
  return (
    <Card className="p-3 text-center">
      <p className="text-xs font-bold text-slate-500">
        {emoji} {label}
      </p>
      <p className="mt-1 text-sm font-black">
        {award ? award.players.map((p) => p.name).join(" & ") : "—"}
      </p>
      <p className="mt-0.5 text-xs text-slate-500">
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
      <div className="relative flex items-center gap-3 rounded-[20px] border border-line bg-white px-4 py-3 pr-28 shadow-[0_14px_30px_-22px_rgba(14,76,48,0.4)]">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-white">
          <img
            src="/brand/the-nest.png"
            alt="The Nest"
            className="h-full w-full object-contain"
          />
        </span>
        <div className="min-w-0">
          <h2 className="font-anton text-2xl leading-none tracking-tight text-ink">
            The Nest
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
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

      {/* 2 — who's winning */}
      <StandingsCard />

      {/* 3 — this round */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-fairway-900"><span className="h-[18px] w-2 rounded-[3px] bg-accent" />This Round</h2>
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-fairway-900">
                Round {featuredRound.roundNumber} ·{" "}
                {formatRoundFormat(featuredRound.format)}
              </p>
              <h3 className="mt-1 text-lg font-black">{featuredRound.title}</h3>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              {dispStatus === "complete"
                ? "Final"
                : dispStatus === "live"
                ? "In Progress"
                : "Not Started"}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500">Front 9 In</p>
              <p className="mt-1 text-xl font-black">
                {dispFrontIn} / {dispTotal}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500">Final In</p>
              <p className="mt-1 text-xl font-black">
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
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
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
                  <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
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
                        className="space-y-1 rounded-xl bg-slate-50 p-3 text-sm"
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
                <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                  No scores submitted for this round yet.
                </p>
              ) : (
                (showAllLeaders ? standings : leaders).map((row, index) => (
                  <div
                    key={row.player.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"
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
                className="mt-3 w-full rounded-xl bg-slate-100 py-2 text-sm font-black text-slate-600"
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
        <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-fairway-900"><span className="h-[18px] w-2 rounded-[3px] bg-accent" />
          Tournament Race
        </h2>
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-black">
                Projected: {race.projectedTotalPoints.A} –{" "}
                {race.projectedTotalPoints.B}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Confirmed points plus current-round projections.
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              {race.totalProjectedRemaining} left
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500">{teamAName}</p>
              <p className="mt-1 text-xl font-black">
                {race.confirmedPriorPoints.A}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                +{race.currentProjectedPoints.A} this round
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500">{teamBName}</p>
              <p className="mt-1 text-xl font-black">
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
        <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-fairway-900"><span className="h-[18px] w-2 rounded-[3px] bg-accent" />Highlights</h2>
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3 text-center">
            <p className="text-xs font-bold text-slate-500">⛳ Best Net Round</p>
            <div className="mt-1 flex flex-col items-center gap-1">
              {bestNet ? (
                <PlayerAvatar
                  avatarId={bestNet.player.avatarId}
                  emoji={bestNet.player.avatarEmoji}
                  name={bestNet.player.name}
                  size={28}
                />
              ) : null}
              <p className="text-sm font-black">
                {bestNet ? bestNet.player.name : "—"}
              </p>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {bestNet
                ? `${bestNet.label} · ${bestNet.round.title}`
                : "No finals yet"}
            </p>
          </Card>

          <Card className="p-3 text-center">
            <p className="text-xs font-bold text-slate-500">🚀 Biggest Mover</p>
            <div className="mt-1 flex flex-col items-center gap-1">
              {biggestMover ? (
                <PlayerAvatar
                  avatarId={biggestMover.player.avatarId}
                  emoji={biggestMover.player.avatarEmoji}
                  name={biggestMover.player.name}
                  size={28}
                />
              ) : null}
              <p className="text-sm font-black">
                {biggestMover ? biggestMover.player.name : "—"}
              </p>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {biggestMover ? biggestMover.label : "Needs 2+ rounds"}
            </p>
          </Card>
        </div>
      </section>

      {/* 6 — awards */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-fairway-900"><span className="h-[18px] w-2 rounded-[3px] bg-accent" />Awards</h2>
        <div className="grid grid-cols-3 gap-2">
          <AwardTile emoji="🏆" label="MVP" award={awards.mvp} />
          <AwardTile emoji="🎯" label="Clutch" award={awards.clutch} />
          <AwardTile emoji="❄️" label="Coldest" award={awards.coldest} />
        </div>
      </section>

      {/* 7 — progress */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-fairway-900"><span className="h-[18px] w-2 rounded-[3px] bg-accent" />
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
          <div className="mt-3 h-4 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-fairway-900"
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500">{teamAName}</p>
              <p className="mt-1 text-xl font-black">{progress.teamPoints.A}</p>
            </div>
            <div className="rounded-xl bg-sand-50 p-3">
              <p className="text-xs font-bold text-slate-500">Remaining</p>
              <p className="mt-1 text-xl font-black">
                {progress.remainingPoints}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500">{teamBName}</p>
              <p className="mt-1 text-xl font-black">{progress.teamPoints.B}</p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
