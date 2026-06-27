import { useState } from "react";
import type { Round } from "@/types/domain";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useViewer } from "@/features/trip/state/ViewerContext";
import { roundLifecycle } from "@/features/trip/roundLifecycle";

// Players in a round who do not yet have a full (gross) score recorded.
export function unscoredPlayers(
  round: Round,
  players: { id: string; name: string }[],
  scores: { roundId: string; playerId: string; grossScore?: number }[]
) {
  const teeIds = new Set(round.teeTimes.flatMap((t) => t.players));
  const participants = teeIds.size
    ? players.filter((p) => teeIds.has(p.id))
    : players;
  return participants.filter((p) => {
    const s = scores.find(
      (sc) => sc.roundId === round.id && sc.playerId === p.id
    );
    return !s || s.grossScore == null;
  });
}

export function RoundLifecycleButton({
  round,
  compact = false,
}: {
  round: Round;
  compact?: boolean;
}) {
  const { players, scores, updateRound } = useTripState();
  const { canManage } = useViewer();
  const [confirm, setConfirm] = useState<null | "start" | "finish">(null);

  if (!canManage) return null;
  const life = roundLifecycle(round);

  const missing = unscoredPlayers(round, players, scores);

  const doStart = () => {
    updateRound(round.id, { startedAt: new Date().toISOString() });
    setConfirm(null);
  };
  const doFinish = () => {
    updateRound(round.id, { finishedAt: new Date().toISOString() });
    setConfirm(null);
  };
  const doReopen = () => updateRound(round.id, { finishedAt: null });

  const base = compact
    ? "rounded-xl px-4 py-2 text-sm font-black"
    : "flex-1 rounded-xl px-4 py-2.5 text-sm font-black";

  return (
    <>
      <div className={compact ? "" : "flex gap-2"}>
        {life === "not_started" ? (
          <button
            onClick={() => setConfirm("start")}
            className={`${base} bg-fairway-900 text-white`}
          >
            Start round
          </button>
        ) : life === "live" ? (
          <button
            onClick={() => setConfirm("finish")}
            className={`${base} border-2 border-accent bg-accent/10 text-[#a07a06]`}
          >
            Finish round
          </button>
        ) : (
          <button
            onClick={doReopen}
            className={`${base} border border-line bg-white text-fairway-900`}
          >
            Reopen round
          </button>
        )}
      </div>

      {confirm ? (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setConfirm(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {confirm === "start" ? (
              <>
                <h3 className="text-lg font-black text-ink">
                  Open {round.title}?
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Players will be able to enter their scores for this round.
                </p>
                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => setConfirm(null)}
                    className="flex-1 rounded-xl border border-line bg-white py-3 font-black text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={doStart}
                    className="flex-1 rounded-xl bg-fairway-900 py-3 font-black text-white"
                  >
                    Open round
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-black text-ink">
                  Finish {round.title}?
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  This closes the round and ends its voting. You can reopen it
                  later if needed.
                </p>
                {missing.length > 0 ? (
                  <div className="mt-3 rounded-2xl border border-accent/40 bg-accent/10 p-3">
                    <p className="text-xs font-black uppercase tracking-wide text-[#a07a06]">
                      Haven&apos;t entered a full score yet
                    </p>
                    <p className="mt-1 text-sm font-bold text-ink">
                      {missing.map((p) => p.name).join(", ")}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 rounded-2xl bg-mint/15 p-3 text-sm font-bold text-green">
                    Everyone has entered a full score.
                  </p>
                )}
                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => setConfirm(null)}
                    className="flex-1 rounded-xl border border-line bg-white py-3 font-black text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={doFinish}
                    className="flex-1 rounded-xl border-2 border-accent bg-accent/10 py-3 font-black text-[#a07a06]"
                  >
                    Finish round
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
