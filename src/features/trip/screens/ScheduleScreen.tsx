import { PlayerAvatar } from "@/features/avatar/PlayerAvatar";
import { ChevronRight } from "lucide-react";
import { formatRoundFormat } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useTripState } from "@/features/trip/state/TripStateContext";
import type { Screen } from "@/types";

export function ScheduleScreen({
  setActiveScreen,
  setSelectedCourseId
}: {
  setActiveScreen: (screen: Screen) => void;
  setSelectedCourseId: (courseId: string) => void;
}) {
  const { courses, players, rounds } = useTripState();

  const getPlayerName = (playerId: string) =>
    players.find((player) => player.id === playerId)?.name ?? playerId;

  return (
    <div className="space-y-4">
      <SectionHeader title="Schedule" subtitle="Rounds, tee times, arrivals, and course setup." />

      {rounds.map((round) => {
        const course = courses.find((item) => item.id === round.courseId) ?? courses[0];

        return (
          <Card key={round.id} className="overflow-hidden">
            <button
              onClick={() => {
                setSelectedCourseId(course.id);
                setActiveScreen("courseDetail");
              }}
              className="block w-full text-left"
            >
              <div className="relative">
                <img src={course.imageUrl} alt={course.name} className="h-36 w-full object-cover" />
                <div className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow-sm">
                  <ChevronRight className="h-5 w-5 text-slate-600" />
                </div>
              </div>
            </button>

            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {round.dateLabel} · Be there {round.arrivalTime}
                  </p>
                  <h2 className="mt-1 text-lg font-black">{course.name}</h2>
                  <p className="text-sm text-slate-500">{course.location}</p>
                </div>
                <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300" />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Pill tone="green">{round.pointsAvailable} pts</Pill>
                <Pill tone="blue">{formatRoundFormat(round.format)}</Pill>
                <Pill tone="purple">{course.rating}/{course.slope}</Pill>
                <Pill tone="purple">
                  {course.teeName}
                  {course.yardage !== null
                    ? ` · ${course.yardage.toLocaleString()} yds`
                    : ""}
                </Pill>
              </div>

              <div className="mt-4 space-y-2">
                {round.teeTimes.map((tee, index) => (
                  <div key={tee.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-black">Tee Time {index + 1}</p>
                      <p className="font-bold text-fairway-900">{tee.time}</p>
                    </div>
                    <div className="mt-2 flex flex-col gap-1 text-slate-600">
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
                            <span>{p?.name ?? pid}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
