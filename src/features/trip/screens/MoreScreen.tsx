import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useTripState } from "@/features/trip/state/TripStateContext";
import type { Screen } from "@/types";

export function MoreScreen({ setActiveScreen }: { setActiveScreen: (screen: Screen) => void }) {
  const { trip } = useTripState();

  const links: { label: string; screen: Screen; description: string }[] = [
    { label: "Rules", screen: "rules", description: "Tournament format and points" },
    { label: "Match Center", screen: "matchCenter", description: "Pairings, scores, and match status" },
    { label: "Teams", screen: "teams", description: "Rosters, handicaps, and team points" },
    { label: "Players", screen: "players", description: "Player profiles and score history" },
    { label: "Admin Setup", screen: "admin", description: "Local setup controls" }
  ];

  return (
    <div className="space-y-4">
      <SectionHeader title="More" subtitle="Trip details, setup, and admin tools." />

      <Card className="p-4">
        <h2 className="font-black">Trip Details</h2>
        <p className="mt-2 text-sm text-slate-600">{trip.location} · {trip.dates}</p>
        <p className="mt-1 text-sm text-slate-600">Lodging: {trip.lodgingName}</p>
        <p className="mt-1 text-sm text-slate-600">Address: {trip.lodgingAddress}</p>
        <p className="mt-1 text-sm text-slate-600">Join Code: {trip.joinCode}</p>
      </Card>

      <div className="grid gap-2">
        {links.map((link) => (
          <button key={link.screen} onClick={() => setActiveScreen(link.screen)} className="rounded-xl bg-white p-4 text-left shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-black">{link.label}</p>
                <p className="mt-1 text-xs text-slate-500">{link.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
