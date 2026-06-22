import { ChevronRight } from "lucide-react";
import { resolveMatch } from "@/lib/scoring";
import { formatRoundFormat } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useTripState } from "@/features/trip/state/TripStateContext";
import type { Screen } from "@/types";

export function MatchCenterScreen({
  setActiveScreen,
  setSelectedMatchId,
}: {
  setActiveScreen: (screen: Screen) => void;
  setSelectedMatchId: (matchId: string) => void;
}) {
  const { courses, matches, players, rounds, scores, scoringSettings } =
    useTripState();

  const getPlayerName = (playerId: string) =>
    players.find((player) => player.id === playerId)?.name ?? playerId;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Match Center"
        subtitle="Pairings, formats, status, and point values."
      />

      {matches.map((match) => {
        const result = resolveMatch(
          match,
          players,
          rounds,
          scores,
          courses,
          scoringSettings
        );

        const round = rounds.find((item) => item.id === match.roundId);
        const course = courses.find((item) => item.id === round?.courseId);

        return (
          <button
            key={match.id}
            onClick={() => {
              setSelectedMatchId(match.id);
              setActiveScreen("matchDetail");
            }}
            className="block w-full text-left"
          >
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {round?.title ?? "Round"} · {course?.name ?? "Course"}
                  </p>
                  <h2 className="mt-1 font-black">{match.label}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {round ? formatRoundFormat(round.format) : ""} ·{" "}
                    {match.points} pts
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Pill tone={result.status === "final" ? "green" : "amber"}>
                    {result.status}
                  </Pill>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                <p className="text-sm font-bold text-red-800">
                  {match.aPlayers.map(getPlayerName).join(" + ")}
                </p>
                <p className="text-xs font-bold text-slate-400">VS</p>
                <p className="text-sm font-bold text-blue-800">
                  {match.bPlayers.map(getPlayerName).join(" + ")}
                </p>
              </div>

              <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-600">
                {result.label}
              </p>
            </Card>
          </button>
        );
      })}
    </div>
  );
}