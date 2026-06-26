import { PlayerAvatar } from "@/features/avatar/PlayerAvatar";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FlairCard } from "@/components/ui/FlairCard";
import { useTripState } from "@/features/trip/state/TripStateContext";
import type { Screen } from "@/types";

export function PlayersScreen({
  setActiveScreen,
  setSelectedPlayerId
}: {
  setActiveScreen: (screen: Screen) => void;
  setSelectedPlayerId: (playerId: string) => void;
}) {
  const { players, teams } = useTripState();

  const getTeamName = (teamId: string) =>
    teams.find((team) => team.id === teamId)?.name ?? `Team ${teamId}`;

  return (
    <div className="space-y-4">
      <SectionHeader title="Players" subtitle="Teams and handicap indexes." />
      <FlairCard img="/brand/birdie-family.png" />

      {players.map((player) => (
        <button
          key={player.id}
          onClick={() => {
            setSelectedPlayerId(player.id);
            setActiveScreen("playerProfile");
          }}
          className="block w-full text-left"
        >
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <PlayerAvatar
                  avatarId={player.avatarId}
                  emoji={player.avatarEmoji}
                  name={player.name}
                  size={40}
                />
                <div className="min-w-0">
                  <p className="truncate font-black">{player.name}</p>
                  <p className="truncate text-sm text-slate-500">{getTeamName(player.team)}</p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Pill tone={player.team === "A" ? "red" : "blue"}>Index {player.handicapIndex}</Pill>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </div>
            </div>
          </Card>
        </button>
      ))}
    </div>
  );
}
