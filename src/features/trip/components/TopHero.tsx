import type { Screen } from "@/types";
import { useTripState } from "@/features/trip/state/TripStateContext";

export function TopHero({
  activeScreen,
  setActiveScreen,
}: {
  activeScreen: Screen;
  setActiveScreen: (screen: Screen) => void;
}) {
  const { trip } = useTripState();

  const topTabs: { id: Screen; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "🏠" },
    { id: "schedule", label: "Schedule", icon: "📅" },
    { id: "scoreboard", label: "Scoreboard", icon: "📊" },
    { id: "leaderboard", label: "Leaders", icon: "👥" },
  ];

  return (
    <div className="overflow-hidden rounded-b-[2rem] bg-white shadow-sm">
      <div className="relative h-52 bg-gradient-to-br from-fairway-900 via-fairway-700 to-sand-700">
        <img
          src="/images/header.jpg"
          alt="McKannay Invitational header"
          className="h-full w-full object-cover opacity-85"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

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

      <div className="grid grid-cols-4 border-b border-slate-200 bg-white text-center text-xs font-semibold text-slate-500">
        {topTabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveScreen(item.id)}
            className={`px-2 py-3 ${
              activeScreen === item.id
                ? "border-b-2 border-fairway-900 text-fairway-900"
                : ""
            }`}
          >
            <div className="text-lg">{item.icon}</div>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}