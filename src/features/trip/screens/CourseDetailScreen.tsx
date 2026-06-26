import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";
import { formatRoundFormat } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useViewer } from "@/features/trip/state/ViewerContext";
import { CourseBackground } from "@/features/trip/components/CourseBackground";
import { BackgroundPicker } from "@/features/trip/components/BackgroundPicker";
import { getSupabaseClient } from "@/lib/supabase/client";
import { setCourseBackground } from "@/lib/supabase/backgrounds";
import type { Screen } from "@/types";

export function CourseDetailScreen({
  courseId,
  setActiveScreen
}: {
  courseId: string;
  setActiveScreen: (screen: Screen) => void;
}) {
  const { courses, rounds, trip } = useTripState();
  const { canManage } = useViewer();
  const course = courses.find((item) => item.id === courseId) ?? courses[0];
  const courseRounds = rounds.filter((round) => round.courseId === course.id);

  const [bg, setBg] = useState<string | null>(course.imageUrl || null);
  const [picking, setPicking] = useState(false);
  useEffect(() => {
    setBg(course.imageUrl || null);
  }, [course.id, course.imageUrl]);

  async function choose(value: string | null) {
    setBg(value);
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await setCourseBackground(supabase, course.id, value);
      } catch {
        /* keep optimistic UI */
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <button onClick={() => setActiveScreen("schedule")} className="text-sm font-bold text-fairway-900">
          ← Back to Schedule
        </button>
        <img
          src="/brand/course-detail-birdy.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none -mt-3 h-24 w-auto shrink-0 drop-shadow-[0_10px_14px_rgba(11,36,24,0.35)]"
        />
      </div>

      <Card className="overflow-hidden">
        <div className="relative h-48 w-full overflow-hidden">
          <CourseBackground value={bg} alt={course.name} />
          {canManage ? (
            <button
              onClick={() => setPicking(true)}
              className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-extrabold text-fairway-900 shadow backdrop-blur"
            >
              <ImagePlus size={14} /> Background
            </button>
          ) : null}
        </div>
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

      <BackgroundPicker
        open={picking}
        onClose={() => setPicking(false)}
        value={bg}
        onSelect={choose}
        tripId={trip.id}
        canUpload={trip.isPro}
        title={`Background - ${course.name}`}
      />
    </div>
  );
}
