import { ChevronRight } from "lucide-react";
import { buildTeamSummaries, resolveMatch } from "@/lib/scoring";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { useTripState } from "@/features/trip/state/TripStateContext";
import type { Screen, TeamId } from "@/types";

export function TeamDetailScreen({
  teamId,
  setActiveScreen,
  setSelectedPlayerId,
}: {
  teamId: TeamId;
  setActiveScreen: (screen: Screen) => void;
  setSelectedPlayerId: (playerId: string) => void;
}) {
  const { teams, players, rounds, matches, scores, courses, scoringSettings } =
    useTripState();

  const team = teams.find((item) => item.id === teamId) ?? teams[0];
  const roster = players.filter((player) => player.team === team.id);

  const summary = buildTeamSummaries(
    teams,
    players,
    rounds,
    matches,
    scores,
    courses,
    scoringSettings
  ).find((item) => item.teamId === team.id);

  const teamMatches = matches.filter((match) =>
    [...match.aPlayers, ...match.bPlayers].some((playerId) =>
      roster.some((player) => player.id === playerId)
    )
  );

  return (
    <div className="space-y-4">
      <button
        onClick={() => setActiveScreen("teams")}
        className="text-sm font-bold text-fairway-900"
      >
        ← Back to Teams
      </button>

      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1
              className={
                team.id === "A"
                  ? "text-3xl font-black text-red-800"
                  : "text-3xl font-black text-blue-800"
              }
            >
              {team.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {roster.length} players
            </p>
          </div>

          <Pill tone={team.id === "A" ? "red" : "blue"}>
            {summary?.points ?? 0} pts
          </Pill>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500">Avg HCP</p>
            <p className="mt-1 text-xl font-black">
              {summary?.averageHandicap.toFixed(1)}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500">Match Wins</p>
            <p className="mt-1 text-xl font-black">
              {summary?.completedMatches}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-black">Roster</h2>

        <div className="mt-3 space-y-2">
          {roster.map((player) => (
            <button
              key={player.id}
              onClick={() => {
                setSelectedPlayerId(player.id);
                setActiveScreen("playerProfile");
              }}
              className="block w-full rounded-xl bg-slate-50 p-3 text-left text-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold">{player.name}</p>

                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-slate-500">
                    Index {player.handicapIndex}
                  </p>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-black">Team Matches</h2>

        <div className="mt-3 space-y-2">
          {teamMatches.map((match) => {
            const result = resolveMatch(
              match,
              players,
              rounds,
              scores,
              courses,
              scoringSettings
            );

            return (
              <div
                key={match.id}
                className="rounded-xl bg-slate-50 p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold">{match.label}</p>

                  <Pill
                    tone={
                      result.winner === team.id
                        ? "green"
                        : result.winner === "T"
                        ? "amber"
                        : "default"
                    }
                  >
                    {result.winner === team.id
                      ? "Won"
                      : result.winner === "T"
                      ? "Tied"
                      : result.status}
                  </Pill>
                </div>

                <p className="mt-2 text-xs text-slate-500">{result.label}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}