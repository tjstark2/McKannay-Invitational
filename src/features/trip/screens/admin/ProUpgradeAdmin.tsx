"use client";

import { Sparkles, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useViewer } from "@/features/trip/state/ViewerContext";

export function ProUpgradeAdmin() {
  const { trip, updateTrip } = useTripState();
  const { canManage, isOwner } = useViewer();

  if (!canManage) return null;

  if (trip.isPro) {
    return (
      <Card className="border-accent/40 bg-accent/10 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-ink">
            <Check size={18} />
          </span>
          <div>
            <p className="font-anton text-xl tracking-tight text-ink">
              TourneyBirdie Pro
            </p>
            <p className="text-sm text-slate-600">
              This tournament is Pro - everyone here has the Pro features.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fairway-900 text-white">
          <Sparkles size={18} />
        </span>
        <div className="min-w-0">
          <p className="font-anton text-xl tracking-tight text-ink">
            Upgrade to Pro
          </p>
          <p className="mt-0.5 text-sm text-slate-600">
            Unlock custom backgrounds (and more to come) for everyone in this
            tournament. Free while in preview - no card required.
          </p>
          {isOwner ? (
            <button
              onClick={() => updateTrip({ isPro: true })}
              className="mt-3 w-full rounded-2xl bg-accent px-4 py-3 font-black text-ink"
            >
              Make this a Pro tournament
            </button>
          ) : (
            <p className="mt-3 rounded-xl bg-sand-50 px-3 py-2 text-sm text-slate-500">
              Only the tournament owner can upgrade to Pro.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
