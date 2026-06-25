import { formatRoundFormat } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { useTripState } from "@/features/trip/state/TripStateContext";
import type { Screen } from "@/types";

export function CourseDetailScreen({
  courseId,
  setActiveScreen
}: {
  courseId: string;
  setActiveScreen: (screen: Screen) => void;
}) {
  const { courses, rounds } = useTripState();
  const course = courses.find((item) => item.id === courseId) ?? courses[0];
  const courseRounds = rounds.filter((round) => round.courseId === course.id);

  return (
    <div className="space-y-4">
      <button onClick={() => setActiveScreen("schedule")} className="text-sm font-bold text-fairway-900">
        ← Back to Schedule
      </button>

      <Card className="overflow-hidden">
        <img src={course.imageUrl} alt={course.name} className="h-48 w-full object-cover" />
        <div className="p-5">
          <h1 className="text-2xl font-black">{course.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{course.location}</p>
          <p className="mt-2 inline-block rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
            {course.teeName} tees
            {course.yardage !== null
              ? ` · ${course.yardage.toLocaleString()} yds`
              : ""}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-[#f3efe6] p-3">
              <p className="text-xs font-bold text-slate-500">Par</p>
              <p className="mt-1 text-xl font-black">{course.par}</p>
            </div>
            <div className="rounded-xl bg-[#f3efe6] p-3">
              <p className="text-xs font-bold text-slate-500">Rating</p>
              <p className="mt-1 text-xl font-black">{course.rating}</p>
            </div>
            <div className="rounded-xl bg-[#f3efe6] p-3">
              <p className="text-xs font-bold text-slate-500">Slope</p>
              <p className="mt-1 text-xl font-black">{course.slope}</p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-600">{course.notes}</p>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-black">Scheduled Rounds</h2>
        <div className="mt-3 space-y-2">
          {courseRounds.map((round) => (
            <div key={round.id} className="rounded-xl bg-[#f3efe6] p-3 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">{round.title}</p>
                  <p className="text-xs text-slate-500">{round.dateLabel}</p>
                </div>
                <Pill tone="green">{round.pointsAvailable} pts</Pill>
              </div>
              <p className="mt-2 text-slate-600">{formatRoundFormat(round.format)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
