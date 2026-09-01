"use client";

import { useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useViewer } from "@/features/trip/state/ViewerContext";
import { ProUpsell } from "@/features/trip/components/ProUpsell";

export function ProUpgradeAdmin() {
  const { trip, updateTrip } = useTripState();
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const { canManage, isOwner } = useViewer();
  const [open, setOpen] = useState(false);

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
    <>
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
              tournament.
            </p>
            {isOwner ? (
              <button
                onClick={() => setOpen(true)}
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

      {open ? (
        <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
            <ProUpsell
              upgrading={false}
              heading="Upgrade to Pro"
              subhead="Turn this into a Pro tournament for the whole crew."
              emoji="✨"
              upgradeLabel="Make this a Pro tournament"
              skipLabel="Maybe later"
              onUpgrade={async () => {
                // Write it directly and CHECK the result. Going through the
                // optimistic state update left the screen looking upgraded
                // while a refused write meant the tournament was still free -
                // a blocked Supabase update matches zero rows and reports no
                // error at all.
                const supabase = getSupabaseClient();
                if (!supabase) return;
                setUpgradeError(null);
                const { data, error } = await supabase
                  .from("trips")
                  .update({ is_pro: true, pro_since: new Date().toISOString() })
                  .eq("id", trip.id)
                  .select("id,is_pro");
                if (error || !data || data.length === 0) {
                  setUpgradeError(
                    error?.message ??
                      "The upgrade was refused. Only the tournament owner can do this."
                  );
                  return;
                }
                updateTrip({ isPro: true });
                setOpen(false);
                // Re-read everything so every screen agrees the trip is Pro.
                if (typeof window !== "undefined") window.location.reload();
              }}
              onSkip={() => setOpen(false)}
            />
            {upgradeError ? (
              <p className="mt-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-[13px] font-bold text-red-700">
                {upgradeError}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
