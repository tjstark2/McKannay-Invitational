"use client";

import { useState } from "react";
import { ImagePlus } from "lucide-react";
import type { Screen } from "@/types";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useViewer } from "@/features/trip/state/ViewerContext";
import { useBirdieBoss } from "@/features/account/birdieBoss";
import { BrandBox } from "@/features/trip/components/Brand";
import { CourseBackground } from "@/features/trip/components/CourseBackground";
import { BackgroundPicker } from "@/features/trip/components/BackgroundPicker";
import { getSupabaseClient } from "@/lib/supabase/client";
import { setHeaderBackground } from "@/lib/supabase/backgrounds";

export function TopHero({
  activeScreen,
}: {
  activeScreen: Screen;
  setActiveScreen: (screen: Screen) => void;
}) {
  const { trip } = useTripState();
  const { canManage } = useViewer();
  const { isBoss } = useBirdieBoss();
  const [bg, setBg] = useState<string | null>(trip.headerBackground);
  const [picking, setPicking] = useState(false);

  async function choose(value: string | null) {
    setBg(value);
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await setHeaderBackground(supabase, trip.id, value);
      } catch {
        /* keep optimistic UI; will reconcile on next load */
      }
    }
  }

  return (
    <div className="overflow-hidden rounded-b-[2rem] bg-sand-50 shadow-sm">
      <div className="relative h-56 bg-gradient-to-br from-fairway-900 via-fairway-700 to-moss">
        <CourseBackground value={bg} alt={trip.name} />
        <div className="absolute inset-0 bg-gradient-to-t from-fairway-900/95 via-fairway-900/45 to-fairway-900/10" />

        <div className="absolute left-4 top-4 flex flex-col items-start gap-1.5">
          <BrandBox />
          {trip.isPro ? (
            <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-ink shadow">
              Pro Version
            </span>
          ) : null}
          {isBoss ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#1d1402] px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-accent shadow">
              👑 Birdie Boss
            </span>
          ) : null}
        </div>

        {canManage ? (
          <button
            onClick={() => setPicking(true)}
            className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-extrabold text-fairway-900 shadow backdrop-blur"
          >
            <ImagePlus size={14} /> Banner
          </button>
        ) : null}

        <div className="absolute bottom-5 left-5 right-5 text-center text-white">
          <p className="text-xs font-bold uppercase tracking-[0.22em] opacity-90">
            {trip.location}
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight drop-shadow">
            {trip.name}
          </h1>
          <p className="mt-1 text-sm font-medium opacity-90">{trip.dates}</p>
        </div>
      </div>

      <BackgroundPicker
        open={picking}
        onClose={() => setPicking(false)}
        value={bg}
        onSelect={choose}
        tripId={trip.id}
        canUpload={trip.isPro}
        title="Tournament banner"
        subtitle="The big image at the top of every screen."
      />
    </div>
  );
}
