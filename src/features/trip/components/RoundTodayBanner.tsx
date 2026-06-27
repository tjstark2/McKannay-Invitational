import { useState } from "react";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useViewer } from "@/features/trip/state/ViewerContext";
import { roundLifecycle } from "@/features/trip/roundLifecycle";
import { RoundLifecycleButton } from "@/features/trip/components/RoundLifecycleButton";

function todayYMD() {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// Shown on every screen: if a round is scheduled for today and hasn't been
// opened yet, nudge the organizer to start it so players can score.
export function RoundTodayBanner() {
  const { rounds } = useTripState();
  const { canManage } = useViewer();
  const [dismissed, setDismissed] = useState<string[]>([]);

  if (!canManage) return null;

  const ymd = todayYMD();
  const due = rounds.find(
    (r) =>
      r.roundDate &&
      String(r.roundDate).slice(0, 10) === ymd &&
      roundLifecycle(r) === "not_started" &&
      !dismissed.includes(r.id)
  );
  if (!due) return null;

  return (
    <div className="mx-5 mt-4 rounded-2xl border border-accent/40 bg-accent/10 p-4">
      <div className="flex items-start gap-3">
        <span className="text-xl">📣</span>
        <div className="flex-1">
          <p className="text-sm font-black text-ink">
            {due.title} is scheduled today
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            Open it so players can start entering scores.
          </p>
          <div className="mt-3">
            <RoundLifecycleButton round={due} compact />
          </div>
        </div>
        <button
          onClick={() => setDismissed((d) => [...d, due.id])}
          aria-label="Dismiss"
          className="rounded-full px-2 text-lg font-black text-slate-400"
        >
          ×
        </button>
      </div>
    </div>
  );
}
