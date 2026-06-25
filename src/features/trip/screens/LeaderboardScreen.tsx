import { formatPlusMinus } from "@/lib/format";
import { buildLeaderboard, getTournamentAwards } from "@/lib/scoring";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { PlayerAvatar } from "@/features/avatar/PlayerAvatar";

export function LeaderboardScreen() {
  const { courses, matches, players, rounds, scores, scoringSettings } =
    useTripState();

  const leaderboard = buildLeaderboard(
    players,
    rounds,
    matches,
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
    <div className="space-y-4">
      <SectionHeader
        title="Leaderboard"
        subtitle="Individual points, net scoring, and awards."
      />

      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <p className="text-xs font-bold text-slate-500">🏆 MVP</p>
          <p className="mt-1 font-black">{awards.mvp?.player.name ?? "-"}</p>
          <p className="mt-1 text-xs text-slate-500">Most points</p>
        </Card>

        <Card className="p-3 text-center">
          <p className="text-xs font-bold text-slate-500">🎯 Clutch</p>
          <p className="mt-1 font-black">{awards.clutch?.player.name ?? "-"}</p>
          <p className="mt-1 text-xs text-slate-500">Point impact</p>
        </Card>

        <Card className="p-3 text-center">
          <p className="text-xs font-bold text-slate-500">❄️ Coldest</p>
          <p className="mt-1 font-black">{awards.coldest?.player.name ?? "-"}</p>
          <p className="mt-1 text-xs text-slate-500">Worst net avg</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-5 border-b border-slate-100 pb-2 text-xs font-bold text-slate-500">
          <div className="col-span-2">Player</div>
          <div className="text-center">Pts</div>
          <div className="text-center">+/-</div>
          <div className="text-center">Avg</div>
        </div>

        {leaderboard.map((row, index) => (
          <div
            key={row.player.id}
            className="grid grid-cols-5 items-center border-b border-slate-50 py-3 text-sm last:border-b-0"
          >
            <div className="col-span-2 flex items-center gap-2.5">
              <span className="w-4 text-right text-xs font-black text-slate-400">
                {index + 1}
              </span>
              <PlayerAvatar
                avatarId={row.player.avatarId}
                emoji={row.player.avatarEmoji}
                name={row.player.name}
                size={32}
              />
              <div className="min-w-0">
                <p className="truncate font-black">{row.player.name}</p>
                <p className="text-xs text-slate-500">Team {row.player.team}</p>
              </div>
            </div>

            <div className="text-center font-bold">{row.pointsWon}</div>

            <div className="text-center font-bold">
              {formatPlusMinus(row.totalNetToPar)}
            </div>

            <div className="text-center font-bold">
              {row.averageNetToPar === null
                ? "-"
                : row.averageNetToPar > 0
                ? `+${row.averageNetToPar.toFixed(1)}`
                : row.averageNetToPar.toFixed(1)}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}