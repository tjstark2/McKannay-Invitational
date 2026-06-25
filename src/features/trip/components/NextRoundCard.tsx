import { PlayerAvatar } from "@/features/avatar/PlayerAvatar";
import { formatRoundFormat } from "@/lib/format";
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
        <span className="h-[18px] w-2 rounded-[3px] bg-accent" />
        <h2 className="text-xl font-black text-fairway-900">{heading}</h2>
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

      <div className="overflow-hidden rounded-[22px] border border-sand-100 bg-white shadow-sm">
        {/* photo hero with forest overlay */}
        <div className="relative min-h-[218px] bg-gradient-to-br from-fairway-700 to-fairway-900">
          {course?.imageUrl ? (
            <img
              src={course.imageUrl}
              alt={course.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-fairway-900/95 via-fairway-900/55 to-fairway-900/15" />
          <div className="relative p-4 text-white">
            <span className="absolute right-4 top-3 text-2xl drop-shadow">⛳</span>
            <p className="text-xs font-bold text-fairway-100">
              {round.dateLabel ? `${round.dateLabel} · ` : ""}Round{" "}
              {round.roundNumber}
            </p>
            <h3 className="mt-1 text-2xl font-black tracking-tight drop-shadow">
              {course?.name ?? "Course"}
            </h3>
            <p className="mt-0.5 text-sm text-fairway-50/90">
              {course?.location}
            </p>
            {course ? (
              <p className="mt-3 inline-block rounded-lg border border-accent/50 bg-fairway-900/55 px-2 py-1 text-xs font-extrabold text-fairway-50">
                {course.teeName} ·{" "}
                {course.yardage !== null
                  ? `${course.yardage.toLocaleString()} yds · `
                  : ""}
                {course.rating}/{course.slope} · Par {course.par}
              </p>
            ) : null}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-fairway-900/45 p-2.5">
                <p className="text-[10px] font-bold uppercase text-fairway-100">
                  Format
                </p>
                <p className="mt-0.5 font-black">
                  {formatRoundFormat(round.format, round.groupSize)}
                </p>
              </div>
              <div className="rounded-xl bg-fairway-900/45 p-2.5">
                <p className="text-[10px] font-bold uppercase text-fairway-100">
                  Points
                </p>
                <p className="mt-0.5 font-black">{round.pointsAvailable}</p>
              </div>
              <div className="rounded-xl bg-fairway-900/45 p-2.5">
                <p className="text-[10px] font-bold uppercase text-fairway-100">
                  Arrive
                </p>
                <p className="mt-0.5 font-black">{round.arrivalTime || "—"}</p>
              </div>
            </div>
          </div>
        </div>

        {round.teeTimes.length > 0 ? (
          <div className="grid grid-cols-3 divide-x divide-sand-100">
            {round.teeTimes.map((tee, index) => (
              <div key={tee.id} className="p-3">
                <p className="text-sm font-black text-fairway-900">
                  Tee {index + 1}
                </p>
                <p className="mt-1 text-sm font-semibold">{tee.time || "—"}</p>
                <div className="mt-2 flex flex-col gap-1 text-xs text-slate-600">
                  {tee.players.map((pid) => {
                    const p = players.find((x) => x.id === pid);
                    return (
                      <span key={pid} className="flex items-center gap-1.5">
                        <PlayerAvatar
                          avatarId={p?.avatarId}
                          emoji={p?.avatarEmoji}
                          name={p?.name ?? pid}
                          size={18}
                        />
                        <span className="truncate">{p?.name ?? pid}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 py-3 text-sm text-slate-500">
            No tee times set for this round yet.
          </p>
        )}

        <div className="p-4">
          <button
            onClick={() => setActiveScreen("matchCenter")}
            className="flex w-full items-center justify-center gap-1 rounded-2xl bg-accent px-4 py-3.5 font-black text-fairway-900"
          >
            View Round ›
          </button>
        </div>
      </div>
    </section>
  );
}
