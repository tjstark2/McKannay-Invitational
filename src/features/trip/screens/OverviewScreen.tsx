import { ChevronRight } from "lucide-react";
import { getTournamentAwards, getTournamentProgress } from "@/lib/scoring";
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
    players,
    rounds,
    matches,
    scores,
    courses,
    scoringSettings,
  } = useTripState();

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

  return (
    <div className="space-y-6">
      <NextRoundCard setActiveScreen={setActiveScreen} />

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">Tournament Progress</h2>
            <p className="mt-1 text-sm text-slate-500">
              {progress.awardedPoints} / {trip.totalPoints} points awarded
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
            <p className="mt-1 text-xl font-black">
              {progress.teamPoints.A}
            </p>
          </div>

          <div className="rounded-xl bg-sand-50 p-3">
            <p className="text-xs font-bold text-slate-500">Remaining</p>
            <p className="mt-1 text-xl font-black">
              {progress.remainingPoints}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500">Team B</p>
            <p className="mt-1 text-xl font-black">
              {progress.teamPoints.B}
            </p>
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
          onClick={() => setActiveScreen("tournament")}
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