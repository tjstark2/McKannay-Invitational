"use client";

import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { CourseBackground } from "@/features/trip/components/CourseBackground";
import { BackgroundPicker } from "@/features/trip/components/BackgroundPicker";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  setCourseBackground,
  setHeaderBackground,
} from "@/lib/supabase/backgrounds";

type Target = { kind: "header" } | { kind: "course"; id: string };

export function BackgroundsAdmin() {
  const { trip, courses } = useTripState();
  const [headerBg, setHeaderBg] = useState<string | null>(trip.headerBackground);
  const [courseBg, setCourseBg] = useState<Record<string, string | null>>(
    Object.fromEntries(courses.map((c) => [c.id, c.imageUrl || null]))
  );
  const [target, setTarget] = useState<Target | null>(null);

  const currentValue =
    target?.kind === "header"
      ? headerBg
      : target?.kind === "course"
      ? courseBg[target.id] ?? null
      : null;

  async function choose(value: string | null) {
    const supabase = getSupabaseClient();
    if (!target) return;
    if (target.kind === "header") {
      setHeaderBg(value);
      if (supabase) {
        try {
          await setHeaderBackground(supabase, trip.id, value);
        } catch {
          /* optimistic */
        }
      }
    } else {
      setCourseBg((m) => ({ ...m, [target.id]: value }));
      if (supabase) {
        try {
          await setCourseBackground(supabase, target.id, value);
        } catch {
          /* optimistic */
        }
      }
    }
  }

  const Tile = ({
    label,
    value,
    onClick,
  }: {
    label: string;
    value: string | null;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border border-line bg-white p-2 text-left"
    >
      <span className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg">
        <CourseBackground value={value} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-ink">{label}</span>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-fairway-900">
          <ImagePlus size={12} /> Change
        </span>
      </span>
    </button>
  );

  return (
    <Card className="p-4">
      <SectionHeader
        title="Backgrounds"
        subtitle={
          trip.isPro
            ? "Pick a scene or upload your own for the header and each course."
            : "Pick a scene for the header and each course."
        }
      />
      <div className="mt-3 space-y-2">
        <Tile
          label="Tournament header"
          value={headerBg}
          onClick={() => setTarget({ kind: "header" })}
        />
        {courses.map((c) => (
          <Tile
            key={c.id}
            label={c.name}
            value={courseBg[c.id] ?? null}
            onClick={() => setTarget({ kind: "course", id: c.id })}
          />
        ))}
      </div>

      <BackgroundPicker
        open={target !== null}
        onClose={() => setTarget(null)}
        value={currentValue}
        onSelect={choose}
        tripId={trip.id}
        canUpload={trip.isPro}
        title={target?.kind === "header" ? "Tournament header" : "Course background"}
      />
    </Card>
  );
}
