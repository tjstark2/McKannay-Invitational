import { ChevronRight } from "lucide-react";
import { buildTeamSummaries } from "@/lib/scoring";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useTripState } from "@/features/trip/state/TripStateContext";
import type { Screen, TeamId } from "@/types";

export function TeamsScreen({
  setActiveScreen,
  setSelectedTeamId,
}: {
  setActiveScreen: (screen: Screen) => void;
  setSelectedTeamId: (teamId: TeamId) => void;
}) {
  const { teams, players, rounds, matches, scores, courses, scoringSettings } =
    useTripState();

  const summaries = buildTeamSummaries(
    teams,
    players,
    rounds,
    matches,
    scores,
    courses,
    scoringSettings
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <SectionHeader
          title="Teams"
          subtitle="Rosters, points, handicaps, and match wins."
        />
        <img
          src="/brand/teams-birdy.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none -mt-1 h-24 w-auto shrink-0 drop-shadow-[0_10px_14px_rgba(11,36,24,0.35)]"
        />
      </div>

      {summaries.map((summary) => (
        <button
          key={summary.teamId}
          onClick={() => {
            setSelectedTeamId(summary.teamId);
            setActiveScreen("teamDetail");
          }}
          className="block w-full text-left"
        >
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={summary.teamId === "A" ? "/brand/team-red.png" : "/brand/team-blue.png"}
                  alt=""
                  className="h-12 w-12 shrink-0 object-contain"
                />
                <div>
                  <h2
                    className={
                      summary.teamId === "A"
                        ? "font-anton text-3xl text-team-north"
                        : "font-anton text-3xl text-team-south"
                    }
                  >
                    {summary.teamName}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {summary.playerCount} players
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Pill tone={summary.teamId === "A" ? "red" : "blue"}>
                  {summary.points} pts
                </Pill>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-[#f3efe6] p-3">
                <p className="text-xs font-bold text-slate-500">Avg HCP</p>
                <p className="mt-1 font-anton text-2xl">
                  {summary.averageHandicap.toFixed(1)}
                </p>
              </div>

              <div className="rounded-xl bg-[#f3efe6] p-3">
                <p className="text-xs font-bold text-slate-500">Total HCP</p>
                <p className="mt-1 font-anton text-2xl">{summary.totalHandicap}</p>
              </div>

              <div className="rounded-xl bg-[#f3efe6] p-3">
                <p className="text-xs font-bold text-slate-500">Wins</p>
                <p className="mt-1 font-anton text-2xl">{summary.completedMatches}</p>
              </div>
            </div>
          </Card>
        </button>
      ))}
    </div>
  );
}