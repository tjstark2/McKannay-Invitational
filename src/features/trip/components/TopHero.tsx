"use client";

import { useRouter } from "next/navigation";
import { Home } from "lucide-react";
import type { Screen } from "@/types";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { BrandBox } from "@/features/trip/components/Brand";

export function TopHero({
  activeScreen,
}: {
  activeScreen: Screen;
  setActiveScreen: (screen: Screen) => void;
}) {
  const { trip } = useTripState();
  const router = useRouter();

  return (
    <div className="overflow-hidden rounded-b-[2rem] bg-sand-50 shadow-sm">
      <div className="relative h-56 bg-gradient-to-br from-fairway-900 via-fairway-700 to-moss">
        <img
          src="/images/header.jpg"
          alt={trip.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-fairway-900/95 via-fairway-900/45 to-fairway-900/10" />

        <BrandBox className="absolute left-4 top-4" />

        <button
          onClick={() => router.push("/home")}
          className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-extrabold text-fairway-900 shadow-lg backdrop-blur"
        >
          <Home className="h-3.5 w-3.5" />
          My Tournaments
        </button>

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
    </div>
  );
}
