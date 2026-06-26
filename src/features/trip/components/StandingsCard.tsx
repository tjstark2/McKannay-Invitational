import { calculateTeamPoints } from "@/lib/scoring";
import { Card } from "@/components/ui/Card";
import { useTripState } from "@/features/trip/state/TripStateContext";

export function StandingsCard() {
  const {
    trip,
    teams,
    players,
    rounds,
    matches,
    scores,
    courses,
    scoringSettings,
  } = useTripState();

  const totals = calculateTeamPoints(
    matches,
    players,
    rounds,
    scores,
    courses,
    scoringSettings
  );

  const remaining = trip.totalPoints - totals.A - totals.B;

  const teamAName = teams.find((team) => team.id === "A")?.name ?? "Team A";
  const teamBName = teams.find((team) => team.id === "B")?.name ?? "Team B";

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 font-anton text-2xl tracking-tight text-ink">
        <span className="h-5 w-2 rounded-[3px] bg-mint" />
        Trip Standings
      </h2>

      <Card className="p-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center">
          <div>
            <img src="/brand/team-red.png" alt="" className="mx-auto h-12 w-12 object-contain" />
            <p className="mt-1 font-bold text-team-north">{teamAName}</p>
            <p className="mt-1 font-anton text-5xl text-team-north">
              {totals.A}
            </p>
          </div>

          <div className="font-anton text-xl text-slate-400">VS</div>

          <div>
            <img src="/brand/team-blue.png" alt="" className="mx-auto h-12 w-12 object-contain" />
            <p className="mt-1 font-bold text-team-south">{teamBName}</p>
            <p className="mt-1 font-anton text-5xl text-team-south">{totals.B}</p>
          </div>
        </div>

        <p className="mt-4 rounded-xl bg-sand-50 p-3 text-center text-sm font-semibold text-slate-600">
          {remaining} points remaining · {trip.winningNumber}+ wins ·{" "}
          {trip.retainNumber} retains
        </p>
      </Card>
    </section>
  );
}