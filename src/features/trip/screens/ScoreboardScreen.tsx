import { SectionHeader } from "@/components/ui/SectionHeader";
import { StandingsCard } from "@/features/trip/components/StandingsCard";
import type { Screen } from "@/types";

export function ScoreboardScreen({ setActiveScreen }: { setActiveScreen: (screen: Screen) => void }) {
  return (
    <div className="space-y-4">
      <div className="relative pr-28">
        <SectionHeader title="Scoreboard" subtitle="Team points and match status." />
        <img
          src="/brand/scoreboard-birdy.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -top-4 right-0 h-28 w-auto drop-shadow-[0_10px_14px_rgba(11,36,24,0.35)]"
        />
      </div>
      <StandingsCard />

      <button
        onClick={() => setActiveScreen("matchCenter")}
        className="w-full rounded-xl bg-fairway-900 py-3 font-black text-white shadow-sm"
      >
        Open Match Center
      </button>
    </div>
  );
}
