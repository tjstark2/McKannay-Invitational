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
      <h2 className="mb-3 text-xl font-black text-slate-900">Trip Standings</h2>

      <Card className="p-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center">
          <div>
            <p className="font-bold text-slate-600">{teamAName}</p>
            <p className="mt-2 text-5xl font-black text-slate-900">
              {totals.A}
            </p>
          </div>

          <div className="text-5xl">🏆</div>

          <div>
            <p className="font-bold text-slate-600">{teamBName}</p>
            <p className="mt-2 text-5xl font-black text-slate-900">
              {totals.B}
            </p>
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