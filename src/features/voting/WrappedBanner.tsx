import { useState } from "react";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useViewer } from "@/features/trip/state/ViewerContext";
import { WrappedStory } from "@/features/voting/WrappedStory";

// When the tournament has ended (wrapped_at set), surface the Wrapped on every
// screen. Anyone can view it; only the OWNER can reopen the trip for edits.
export function WrappedBanner() {
  const { trip, reopenTournament } = useTripState();
  const { isOwner } = useViewer();
  const [open, setOpen] = useState(false);

  if (!trip.wrappedAt) return null;

  return (
    <>
      <div className="mx-5 mt-4 rounded-2xl border border-accent/40 bg-accent/10 p-4">
        <p className="text-sm font-black text-ink">🎉 Tournament complete</p>
        <p className="mt-0.5 text-xs text-slate-600">
          Scores are locked. Relive the trip with your Wrapped.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setOpen(true)}
            className="rounded-xl bg-fairway-900 px-4 py-2 text-sm font-black text-white"
          >
            View Wrapped
          </button>
          {isOwner ? (
            <button
              onClick={reopenTournament}
              className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-black text-fairway-900"
            >
              Reopen tournament
            </button>
          ) : null}
        </div>
      </div>
      {open ? <WrappedStory onClose={() => setOpen(false)} /> : null}
    </>
  );
}
