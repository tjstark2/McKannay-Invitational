"use client";

import { useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { setPlayerTeam } from "@/lib/supabase/memberships";
import { notify } from "@/lib/notify";
import { sendMessage } from "@/lib/supabase/clubhouse";
import {
  applyPick,
  draftBalance,
  draftResult,
  nextTeam,
  startTeamDraft,
  tossForFirstPick,
  undoPick,
  type TeamDraftState,
} from "@/features/trip/draw/teamDraft";
import type { TeamId } from "@/types";

type DraftPlayer = {
  id: string;
  name: string;
  handicap: number;
  isCaptain: boolean;
  team: TeamId;
  accountId?: string | null;
};

const TEAM_COLOR: Record<TeamId, string> = { A: "#e5484d", B: "#3b82f6" };

/**
 * Captains alternate picking the whole roster onto two sides. The coin toss is
 * thrown once at the start and the order snakes from there, so winning the toss
 * gets you first pick without handing you every other one.
 */
export function TeamDraftScreen({
  tripId,
  tripName,
  joinCode,
  userId,
  players,
  teamName,
  teamIdOf,
  onClose,
  onSaved,
}: {
  tripId: string;
  tripName: string;
  joinCode?: string;
  userId?: string | null;
  players: DraftPlayer[];
  teamName: (code: TeamId) => string;
  teamIdOf: (code: TeamId) => string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const captainA = players.find((p) => p.isCaptain && p.team === "A")?.id ?? null;
  const captainB = players.find((p) => p.isCaptain && p.team === "B")?.id ?? null;
  const bothCaptains = Boolean(captainA && captainB);

  const [state, setState] = useState<TeamDraftState | null>(null);
  const [tossing, setTossing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const hcp = useMemo(() => {
    const map: Record<string, number> = {};
    players.forEach((p) => {
      map[p.id] = p.handicap;
    });
    return map;
  }, [players]);

  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "-";
  const total = state ? state.remaining.length + state.picks.length : 0;
  const onTheClock = state ? nextTeam(state.first, state.picks.length, total) : null;
  const result = state ? draftResult(state, captainA, captainB) : { a: [], b: [] };
  const balance = draftBalance(result, hcp);
  const done = Boolean(state && state.remaining.length === 0);

  function throwCoin() {
    setTossing(true);
    setError(null);
    // A beat of suspense, then the result that was already decided.
    const first = tossForFirstPick();
    setTimeout(() => {
      setState(startTeamDraft(players.map((p) => p.id), captainA, captainB, first));
      setTossing(false);
    }, 900);
  }

  async function save() {
    if (!state || busy) return;
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("No connection to the database.");
      return;
    }
    setBusy(true);
    setError(null);
    const aId = teamIdOf("A");
    const bId = teamIdOf("B");
    if (!aId || !bId) {
      setBusy(false);
      setError("Couldn't find both teams for this tournament.");
      return;
    }
    for (const pid of result.a) {
      // Captains keep their star - they are being written to their own side.
      const ok = await setPlayerTeam(supabase, pid, aId, pid === captainA);
      if (!ok) {
        setBusy(false);
        setError(`Couldn't move ${nameOf(pid)} to ${teamName("A")}.`);
        return;
      }
    }
    for (const pid of result.b) {
      const ok = await setPlayerTeam(supabase, pid, bId, pid === captainB);
      if (!ok) {
        setBusy(false);
        setError(`Couldn't move ${nameOf(pid)} to ${teamName("B")}.`);
        return;
      }
    }
    // The pick order is half the fun, so it goes on the Clubhouse board too.
    try {
      const order = state.picks
        .map((p, i) => `${i + 1}. ${teamName(p.team)} take ${nameOf(p.playerId)}`)
        .join("\n");
      await sendMessage(supabase, {
        tripId,
        userId: userId ?? "",
        body: `🪙 The draft is done.\n\n${teamName("A")}: ${result.a
          .map(nameOf)
          .join(", ")}\n${teamName("B")}: ${result.b.map(nameOf).join(", ")}\n\nHow it went:\n${order}`,
      });
    } catch {
      /* the teams are saved either way */
    }

    await notify({
      userIds: players
        .map((p) => p.accountId)
        .filter((id): id is string => Boolean(id)),
      title: tripName,
      message: "The teams are drafted. Open the app to see whose side you're on.",
      category: "round_day",
      url: joinCode ? `/t/${joinCode}` : "/home",
    });
    setBusy(false);
    setSaved(true);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-[#f7f6f1]">
      <div className="mx-auto max-w-lg p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-accent-dark">
              Captain&apos;s Draft
            </p>
            <h1 className="font-anton text-3xl tracking-tight text-ink">Pick the teams</h1>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 font-black text-slate-400"
          >
            Done
          </button>
        </div>

        {error ? (
          <p className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
            {error}
          </p>
        ) : null}

        {!bothCaptains ? (
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
            <p className="font-black text-amber-900">Both teams need a captain first</p>
            <p className="mt-1 text-[13px] leading-5 text-amber-900">
              Set one for each side on Teams &amp; Captains, then come back and draft.
            </p>
          </div>
        ) : saved ? (
          <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4">
            <p className="font-black text-emerald-900">Teams are saved</p>
            <p className="mt-1 text-[13px] leading-5 text-emerald-900">
              Everyone has been told whose side they&apos;re on. You can still move
              people by hand on Teams &amp; Captains.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full rounded-2xl bg-fairway-900 px-4 py-3 font-black text-white"
            >
              Done
            </button>
          </div>
        ) : !state ? (
          <div className="rounded-2xl border border-sand-200 bg-white p-5 text-center">
            <p className="text-5xl">🪙</p>
            <p className="mt-3 font-black text-ink">Toss for first pick</p>
            <p className="mx-auto mt-1 max-w-xs text-[13px] leading-5 text-slate-500">
              {nameOf(captainA ?? "")} and {nameOf(captainB ?? "")} pick in turn.
              The winner picks first, then it snakes, so nobody gets every early
              pick.
            </p>
            <button
              type="button"
              onClick={throwCoin}
              disabled={tossing}
              className="mt-4 w-full rounded-2xl bg-fairway-900 px-4 py-3.5 font-black text-white disabled:opacity-60"
            >
              {tossing ? "Tossing…" : "Toss the coin"}
            </button>
          </div>
        ) : (
          <div>
            {/* on the clock */}
            <div
              className="rounded-2xl p-4 text-white"
              style={{
                background: done
                  ? "#0b3b2e"
                  : TEAM_COLOR[onTheClock ?? "A"],
              }}
            >
              {done ? (
                <>
                  <p className="text-xs font-black uppercase tracking-wide opacity-80">
                    Draft complete
                  </p>
                  <p className="font-anton text-2xl">Every pick is in</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-black uppercase tracking-wide opacity-80">
                    On the clock · pick {state.picks.length + 1} of {total}
                  </p>
                  <p className="font-anton text-2xl">
                    {teamName(onTheClock ?? "A")}
                  </p>
                  <p className="text-[13px] opacity-90">
                    {nameOf(onTheClock === "A" ? captainA ?? "" : captainB ?? "")} picks
                  </p>
                </>
              )}
            </div>

            {/* board */}
            {state.remaining.length > 0 ? (
              <div className="mt-3">
                <p className="mb-1 text-xs font-black uppercase tracking-wide text-slate-500">
                  On the board
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {state.remaining.map((pid) => (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => setState((s) => (s ? applyPick(s, pid) : s))}
                      className="rounded-xl border-[1.5px] border-sand-200 bg-white px-3 py-2 text-[13px] font-black text-ink"
                    >
                      {nameOf(pid)}{" "}
                      <span className="font-normal text-slate-400">{hcp[pid] ?? 0}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* sides */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["A", "B"] as const).map((code) => (
                <div key={code} className="rounded-2xl border border-sand-200 bg-white p-3">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: TEAM_COLOR[code] }}
                    />
                    <p className="truncate text-[13px] font-black text-ink">
                      {teamName(code)}
                    </p>
                  </div>
                  <p className="mt-0.5 text-[11px] font-black text-slate-400">
                    {(code === "A" ? balance.a : balance.b)} combined
                  </p>
                  <div className="mt-1.5 space-y-1">
                    {(code === "A" ? result.a : result.b).map((pid) => (
                      <p key={pid} className="text-[13px] font-bold text-ink">
                        {nameOf(pid)}
                        {pid === (code === "A" ? captainA : captainB) ? (
                          <span className="ml-1 text-[10px] font-black uppercase text-accent-dark">
                            C
                          </span>
                        ) : null}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {done ? (
              <p className="mt-2 text-center text-[13px] font-bold text-slate-500">
                {balance.diff === 0
                  ? "Dead even on combined handicap."
                  : `${balance.diff} strokes between the sides.`}
              </p>
            ) : null}

            <div className="mt-3 flex gap-2 pb-8">
              <button
                type="button"
                onClick={() => setState((s) => (s ? undoPick(s) : s))}
                disabled={state.picks.length === 0 || busy}
                className="flex-1 rounded-2xl border-[1.5px] border-slate-300 px-4 py-3 font-black text-slate-600 disabled:opacity-40"
              >
                Undo pick
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!done || busy}
                className="flex-1 rounded-2xl bg-fairway-900 px-4 py-3 font-black text-white disabled:opacity-40"
              >
                {busy ? "Saving…" : "Save teams"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
