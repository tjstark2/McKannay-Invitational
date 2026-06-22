import { formatPlusMinus } from "@/lib/format";
import { netScore, playerNetToPar, resolveMatch } from "@/lib/scoring";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { useTripState } from "@/features/trip/state/TripStateContext";
import type { Screen } from "@/types";

export function PlayerProfileScreen({
  playerId,
  setActiveScreen
}: {
  playerId: string;
  setActiveScreen: (screen: Screen) => void;
}) {
  const { courses, matches, players, rounds, scores, teams } = useTripState();
  const player = players.find((item) => item.id === playerId) ?? players[0];
  const team = teams.find((item) => item.id === player.team);
  const playerScores = scores.filter((score) => score.playerId === player.id);

  const pointsWon = matches.reduce((sum, match) => {
    const result = resolveMatch(match, players, rounds, scores, courses);
    const side = match.aPlayers.includes(player.id) ? "A" : match.bPlayers.includes(player.id) ? "B" : null;

    if (!side) return sum;
    if (result.winner === side) return sum + match.points;
    if (result.winner === "T") return sum + match.points / 2;
    return sum;
  }, 0);

  const totalNetToPar = playerScores.reduce((sum, score) => {
    const round = rounds.find((item) => item.id === score.roundId);
    if (!round) return sum;
    return sum + playerNetToPar(player, round, score.grossScore, courses);
  }, 0);

  return (
    <div className="space-y-4">
      <button onClick={() => setActiveScreen("players")} className="text-sm font-bold text-fairway-900">
        ← Back to Players
      </button>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">{player.name}</h1>
            <p className="mt-1 text-sm text-slate-500">{team?.name ?? `Team ${player.team}`}</p>
          </div>
          <Pill tone={player.team === "A" ? "red" : "blue"}>Index {player.handicapIndex}</Pill>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500">Points</p>
            <p className="mt-1 text-xl font-black">{pointsWon}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500">Net +/-</p>
            <p className="mt-1 text-xl font-black">{formatPlusMinus(totalNetToPar)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500">Rounds</p>
            <p className="mt-1 text-xl font-black">{playerScores.length}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-black">Round Scores</h2>

        <div className="mt-3 space-y-2">
          {playerScores.length === 0 ? (
            <p className="text-sm text-slate-500">No scores entered yet.</p>
          ) : (
            playerScores.map((score) => {
              const round = rounds.find((item) => item.id === score.roundId);
              if (!round) return null;

              const net = netScore(player, round, score.grossScore, courses);
              const netToPar = playerNetToPar(player, round, score.grossScore, courses);

              return (
                <div key={`${score.roundId}-${score.playerId}`} className="rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold">{round.title}</p>
                      <p className="text-xs text-slate-500">{round.dateLabel}</p>
                    </div>
                    <p className="font-black">{score.grossScore}</p>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Net {net} · {formatPlusMinus(netToPar)} to par</p>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
