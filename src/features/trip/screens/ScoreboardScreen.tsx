import { SectionHeader } from "@/components/ui/SectionHeader";
import { StandingsCard } from "@/features/trip/components/StandingsCard";
import { FlairCard } from "@/components/ui/FlairCard";
import type { Screen } from "@/types";

export function ScoreboardScreen({ setActiveScreen }: { setActiveScreen: (screen: Screen) => void }) {
  return (
    <div className="space-y-4">
      <SectionHeader title="Scoreboard" subtitle="Team points and match status." />
      <FlairCard img="/brand/scoreboard-birdy.png" />
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
