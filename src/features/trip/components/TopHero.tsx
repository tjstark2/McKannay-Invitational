import type { Screen } from "@/types";
import { useTripState } from "@/features/trip/state/TripStateContext";

export function TopHero({
  activeScreen,
}: {
  activeScreen: Screen;
  setActiveScreen: (screen: Screen) => void;
}) {
  const { trip } = useTripState();

  return (
    <div className="overflow-hidden rounded-b-[2rem] bg-white shadow-sm">
      <div className="relative h-52 bg-gradient-to-br from-fairway-900 via-fairway-700 to-sand-700">
        <img
          src="/images/header.jpg"
          alt="McKannay Invitational header"
          className="h-full w-full object-cover opacity-85"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />

        <div className="absolute bottom-5 left-5 right-5 text-center text-white">
          <p className="text-xs font-bold uppercase tracking-[0.22em] opacity-90">
            {trip.location}
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight">
            {trip.name}
          </h1>
          <p className="mt-1 text-sm font-medium opacity-90">{trip.dates}</p>
        </div>
      </div>
    </div>
  );
}