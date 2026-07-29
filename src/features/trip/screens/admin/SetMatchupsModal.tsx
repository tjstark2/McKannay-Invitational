"use client";

import { useMemo, useState } from "react";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { saveDraw } from "@/lib/supabase/draws";
import type { DrawMatch } from "@/features/trip/draw/drawCompute";

function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Manual Pick (brief §4.1): show the round's board, tap a match then another to
 * swap their B sides, 🎲 to re-shuffle the B sides, then Lock to write the real
 * matchups and record the draw so the round counts as "set".
 */
export function SetMatchupsModal({
  roundId,
  onClose,
}: {
  roundId: string;
  onClose: () => void;
}) {
  const { trip, rounds, matches, players, teams, updateMatchPlayer } = useTripState();
  const { user } = useAuth();

  const round = rounds.find((r) => r.id === roundId);
  const roundMatches = useMemo(
    () => matches.filter((m) => m.roundId === roundId),
    [matches, roundId]
  );

  // Working board: the B side of each match (A sides stay fixed). We only ever
  // reorder these, so it's always a valid permutation of the round's B units.
  const [bSides, setBSides] = useState<string[][]>(
    roundMatches.map((m) => m.bPlayers)
  );
  const [sel, setSel] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "—";
  const teamA = teams.find((t) => t.id === "A")?.name ?? "Team A";
  const teamB = teams.find((t) => t.id === "B")?.name ?? "Team B";

  if (!round) return null;

  function tapMatch(i: number) {
    if (sel === null) {
      setSel(i);
    } else if (sel === i) {
      setSel(null);
    } else {
      setBSides((prev) => {
        const next = prev.slice();
        [next[i], next[sel]] = [next[sel], next[i]];
        return next;
      });
      setSel(null);
    }
  }

  function reshuffle() {
    setBSides((prev) => shuffle(prev));
    setSel(null);
  }

  async function lock() {
    if (busy) return;
    setBusy(true);
    setError(null);
    // Write each match's new B side (per slot: keeps local state + DB in sync).
    roundMatches.forEach((m, i) => {
      bSides[i].forEach((pid, slot) => updateMatchPlayer(m.id, "B", slot, pid));
    });
    // Record the draw so this round counts as "set" (method: manual).
    const snapshot: DrawMatch[] = roundMatches.map((m, i) => ({
      a: m.aPlayers,
      b: bSides[i],
    }));
    const supabase = getSupabaseClient();
    if (supabase) {
      const res = await saveDraw(supabase, {
        tripId: trip.id,
        roundId,
        method: "manual",
        runBy: user?.id ?? null,
        matches: snapshot,
        posted: true,
      });
      if (!res.ok) {
        setBusy(false);
        setError(res.error || "Couldn't save the matchups. Try again.");
        return;
      }
    }
    setBusy(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-1 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-accent-dark">
              Set the Matchups
            </p>
            <h2 className="font-anton text-2xl tracking-tight text-ink">{round.title}</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {teamA} <span className="font-black">vs</span> {teamB} · tap a match, then another to
              swap sides
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400">
            ✕
          </button>
        </div>

        {roundMatches.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            This round has no matches yet. Pick a head-to-head format for it in Admin first.
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {roundMatches.map((m, i) => {
              const selected = sel === i;
              return (
                <button
                  key={m.id}
                  onClick={() => tapMatch(i)}
                  className={`w-full rounded-2xl border-[1.5px] p-3 text-left transition ${
                    selected
                      ? "border-accent bg-accent/10"
                      : "border-sand-200 bg-white"
                  }`}
                >
                  <p className="mb-1 text-center text-[11px] font-black uppercase tracking-wide text-slate-400">
                    Match {i + 1}
                  </p>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <div className="text-right">
                      {m.aPlayers.map((pid) => (
                        <p key={pid} className="font-bold text-team-north">{nameOf(pid)}</p>
                      ))}
                    </div>
                    <span className="font-anton text-sm text-slate-400">VS</span>
                    <div>
                      {bSides[i].map((pid) => (
                        <p key={pid} className="font-bold text-team-south">{nameOf(pid)}</p>
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {error ? <p className="mt-3 text-sm font-bold text-red-600">{error}</p> : null}

        {roundMatches.length > 0 ? (
          <div className="mt-5 flex items-center gap-2">
            <button
              onClick={reshuffle}
              disabled={busy}
              className="rounded-2xl border-[1.5px] border-fairway-900 px-4 py-3 text-sm font-black text-fairway-900 disabled:opacity-50"
            >
              🎲 Shuffle
            </button>
            <button
              onClick={lock}
              disabled={busy}
              className="flex-1 rounded-2xl bg-fairway-900 px-4 py-3.5 font-black text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : "Lock the board ▸"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
