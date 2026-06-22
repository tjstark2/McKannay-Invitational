import {
  allowedCourseHandicap,
  getScore,
  netScore,
  playerNetToPar,
  resolveMatch,
} from "@/lib/scoring";
import { formatPlusMinus, formatRoundFormat } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { useTripState } from "@/features/trip/state/TripStateContext";
import type { Screen } from "@/types";

export function MatchDetailScreen({
  matchId,
  setActiveScreen,
}: {
  matchId: string;
  setActiveScreen: (screen: Screen) => void;
}) {
  const { courses, matches, players, rounds, scores, scoringSettings } =
    useTripState();

  const match = matches.find((item) => item.id === matchId) ?? matches[0];
  const round = rounds.find((item) => item.id === match.roundId) ?? rounds[0];
  const course = courses.find((item) => item.id === round.courseId) ?? courses[0];

  const result = resolveMatch(
    match,
    players,
    rounds,
    scores,
    courses,
    scoringSettings
  );

  const renderPlayerRows = (playerIds: string[]) =>
    playerIds.map((playerId) => {
      const player = players.find((item) => item.id === playerId);
      if (!player) return null;

      const score = getScore(scores, round.id, player.id);

      const net = score
        ? netScore(player, round, score.grossScore, courses, scoringSettings)
        : null;

      const plusMinus = score
        ? playerNetToPar(
            player,
            round,
            score.grossScore,
            courses,
            scoringSettings
          )
        : null;

      return (
        <div key={player.id} className="rounded-xl bg-slate-50 p-3 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold">{player.name}</p>
              <p className="text-xs text-slate-500">
                Index {player.handicapIndex} · Allowed CH{" "}
                {allowedCourseHandicap(
                  player,
                  round,
                  courses,
                  scoringSettings
                )}
              </p>
            </div>
            <p className="font-black">{score?.grossScore ?? "-"}</p>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Net {net ?? "-"} · {formatPlusMinus(plusMinus)} to par
          </p>
        </div>
      );
    });

  return (
    <div className="space-y-4">
      <button
        onClick={() => setActiveScreen("matchCenter")}
        className="text-sm font-bold text-fairway-900"
      >
        ← Back to Match Center
      </button>

      <Card className="overflow-hidden">
        <img
          src={course.imageUrl}
          alt={course.name}
          className="h-36 w-full object-cover"
        />

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black">{match.label}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {round.title} · {course.name}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {formatRoundFormat(round.format)}
              </p>
            </div>

            <Pill tone={result.status === "final" ? "green" : "amber"}>
              {result.status}
            </Pill>
          </div>

          <p className="mt-4 rounded-xl bg-sand-50 p-3 text-sm font-semibold text-slate-700">
            {result.label}
          </p>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-black text-red-800">Team A</h2>
        <div className="mt-3 space-y-2">{renderPlayerRows(match.aPlayers)}</div>
      </Card>

      <Card className="p-4">
        <h2 className="font-black text-blue-800">Team B</h2>
        <div className="mt-3 space-y-2">{renderPlayerRows(match.bPlayers)}</div>
      </Card>
    </div>
  );
}