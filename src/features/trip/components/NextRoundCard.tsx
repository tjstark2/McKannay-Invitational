import { formatRoundFormat } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { ChevronButton } from "@/components/ui/ChevronButton";
import { useTripState } from "@/features/trip/state/TripStateContext";
import type { Screen } from "@/types";

export function NextRoundCard({
  setActiveScreen,
}: {
  setActiveScreen: (screen: Screen) => void;
}) {
  const { courses, players, rounds, currentRoundId } = useTripState();

  const round = rounds.find((item) => item.id === currentRoundId) ?? rounds[0];
  const course = courses.find((item) => item.id === round.courseId) ?? courses[0];

  const getPlayerName = (playerId: string) =>
    players.find((player) => player.id === playerId)?.name ?? playerId;

  return (
    <section>
      <h2 className="mb-3 text-xl font-black text-slate-900">Active Round</h2>

      <Card className="overflow-hidden">
        <div className="p-4">
          <div className="grid grid-cols-[1fr_116px] gap-4">
            <div>
              <p className="text-sm text-slate-500">
                {round.dateLabel} · Round {round.roundNumber}
              </p>
              <h3 className="mt-1 text-lg font-black text-slate-900">
                {course.name}
              </h3>
              <p className="mt-1 text-sm text-slate-500">{course.location}</p>
            </div>

            <img
              src={course.imageUrl}
              alt={course.name}
              className="h-24 w-full rounded-xl object-cover"
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs font-semibold text-slate-500">Format</p>
              <p className="mt-1 font-black">{formatRoundFormat(round.format)}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500">Points</p>
              <p className="mt-1 font-black">{round.pointsAvailable}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500">Arrive</p>
              <p className="mt-1 font-black">{round.arrivalTime}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-slate-200">
            {round.teeTimes.map((tee, index) => (
              <div key={tee.id} className="p-3">
                <p className="text-sm font-black text-fairway-900">
                  Tee {index + 1}
                </p>
                <p className="mt-1 text-sm font-semibold">{tee.time}</p>
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  {tee.players.map(getPlayerName).join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 pb-4">
          <ChevronButton
            onClick={() => setActiveScreen("tournament")}
            className="bg-fairway-900 text-white"
          >
            View Active Round
          </ChevronButton>
        </div>
      </Card>
    </section>
  );
}