"use client";

import { useMemo, useRef, useState } from "react";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { saveDraw } from "@/lib/supabase/draws";
import { buildMatchesFromSegments, loadRoster } from "@/lib/supabase/roundsAdmin";
import { uploadPhoto } from "@/lib/supabase/clubhouse";
import { toJpeg } from "html-to-image";
import { courseHandicap } from "@/lib/scoring";
import {
  computeMatches,
  buildDraftLog,
  flipCoin,
  fairnessDelta,
  fairnessTone,
  roundShape,
  type DrawMatch,
  type DrawMethod,
  type DraftLogEntry,
} from "@/features/trip/draw/drawCompute";
import { DrawReveal } from "@/features/trip/screens/admin/DrawReveal";
import type { TeamId } from "@/types";

function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type MethodMeta = {
  id: DrawMethod;
  name: string;
  desc: string;
  icon: string;
  pro: boolean;
  ready: boolean;
};

const H2H_METHODS: MethodMeta[] = [
  { id: "manual", name: "Manual Pick", desc: "Set the board yourself", icon: "✍️", pro: false, ready: true },
  { id: "autobalance", name: "Handicap Auto-Balance", desc: "Fairest matchups by handicap", icon: "⚖️", pro: true, ready: true },
  { id: "slot", name: "Slot Machine", desc: "Spin the reels", icon: "🎰", pro: true, ready: true },
  { id: "hat", name: "Blind Hat Draw", desc: "Pull names from a hat", icon: "🎩", pro: true, ready: true },
  { id: "wheel", name: "Spin the Wheel", desc: "Two wheels decide", icon: "🎡", pro: true, ready: true },
  { id: "draft", name: "Captain's Draft", desc: "Coin toss, then captains pick", icon: "🪙", pro: true, ready: true },
];

const FIELD_METHODS: MethodMeta[] = [
  { id: "fieldrandom", name: "Random Groups", desc: "Shuffle into tee-time groups", icon: "🎲", pro: false, ready: false },
  { id: "fieldmanual", name: "Manual Groups", desc: "Arrange the groups yourself", icon: "✍️", pro: false, ready: false },
];

export function SetMatchupsScreen({
  initialRoundId,
  onClose,
}: {
  initialRoundId?: string;
  onClose: () => void;
}) {
  const { trip, rounds, matches, players, teams, courses, updateMatchPlayer } = useTripState();
  const { user } = useAuth();

  const [roundId, setRoundId] = useState<string | null>(initialRoundId ?? null);
  const [method, setMethod] = useState<DrawMethod | null>(null);
  const [board, setBoard] = useState<DrawMatch[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [coinWinner, setCoinWinner] = useState<TeamId>("A");
  const [draftLog, setDraftLog] = useState<DraftLogEntry[]>([]);
  const [locked, setLocked] = useState(false);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const round = rounds.find((r) => r.id === roundId) ?? null;
  const roundMatches = useMemo(
    () => (roundId ? matches.filter((m) => m.roundId === roundId) : []),
    [matches, roundId]
  );
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "—";
  const teamAName = teams.find((t) => t.id === "A")?.name ?? "Team A";
  const teamBName = teams.find((t) => t.id === "B")?.name ?? "Team B";

  // Course handicaps for the round (drives Auto-Balance + the Δ chips).
  const hcp = useMemo(() => {
    const map: Record<string, number> = {};
    if (round) {
      players.forEach((p) => {
        map[p.id] = courseHandicap(p, round, courses);
      });
    }
    return map;
  }, [players, round, courses]);

  const shape = round ? roundShape(round) : "pairs";
  const methodList = shape === "field" ? FIELD_METHODS : H2H_METHODS;

  function pickMethod(m: MethodMeta) {
    if (!m.ready) return;
    if (m.pro && !trip.isPro) return;
    setMethod(m.id);
    setSel(null);
    setError(null);
    setRevealing(false);
    if (m.id === "manual") {
      setBoard(roundMatches.map((mm) => ({ a: mm.aPlayers, b: mm.bPlayers })));
    } else if (m.id === "autobalance") {
      setBoard(computeMatches({ round: round!, players, hcp, method: "autobalance" }));
    } else {
      // Slot / Hat / Wheel / Draft: outcome decided now, animation reveals it.
      runAnimated(m.id);
    }
  }

  function runAnimated(id: DrawMethod) {
    const b = computeMatches({ round: round!, players, hcp, method: id });
    setBoard(b);
    if (id === "draft") {
      const cw = flipCoin();
      setCoinWinner(cw);
      setDraftLog(buildDraftLog(b, cw));
    }
    setRevealing(true);
  }

  // Manual: tap two matches to swap their B sides.
  function tapMatch(i: number) {
    if (method !== "manual") return;
    if (sel === null) setSel(i);
    else if (sel === i) setSel(null);
    else {
      setBoard((prev) => {
        const next = prev.map((m) => ({ a: m.a, b: m.b }));
        [next[i].b, next[sel].b] = [next[sel].b, next[i].b];
        return next;
      });
      setSel(null);
    }
  }

  function reshuffle() {
    setBoard((prev) => {
      const bs = shuffle(prev.map((m) => m.b));
      return prev.map((m, i) => ({ a: m.a, b: bs[i] }));
    });
    setSel(null);
  }

  const countMismatch = board.length !== roundMatches.length;

  async function lock() {
    if (busy || !round || countMismatch) return;
    setBusy(true);
    setError(null);
    // Write both sides of each match (Manual leaves A unchanged; Auto-Balance re-pairs both).
    roundMatches.forEach((m, i) => {
      board[i].a.forEach((pid, slot) => updateMatchPlayer(m.id, "A", slot, pid));
      board[i].b.forEach((pid, slot) => updateMatchPlayer(m.id, "B", slot, pid));
    });
    const supabase = getSupabaseClient();
    if (supabase) {
      const res = await saveDraw(supabase, {
        tripId: trip.id,
        roundId: round.id,
        method: method ?? "manual",
        runBy: user?.id ?? null,
        matches: board,
        posted: true,
      });
      if (!res.ok) {
        setBusy(false);
        setError(res.error || "Couldn't save the matchups. Try again.");
        return;
      }
    }
    setBusy(false);
    setLocked(true);
  }

  const methodLabel = (H2H_METHODS.concat(FIELD_METHODS)).find((mm) => mm.id === method);

  async function shareToClubhouse() {
    if (posting || posted || !cardRef.current) return;
    setPosting(true);
    setPostError(null);
    try {
      const node = cardRef.current;
      const dataUrl = await toJpeg(node, { quality: 0.92, pixelRatio: 2, backgroundColor: "#0b3b2e" });
      const blob = await (await fetch(dataUrl)).blob();
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("No connection.");
      await uploadPhoto(supabase, {
        tripId: trip.id,
        userId: user?.id ?? "",
        blob,
        width: node.offsetWidth,
        height: node.offsetHeight,
        caption: `Matchups are in - ${round?.title}${methodLabel ? ` (set by ${methodLabel.name})` : ""}`,
      });
      if (round) {
        const supabase2 = getSupabaseClient();
        if (supabase2) {
          await saveDraw(supabase2, {
            tripId: trip.id,
            roundId: round.id,
            method: method ?? "manual",
            runBy: user?.id ?? null,
            matches: board,
            posted: true,
          });
        }
      }
      setPosted(true);
    } catch (e) {
      setPostError(e instanceof Error ? e.message : "Couldn't post to Clubhouse.");
    } finally {
      setPosting(false);
    }
  }

  const proLocked = (m: MethodMeta) => m.pro && !trip.isPro;

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-[#f7f6f1]">
      {locked ? (
        <div className="mx-auto max-w-lg p-5">
          <div className="mb-4 text-center">
            <p className="text-xs font-extrabold uppercase tracking-wide text-accent-dark">Locked in</p>
            <h1 className="font-anton text-3xl tracking-tight text-ink">Matchups are set!</h1>
            <p className="mt-1 text-sm text-slate-500">Share the board to the Clubhouse so everyone sees it.</p>
          </div>

          {/* Shareable card (rendered to an image) */}
          <div className="flex justify-center">
            <div
              ref={cardRef}
              style={{
                width: 360,
                background: "linear-gradient(160deg,#0b3b2e,#0b2418)",
                color: "#fff",
                padding: 20,
                borderRadius: 20,
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: "#f3b50a", textTransform: "uppercase" }}>
                  {methodLabel ? `Set by ${methodLabel.name} ${methodLabel.icon}` : "Matchups"}
                </div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{round?.title}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  {teamAName} vs {teamBName}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {board.map((m, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,.08)", borderRadius: 12, padding: "8px 10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, textAlign: "right", color: "#f2a3a3", fontWeight: 800, fontSize: 13 }}>
                        {m.a.map((id) => nameOf(id)).join(" & ")}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.7 }}>VS</div>
                      <div style={{ flex: 1, color: "#a3c4f2", fontWeight: 800, fontSize: 13 }}>
                        {m.b.map((id) => nameOf(id)).join(" & ")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: "center", marginTop: 12, fontSize: 10, fontWeight: 800, letterSpacing: 1, color: "#f3b50a" }}>
                TOURNEYBIRDIE
              </div>
            </div>
          </div>

          {postError ? <p className="mt-3 text-center text-sm font-bold text-red-600">{postError}</p> : null}

          <div className="mt-5 space-y-2 pb-8">
            <button
              type="button"
              onClick={shareToClubhouse}
              disabled={posting || posted}
              className="w-full rounded-2xl bg-fairway-900 px-4 py-3.5 font-black text-white disabled:opacity-60"
            >
              {posted ? "Posted to Clubhouse ✓" : posting ? "Posting…" : "📣 Share to Clubhouse"}
            </button>
            <button type="button" onClick={onClose} className="w-full rounded-2xl border-[1.5px] border-slate-300 px-4 py-3 font-black text-slate-600">
              Done
            </button>
          </div>
        </div>
      ) : (
      <div className="mx-auto max-w-lg p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-accent-dark">
              Set the Matchups
            </p>
            <h1 className="font-anton text-3xl tracking-tight text-ink">
              {round ? round.title : "Pick a round"}
            </h1>
            {round ? (
              <p className="mt-0.5 text-sm text-slate-500">
                {teamAName} <span className="font-black">vs</span> {teamBName}
              </p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 font-black text-slate-400">
            Done
          </button>
        </div>

        {/* Round selector */}
        <div className="mb-4">
          <p className="mb-1 text-xs font-black uppercase tracking-wide text-slate-500">Round</p>
          <div className="flex flex-wrap gap-2">
            {rounds.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setRoundId(r.id);
                  setMethod(null);
                  setBoard([]);
                  setSel(null);
                }}
                className={`rounded-full border-[1.5px] px-3 py-1.5 text-sm font-black ${
                  roundId === r.id
                    ? "border-fairway-900 bg-fairway-900 text-white"
                    : "border-sand-200 bg-white text-slate-600"
                }`}
              >
                {r.title}
              </button>
            ))}
          </div>
        </div>

        {!round ? (
          <p className="text-sm text-slate-400">Choose a round above to set its matchups.</p>
        ) : !method ? (
          /* Method picker */
          <div className="space-y-2">
            <p className="mb-1 text-xs font-black uppercase tracking-wide text-slate-500">How should we set them?</p>
            {methodList.map((m) => {
              const locked = proLocked(m);
              const disabled = !m.ready || locked;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => pickMethod(m)}
                  disabled={disabled}
                  className={`flex w-full items-center gap-3 rounded-2xl border-[1.5px] p-3 text-left ${
                    disabled ? "border-sand-200 bg-white opacity-60" : "border-sand-200 bg-white"
                  }`}
                >
                  <span className="text-2xl">{m.icon}</span>
                  <span className="flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-black text-ink">{m.name}</span>
                      {m.pro ? (
                        <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-black uppercase text-accent-dark">Pro</span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black uppercase text-emerald-700">Free</span>
                      )}
                    </span>
                    <span className="block text-[13px] text-slate-500">
                      {locked
                        ? "Upgrade to Pro to use this"
                        : !m.ready
                        ? "Not built yet - for now set the tee time groups on the Rounds tab"
                        : m.desc}
                    </span>
                  </span>
                  {!disabled ? <span className="font-black text-slate-300">›</span> : null}
                </button>
              );
            })}
          </div>
        ) : revealing && method ? (
          <div>
            <button
              type="button"
              onClick={() => {
                setRevealing(false);
                setMethod(null);
              }}
              className="mb-3 text-sm font-bold text-slate-500"
            >
              ‹ Methods
            </button>
            <DrawReveal
              method={method}
              board={board}
              players={players}
              teams={teams}
              coinWinner={coinWinner}
              draftLog={draftLog}
              onDone={() => setRevealing(false)}
            />
          </div>
        ) : (
          /* Run step: the board */
          <div>
            <div className="mb-3 flex items-center justify-between">
              <button type="button" onClick={() => setMethod(null)} className="text-sm font-bold text-slate-500">
                ‹ Methods
              </button>
              {method === "manual" ? (
                <span className="text-[13px] font-bold text-slate-400">
                  {sel === null ? "Tap a match, then another to swap" : "Tap another match to swap"}
                </span>
              ) : (
                <span className="text-[13px] font-bold text-slate-400">Paired for fairness</span>
              )}
            </div>

            {roundMatches.length === 0 ? (
              <div className="mb-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
                <p className="font-black text-amber-900">This round has no matches yet</p>
                <p className="mt-1 text-[13px] leading-5 text-amber-900">
                  Build them from the tee times and formats you set up, then draw the matchups.
                </p>
                <button
                  type="button"
                  disabled={building}
                  onClick={async () => {
                    const supabase = getSupabaseClient();
                    if (!supabase || !round) return;
                    setBuilding(true);
                    const roster = await loadRoster(supabase, trip.id);
                    const res = await buildMatchesFromSegments(supabase, round.id, roster);
                    setBuilding(false);
                    if (!res.ok) {
                      setError(res.error || "Couldn't build the matches.");
                      return;
                    }
                    window.location.reload();
                  }}
                  className="mt-3 w-full rounded-2xl bg-fairway-900 px-4 py-3 font-black text-white disabled:opacity-50"
                >
                  {building ? "Building…" : "Build matches from tee times"}
                </button>
              </div>
            ) : null}

            {countMismatch && roundMatches.length > 0 ? (
              <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                The roster changed since this round&apos;s matches were built. Rebuild the round&apos;s
                format in Admin, then set the matchups.
              </div>
            ) : null}

            <div className="space-y-2">
              {board.map((m, i) => {
                const diff = fairnessDelta(m, hcp);
                const tone = fairnessTone(diff);
                const selected = sel === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => tapMatch(i)}
                    className={`w-full rounded-2xl border-2 p-3 text-left transition ${
                      selected ? "border-accent bg-accent/20 ring-2 ring-accent" : "border-sand-200 bg-white"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-center gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                        Match {i + 1}
                      </span>
                      {method === "autobalance" ? (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                            tone === "even"
                              ? "bg-emerald-100 text-emerald-700"
                              : tone === "close"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          Δ {diff}
                        </span>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <div className="text-right">
                        {m.a.map((pid) => (
                          <p key={pid} className="font-bold text-team-north">{nameOf(pid)}</p>
                        ))}
                      </div>
                      <span className="font-anton text-sm text-slate-400">VS</span>
                      <div>
                        {m.b.map((pid) => (
                          <p key={pid} className="font-bold text-team-south">{nameOf(pid)}</p>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {error ? <p className="mt-3 text-sm font-bold text-red-600">{error}</p> : null}

            <div className="mt-5 flex items-center gap-2 pb-8">
              {method === "manual" ? (
                <button
                  type="button"
                  onClick={reshuffle}
                  disabled={busy}
                  className="rounded-2xl border-[1.5px] border-fairway-900 px-4 py-3 text-sm font-black text-fairway-900 disabled:opacity-50"
                >
                  🎲 Shuffle
                </button>
              ) : method === "autobalance" ? (
                <button
                  type="button"
                  onClick={() => setBoard(computeMatches({ round: round!, players, hcp, method: "autobalance" }))}
                  disabled={busy}
                  className="rounded-2xl border-[1.5px] border-fairway-900 px-4 py-3 text-sm font-black text-fairway-900 disabled:opacity-50"
                >
                  ↻ Recompute
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => method && runAnimated(method)}
                  disabled={busy}
                  className="rounded-2xl border-[1.5px] border-fairway-900 px-4 py-3 text-sm font-black text-fairway-900 disabled:opacity-50"
                >
                  ↻ Re-draw
                </button>
              )}
              <button
                type="button"
                onClick={lock}
                disabled={busy || countMismatch || board.length === 0}
                className="flex-1 rounded-2xl bg-fairway-900 px-4 py-3.5 font-black text-white disabled:opacity-50"
              >
                {busy ? "Saving…" : "Lock the board ▸"}
              </button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
