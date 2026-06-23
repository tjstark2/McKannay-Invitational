import { ChevronRight } from "lucide-react";
import { formatRoundFormat } from "@/lib/format";
import {
  buildCurrentRoundStandings,
  getCurrentRoundRace,
  getTournamentAwards,
  getTournamentProgress,
} from "@/lib/scoring";
import { Card } from "@/components/ui/Card";
import { NextRoundCard } from "@/features/trip/components/NextRoundCard";
import { StandingsCard } from "@/features/trip/components/StandingsCard";
import { useTripState } from "@/features/trip/state/TripStateContext";
import type { Screen } from "@/types";

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
    courses,
    scoringSettings,
    currentRoundId,
  } = useTripState();

  const teamAName = teams.find((team) => team.id === "A")?.name ?? "Team A";
  const teamBName = teams.find((team) => team.id === "B")?.name ?? "Team B";

  const progress = getTournamentProgress(
    trip.totalPoints,
    matches,
    players,
    rounds,
    scores,
    courses,
    scoringSettings
  );

  const awards = getTournamentAwards(
    players,
    rounds,
    matches,
    scores,
    courses,
    scoringSettings
  );

  const currentRound =
    rounds.find((round) => round.id === currentRoundId) ?? rounds[0];

  const currentCourse = courses.find(
    (course) => course.id === currentRound.courseId
  );

  const currentRoundRace = getCurrentRoundRace(
    trip.totalPoints,
    currentRound,
    matches,
    players,
    rounds,
    scores,
    courses,
    scoringSettings
  );

  const currentRoundScores = scores.filter(
    (score) => score.roundId === currentRound.id
  );

  const frontNineSubmitted = currentRoundScores.filter(
    (score) => typeof score.frontNineScore === "number"
  ).length;

  const finalSubmitted = currentRoundScores.filter(
    (score) => typeof score.grossScore === "number"
  ).length;

  const currentRoundStandings = buildCurrentRoundStandings(
    currentRound,
    players,
    scores,
    courses,
    scoringSettings
  );

  const currentRoundLeaders = currentRoundStandings
    .filter((row) => row.displayNet !== null)
    .slice(0, 5);

  const hotRightNow =
    [...currentRoundStandings]
      .filter((row) => row.frontNet !== null)
      .sort((a, b) => (a.frontNet ?? 999) - (b.frontNet ?? 999))[0] ?? null;

  const currentRoundStatus =
    finalSubmitted === players.length
      ? "Complete"
      : frontNineSubmitted > 0 || finalSubmitted > 0
      ? "In Progress"
      : "Not Started";

  return (
    <div className="space-y-6">
      <NextRoundCard setActiveScreen={setActiveScreen} />

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-fairway-900">
              Tournament Race
            </p>
            <h2 className="mt-1 text-xl font-black">
              Projected: {currentRoundRace.projectedTotalPoints.A} -{" "}
              {currentRoundRace.projectedTotalPoints.B}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Includes confirmed points plus current round projections.
            </p>
          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
            {currentRoundRace.totalProjectedRemaining} pts left
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500">{teamAName}</p>
            <p className="mt-1 text-xl font-black">
              {currentRoundRace.confirmedPriorPoints.A} confirmed
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              +{currentRoundRace.currentProjectedPoints.A} projected this round
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500">{teamBName}</p>
            <p className="mt-1 text-xl font-black">
              {currentRoundRace.confirmedPriorPoints.B} confirmed
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              +{currentRoundRace.currentProjectedPoints.B} projected this round
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-sand-50 p-3">
            <p className="text-xs font-bold text-slate-500">Current Confirmed</p>
            <p className="mt-1 text-lg font-black">
              {currentRoundRace.currentConfirmedPoints.A}-
              {currentRoundRace.currentConfirmedPoints.B}
            </p>
          </div>

          <div className="rounded-xl bg-sand-50 p-3">
            <p className="text-xs font-bold text-slate-500">Current Projected</p>
            <p className="mt-1 text-lg font-black">
              {currentRoundRace.currentProjectedPoints.A}-
              {currentRoundRace.currentProjectedPoints.B}
            </p>
          </div>

          <div className="rounded-xl bg-sand-50 p-3">
            <p className="text-xs font-bold text-slate-500">Undecided</p>
            <p className="mt-1 text-lg font-black">
              {currentRoundRace.currentProjectedRemaining}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-fairway-900">
              Current Round
            </p>
            <h2 className="mt-1 text-xl font-black">
              Round {currentRound.roundNumber}: {currentRound.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {currentCourse?.name ?? "Course"} ·{" "}
              {formatRoundFormat(currentRound.format)}
            </p>
          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
            {currentRoundStatus}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500">Front 9 In</p>
            <p className="mt-1 text-xl font-black">
              {frontNineSubmitted} / {players.length}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500">Final In</p>
            <p className="mt-1 text-xl font-black">
              {finalSubmitted} / {players.length}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <h3 className="font-black">Live Standings</h3>
            <p className="text-xs font-bold text-slate-500">
              {finalSubmitted > 0 ? "Final net first" : "Through 9"}
            </p>
          </div>

          <div className="mt-3 space-y-2">
            {currentRoundLeaders.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                No scores submitted for the active round yet.
              </p>
            ) : (
              currentRoundLeaders.map((row, index) => (
                <div
                  key={row.player.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"
                >
                  <div>
                    <p className="font-black">
                      {index + 1}. {row.player.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Team {row.player.team} ·{" "}
                      {row.isFinal ? "Final" : "Through 9"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-black">
                      {row.displayNet === null
                        ? "-"
                        : row.isFinal
                        ? row.displayNet
                        : row.displayNet.toFixed(1)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.isFinal
                        ? `Gross ${row.grossScore}`
                        : `Front ${row.frontNineScore}`}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => setActiveScreen("tournament")}
            className="mt-4 flex w-full items-center justify-between rounded-xl bg-fairway-900 p-3 text-left font-black text-white"
          >
            View Tournament
            <ChevronRight className="h-5 w-5 text-white/80" />
          </button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              🔥 Hot Right Now
            </p>
            <h2 className="mt-1 text-xl font-black">
              {hotRightNow?.player.name ?? "No live leader yet"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {hotRightNow
                ? `Front net ${hotRightNow.frontNet?.toFixed(1)} through 9`
                : "Enter front 9 scores to activate live momentum."}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">Official Tournament Progress</h2>
            <p className="mt-1 text-sm text-slate-500">
              {progress.awardedPoints} / {trip.totalPoints} points officially awarded
            </p>
          </div>

          <p className="text-sm font-black text-fairway-900">
            {Math.round(progress.progressPercent)}%
          </p>
        </div>

        <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-fairway-900"
            style={{ width: `${progress.progressPercent}%` }}
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500">Team A</p>
            <p className="mt-1 text-xl font-black">{progress.teamPoints.A}</p>
          </div>

          <div className="rounded-xl bg-sand-50 p-3">
            <p className="text-xs font-bold text-slate-500">Remaining</p>
            <p className="mt-1 text-xl font-black">
              {progress.remainingPoints}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500">Team B</p>
            <p className="mt-1 text-xl font-black">{progress.teamPoints.B}</p>
          </div>
        </div>
      </Card>

      <StandingsCard />

      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <p className="text-xs font-bold text-slate-500">🏆 MVP</p>
          <p className="mt-1 text-sm font-black">
            {awards.mvp?.player.name ?? "-"}
          </p>
        </Card>

        <Card className="p-3 text-center">
          <p className="text-xs font-bold text-slate-500">🎯 Clutch</p>
          <p className="mt-1 text-sm font-black">
            {awards.clutch?.player.name ?? "-"}
          </p>
        </Card>

        <Card className="p-3 text-center">
          <p className="text-xs font-bold text-slate-500">❄️ Coldest</p>
          <p className="mt-1 text-sm font-black">
            {awards.coldest?.player.name ?? "-"}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setActiveScreen("matchCenter")}
          className="rounded-2xl bg-fairway-900 p-4 text-left text-white shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-2xl">⚔️</p>
              <p className="mt-2 font-black">Match Center</p>
              <p className="mt-1 text-xs text-white/75">
                Pairings and results
              </p>
            </div>

            <ChevronRight className="h-5 w-5 shrink-0 text-white/75" />
          </div>
        </button>

        <button
          onClick={() => setActiveScreen("teams")}
          className="rounded-2xl bg-sand-100 p-4 text-left text-slate-900 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-2xl">🏆</p>
              <p className="mt-2 font-black">Teams</p>
              <p className="mt-1 text-xs text-slate-500">
                Rosters and points
              </p>
            </div>

            <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
          </div>
        </button>
      </div>
    </div>
  );
}