import { formatRoundFormat } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { ChevronButton } from "@/components/ui/ChevronButton";
import { useTripState } from "@/features/trip/state/TripStateContext";
import type { RoundStatus } from "@/lib/scoring";
import type { Round, Screen } from "@/types";

export function NextRoundCard({
  round,
  status,
  setActiveScreen,
}: {
  round: Round;
  status: RoundStatus;
  setActiveScreen: (screen: Screen) => void;
}) {
  const { courses, players } = useTripState();

  const course = courses.find((item) => item.id === round.courseId) ?? courses[0];

  const getPlayerName = (playerId: string) =>
    players.find((player) => player.id === playerId)?.name ?? playerId;

  const heading =
    status === "live"
      ? "Live Round"
      : status === "complete"
      ? "Latest Round"
      : "Next Round";

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-xl font-black text-slate-900">{heading}</h2>
        {status === "live" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-black text-red-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
            </span>
            LIVE
          </span>
        ) : status === "complete" ? (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-black text-slate-600">
            FINAL
          </span>
        ) : (
          <span className="rounded-full bg-fairway-100 px-2 py-0.5 text-xs font-black text-fairway-900">
            UP NEXT
          </span>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="p-4">
          <div className="grid grid-cols-[1fr_116px] gap-4">
            <div>
              <p className="text-sm text-slate-500">
                {round.dateLabel ? `${round.dateLabel} · ` : ""}Round{" "}
                {round.roundNumber}
              </p>
              <h3 className="mt-1 text-lg font-black text-slate-900">
                {course?.name ?? "Course"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {course?.location}
              </p>
              {course ? (
                <p className="mt-2 inline-block rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                  Par {course.par} · {course.rating}/{course.slope}
                </p>
              ) : null}
            </div>

            {course?.imageUrl ? (
              <img
                src={course.imageUrl}
                alt={course.name}
                className="h-24 w-full rounded-xl object-cover"
              />
            ) : null}
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
              <p className="mt-1 font-black">{round.arrivalTime || "—"}</p>
            </div>
          </div>

          {round.teeTimes.length > 0 ? (
            <div className="grid grid-cols-3 divide-x divide-slate-200">
              {round.teeTimes.map((tee, index) => (
                <div key={tee.id} className="p-3">
                  <p className="text-sm font-black text-fairway-900">
                    Tee {index + 1}
                  </p>
                  <p className="mt-1 text-sm font-semibold">{tee.time || "—"}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    {tee.players.map(getPlayerName).join(", ")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-1 py-3 text-sm text-slate-500">
              No tee times set for this round yet.
            </p>
          )}
        </div>

        <div className="px-4 pb-4">
          <ChevronButton
            onClick={() => setActiveScreen("matchCenter")}
            className="bg-fairway-900 text-white"
          >
            View Round
          </ChevronButton>
        </div>
      </Card>
    </section>
  );
}
