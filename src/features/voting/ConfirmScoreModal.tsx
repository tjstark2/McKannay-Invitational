"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Round, ScoreEntry } from "@/types";

/**
 * When someone else entered your final score, you confirm it before your
 * awards vote opens - the basic-mode cousin of signing the card. Confirming
 * writes a round_confirmations row; the voting prompt takes over from there.
 */
export function ConfirmScoreModal({
  round,
  score,
  playerId,
  userId,
  onConfirmed,
  onClose,
}: {
  round: Round;
  score: ScoreEntry;
  playerId: string;
  userId: string;
  onConfirmed: () => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (busy) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.from("round_confirmations").upsert(
      { round_id: round.id, player_id: playerId, confirmed_by: userId },
      { onConflict: "round_id,player_id" }
    );
    setBusy(false);
    if (e) {
      setError(e.message);
      return;
    }
    onConfirmed();
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-5">
      <div className="w-full max-w-sm rounded-3xl bg-white p-5">
        <p className="text-xs font-extrabold uppercase tracking-wide text-accent-dark">
          Confirm your score
        </p>
        <h2 className="mt-1 font-anton text-2xl tracking-tight text-ink">{round.title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          An organizer entered your final score. Give it a once-over - confirming
          opens your awards vote.
        </p>

        <div className="mt-4 rounded-2xl bg-[#f3efe6] p-4 text-center">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Final gross</p>
          <p className="font-anton text-4xl text-ink">{score.grossScore ?? "-"}</p>
          {score.frontNineScore != null ? (
            <p className="mt-1 text-xs font-bold text-slate-500">Front nine {score.frontNineScore}</p>
          ) : null}
        </div>

        {error ? <p className="mt-3 text-sm font-bold text-red-600">{error}</p> : null}

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="w-full rounded-2xl bg-fairway-900 px-4 py-3.5 font-black text-white disabled:opacity-60"
          >
            {busy ? "Confirming…" : "That's my score - confirm it"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border-[1.5px] border-slate-300 px-4 py-3 font-black text-slate-600"
          >
            Something's off - I'll talk to an organizer
          </button>
        </div>
      </div>
    </div>
  );
}
