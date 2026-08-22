"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { saveDraw } from "@/lib/supabase/draws";
import { notify, othersIn } from "@/lib/notify";
import { buildMatchesFromSegments, loadRoster, saveFieldGroups } from "@/lib/supabase/roundsAdmin";
import { uploadPhoto } from "@/lib/supabase/clubhouse";
import { toJpeg } from "html-to-image";
import { courseHandicap } from "@/lib/scoring";
import { formatClock, parseClock } from "@/lib/teeTime";
import {
  computeGroups,
  buildDraftLog,
  flipCoin,
  fairnessDelta,
  fairnessTone,
  roundShape,
  computeSlotMatches,
  type DrawGroup,
  type DrawMatch,
  type SlotMatch,
  type TeeSlot,
  type DrawMethod,
  type DraftLogEntry,
} from "@/features/trip/draw/drawCompute";
import { DrawReveal } from "@/features/trip/screens/admin/DrawReveal";
import { FieldGroupBoard } from "@/features/trip/screens/admin/FieldGroupBoard";
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
  { id: "fieldrandom", name: "Random Groups", desc: "Shuffle into tee-time groups", icon: "🎲", pro: false, ready: true },
  { id: "fieldbalanced", name: "Balanced Groups", desc: "Mix lows and highs in every group", icon: "⚖️", pro: true, ready: true },
  { id: "fieldmanual", name: "Manual Groups", desc: "Arrange the groups yourself", icon: "✍️", pro: false, ready: true },
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
  const [board, setBoard] = useState<SlotMatch[]>([]);
  // Which player is picked up, waiting to be swapped with another.
  const [heldPlayer, setHeldPlayer] = useState<{ m: number; side: "a" | "b"; i: number } | null>(null);
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
  const [builtTick, setBuiltTick] = useState(0);
  const [freshMatches, setFreshMatches] = useState<DrawMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Field rounds: tee-time groups rather than a head-to-head board.
  const [groups, setGroups] = useState<DrawGroup[]>([]);
  const [startTime, setStartTime] = useState("8:00 AM");
  const [stepMinutes, setStepMinutes] = useState(10);
  const [groupsSaved, setGroupsSaved] = useState(false);
  // Per-tee-time format and points, so each group is dealt as what it actually
  // plays (2v2, 1v1) rather than the round being treated as one shape.
  const [segments, setSegments] = useState<
    { teeTimeId: string | null; format: string; points: number }[]
  >([]);

  useEffect(() => {
    if (!roundId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let off = false;
    (async () => {
      const { data } = await supabase
        .from("round_segments")
        .select("tee_time_id,format,points")
        .eq("round_id", roundId)
        .order("sort_order");
      if (off) return;
      setSegments(
        ((data ?? []) as Record<string, unknown>[]).map((r) => ({
          teeTimeId: (r.tee_time_id as string) ?? null,
          format: (r.format as string) ?? "best_ball",
          points: Number(r.points ?? 0),
        }))
      );
    })();
    return () => {
      off = true;
    };
  }, [roundId]);

  const round = rounds.find((r) => r.id === roundId) ?? null;
  useEffect(() => {
    if (builtTick === 0 || !roundId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    (async () => {
      const { data } = await supabase
        .from("matches")
        .select("id,sort_order,match_players(player_id,side)")
        .eq("round_id", roundId)
        .order("sort_order");
      const rows = ((data ?? []) as Record<string, unknown>[]).map((m) => {
        const mp = (m.match_players ?? []) as { player_id: string; side: string }[];
        return {
          a: mp.filter((x) => x.side === "A").map((x) => x.player_id),
          b: mp.filter((x) => x.side === "B").map((x) => x.player_id),
        } as DrawMatch;
      });
      setFreshMatches(rows);
    })();
  }, [builtTick, roundId]);

  /** Tee times with their format, in tee order. */
  const slots: TeeSlot[] = useMemo(() => {
    if (!round) return [];
    return (round.teeTimes ?? []).map((t) => {
      const seg = segments.find((sg) => sg.teeTimeId === t.id);
      const fmt = seg?.format ?? round.format;
      const perSide = fmt === "match_play" ? 1 : 2;
      return {
        teeTimeId: t.id,
        label: t.time || "No time set",
        playerIds: t.players ?? [],
        perSide,
        points: seg?.points ?? 0,
      };
    });
  }, [round, segments]);

  /** Anyone on the roster who is not in any tee time for this round. */
  const unseated = useMemo(() => {
    const seated = new Set(slots.flatMap((sl) => sl.playerIds));
    return players.filter((p) => !seated.has(p.id)).map((p) => p.id);
  }, [slots, players]);

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

  /**
   * Anyone still without a handicap. A blank handicap reads as 0 downstream,
   * which would quietly hand a scratch rating to someone who never set one, so
   * the handicap-driven methods refuse until these are filled in.
   */
  const missingHandicap = useMemo(
    () => players.filter((p) => p.hasHandicap === false).map((p) => p.name),
    [players]
  );
  const needsHandicaps = (m: DrawMethod) =>
    (m === "autobalance" || m === "fieldbalanced") && missingHandicap.length > 0;

  function handicapRefusal(): string {
    const names =
      missingHandicap.length <= 3
        ? missingHandicap.join(", ")
        : `${missingHandicap.slice(0, 3).join(", ")} and ${missingHandicap.length - 3} more`;
    return `Set a handicap for ${names} first - balancing without one would treat them as scratch. Players tab in Manage My Tournament.`;
  }

  function pickMethod(m: MethodMeta) {
    if (!m.ready) return;
    if (m.pro && !trip.isPro) return;
    if (needsHandicaps(m.id)) {
      setError(handicapRefusal());
      return;
    }
    setMethod(m.id);
    setSel(null);
    setError(null);
    setRevealing(false);
    setGroupsSaved(false);
    if (m.id === "manual") {
      setBoard(computeSlotMatches(slots, players, hcp, "manual"));
    } else if (m.id === "autobalance") {
      setBoard(computeSlotMatches(slots, players, hcp, "autobalance"));
    } else if (m.id === "fieldrandom" || m.id === "fieldbalanced" || m.id === "fieldmanual") {
      setGroups(buildGroups(m.id));
    } else {
      // Slot / Hat / Wheel / Draft: outcome decided now, animation reveals it.
      runAnimated(m.id);
    }
  }

  // ---- field rounds --------------------------------------------------------

  function buildGroups(
    m: "fieldrandom" | "fieldbalanced" | "fieldmanual",
    start = startTime,
    step = stepMinutes
  ): DrawGroup[] {
    return computeGroups(
      players.map((p) => p.id),
      m,
      (parseClock(start) ?? 8 * 60),
      step || 10,
      4,
      hcp
    );
  }

  /** Re-time the existing groups without changing who is in them. */
  function retime(start: string, step: number) {
    setGroups((prev) =>
      prev.map((g, i) => ({
        ...g,
        tee: formatClock((parseClock(start) ?? 8 * 60) + i * (step || 10)),
      }))
    );
  }

  function swapInGroups(a: { g: number; i: number }, b: { g: number; i: number }) {
    setGroups((prev) => {
      const next = prev.map((g) => ({ ...g, players: [...g.players] }));
      const tmp = next[a.g].players[a.i];
      next[a.g].players[a.i] = next[b.g].players[b.i];
      next[b.g].players[b.i] = tmp;
      return next;
    });
  }

  async function saveGroups() {
    if (busy || !round) return;
    setBusy(true);
    setError(null);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setBusy(false);
      setError("No connection to the database.");
      return;
    }
    const res = await saveFieldGroups(
      supabase,
      round.id,
      groups.map((g) => ({ time: g.tee, playerIds: g.players }))
    );
    if (!res.ok) {
      setBusy(false);
      setError(res.error || "Couldn't save the groups.");
      return;
    }
    await saveDraw(supabase, {
      tripId: trip.id,
      roundId: round.id,
      method: method ?? "fieldrandom",
      runBy: user?.id ?? null,
      matches: [],
      groups,
      posted: true,
    });
    await notify({
      userIds: othersIn(players, user?.id),
      title: trip.name,
      message: `Tee-time groups are set for ${round.title}. Check who you're out with.`,
      category: "round_day",
      url: `/t/${trip.joinCode}`,
    });
    setBusy(false);
    setGroupsSaved(true);
  }

  function runAnimated(id: DrawMethod) {
    const b = computeFromShapes(id);
    setBoard(b);
    if (id === "draft") {
      const cw = flipCoin();
      setCoinWinner(cw);
      setDraftLog(buildDraftLog(b, cw));
    }
    setRevealing(true);
  }

  /**
   * Redraw using the shape of the round's real matches, so a round that mixes
   * 2v2 and 1v1 keeps every seat. Players are shuffled within their own team
   * and dealt back into the same seats.
   */
  /**
   * Deal a fresh board for the chosen method.
   *
   * This used to pool players out of the EXISTING matches and redistribute
   * them, which meant any player the old engine had dropped stayed dropped
   * forever, and a pool that didn't match the shapes produced the same player
   * twice. It now deals from the tee times themselves, so the roster is the
   * source of truth and every assigned player is dealt exactly once.
   */
  function computeFromShapes(id: DrawMethod): SlotMatch[] {
    return computeSlotMatches(slots, players, hcp, id);
  }

  /**
   * Tap a player, then tap another to swap them. Swapping is only allowed
   * between players on the SAME team - moving someone across sides would put
   * them in a match against their own team, which is never what you want here.
   * Use Teams & Captains to change which side someone is on.
   */
  function tapPlayer(m: number, side: "a" | "b", i: number) {
    if (!heldPlayer) {
      setHeldPlayer({ m, side, i });
      return;
    }
    if (heldPlayer.m === m && heldPlayer.side === side && heldPlayer.i === i) {
      setHeldPlayer(null);
      return;
    }
    if (heldPlayer.side !== side) {
      setError("You can only swap players on the same team. Change sides on Teams & Captains.");
      setHeldPlayer(null);
      return;
    }
    setBoard((prev) => {
      const next = prev.map((x) => ({ ...x, a: [...x.a], b: [...x.b] }));
      const from = next[heldPlayer.m][heldPlayer.side];
      const to = next[m][side];
      const tmp = from[heldPlayer.i];
      from[heldPlayer.i] = to[i];
      to[i] = tmp;
      return next;
    });
    setError(null);
    setHeldPlayer(null);
  }

  function reshuffle() {
    // Re-deal from the tee times rather than shuffling B sides across the
    // whole board - a player must stay in the group they are teeing off with.
    setBoard(computeSlotMatches(slots, players, hcp, "slot"));
    setHeldPlayer(null);
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
      await notify({
        userIds: othersIn(players, user?.id),
        title: trip.name,
        message: `Matchups are in for ${round?.title ?? "the round"}. Have a look at who you drew.`,
        category: "round_day",
        url: `/t/${trip.joinCode}`,
      });
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
            {error ? (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
                {error}
              </p>
            ) : null}
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
                        : needsHandicaps(m.id)
                        ? `Needs a handicap for ${missingHandicap.length} ${missingHandicap.length === 1 ? "player" : "players"}`
                        : m.desc}
                    </span>
                  </span>
                  {!disabled ? <span className="font-black text-slate-300">›</span> : null}
                </button>
              );
            })}
          </div>
        ) : groupsSaved ? (
          <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4">
            <p className="font-black text-emerald-900">Groups are set</p>
            <p className="mt-1 text-[13px] leading-5 text-emerald-900">
              The tee sheet for {round.title} is saved and everyone has been told.
              You can adjust the times any time on the Rounds tab.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full rounded-2xl bg-fairway-900 px-4 py-3 font-black text-white"
            >
              Done
            </button>
          </div>
        ) : method === "fieldrandom" || method === "fieldbalanced" || method === "fieldmanual" ? (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setMethod(null);
                  setGroups([]);
                }}
                className="text-sm font-bold text-slate-500"
              >
                ‹ Methods
              </button>
              <span className="text-[13px] font-bold text-slate-400">
                {methodLabel?.name}
              </span>
            </div>

            {error ? (
              <p className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                {error}
              </p>
            ) : null}

            {groups.length === 0 ? (
              <p className="text-sm text-slate-400">
                Add players to the tournament before drawing tee-time groups.
              </p>
            ) : (
              <FieldGroupBoard
                groups={groups}
                players={players}
                hcp={hcp}
                showHandicaps={method === "fieldbalanced"}
                startTime={startTime}
                stepMinutes={stepMinutes}
                busy={busy}
                onStartTimeChange={(v) => {
                  setStartTime(v);
                  retime(v, stepMinutes);
                }}
                onStepChange={(v) => {
                  setStepMinutes(v);
                  retime(startTime, v);
                }}
                onSwap={swapInGroups}
                onReshuffle={
                  method === "fieldmanual"
                    ? undefined
                    : () => setGroups(buildGroups(method as "fieldrandom" | "fieldbalanced"))
                }
                onSave={saveGroups}
                saveLabel="Save groups and tee times"
              />
            )}
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
              onDraftResult={(b) =>
                setBoard((prev) =>
                  b.map((m, i) => ({
                    ...(prev[i] ?? {
                      teeTimeId: "",
                      label: "",
                      perSide: m.a.length || 1,
                      points: 0,
                    }),
                    a: m.a,
                    b: m.b,
                  }))
                )
              }
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
                    setBuiltTick((t) => t + 1);
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

            <div className="space-y-3">
              {slots.map((slot) => {
                const inSlot = board
                  .map((m, i) => ({ m, i }))
                  .filter((x) => x.m.teeTimeId === slot.teeTimeId);
                if (inSlot.length === 0) {
                  // A tee time with nobody in it still gets a card, otherwise
                  // the board silently shows fewer groups than the Rounds tab
                  // and it looks like players have gone missing.
                  return (
                    <div
                      key={slot.teeTimeId}
                      className="rounded-2xl border-[1.5px] border-dashed border-amber-300 bg-amber-50 p-3"
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="font-black text-amber-900">{slot.label}</span>
                        <span className="text-[11px] font-black uppercase tracking-wide text-amber-700">
                          Empty
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] leading-5 text-amber-900">
                        Nobody is in this tee time, so there is nothing to draw.
                        Add players to it or delete it on the Rounds tab.
                      </p>
                    </div>
                  );
                }
                return (
                  <div
                    key={slot.teeTimeId}
                    className="rounded-2xl border-[1.5px] border-sand-200 bg-white p-3"
                  >
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="font-black text-ink">{slot.label}</span>
                      <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                        {slot.perSide === 1 ? "1v1 singles" : "2v2"} ·{" "}
                        {slot.points} {slot.points === 1 ? "pt" : "pts"}
                      </span>
                    </div>

                    {inSlot.map(({ m, i }) => {
                      const diff = fairnessDelta(m, hcp);
                      const tone = fairnessTone(diff);
                      const gap = m.a.length !== m.b.length;
                      return (
                        <div key={i} className="mt-1.5 rounded-xl bg-[#f7f6f1] p-2.5">
                          {method === "autobalance" ? (
                            <div className="mb-1 text-center">
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
                            </div>
                          ) : null}
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                            <div className="space-y-1">
                              {m.a.map((pid, k) => {
                                const held =
                                  heldPlayer?.m === i && heldPlayer.side === "a" && heldPlayer.i === k;
                                return (
                                  <button
                                    key={`${pid}-${k}`}
                                    type="button"
                                    onClick={() => tapPlayer(i, "a", k)}
                                    className={`w-full rounded-lg px-2 py-1.5 text-right text-[13px] font-black transition ${
                                      held
                                        ? "bg-accent text-ink ring-2 ring-accent"
                                        : "bg-white text-team-north"
                                    }`}
                                  >
                                    {nameOf(pid)}
                                  </button>
                                );
                              })}
                              {m.a.length === 0 ? (
                                <p className="text-right text-[12px] font-bold text-slate-400">
                                  Nobody
                                </p>
                              ) : null}
                            </div>
                            <span className="font-anton text-sm text-slate-400">VS</span>
                            <div className="space-y-1">
                              {m.b.map((pid, k) => {
                                const held =
                                  heldPlayer?.m === i && heldPlayer.side === "b" && heldPlayer.i === k;
                                return (
                                  <button
                                    key={`${pid}-${k}`}
                                    type="button"
                                    onClick={() => tapPlayer(i, "b", k)}
                                    className={`w-full rounded-lg px-2 py-1.5 text-left text-[13px] font-black transition ${
                                      held
                                        ? "bg-accent text-ink ring-2 ring-accent"
                                        : "bg-white text-team-south"
                                    }`}
                                  >
                                    {nameOf(pid)}
                                  </button>
                                );
                              })}
                              {m.b.length === 0 ? (
                                <p className="text-[12px] font-bold text-slate-400">Nobody</p>
                              ) : null}
                            </div>
                          </div>
                          {gap ? (
                            <p className="mt-1.5 text-center text-[11px] font-bold text-amber-700">
                              Uneven sides - one team is a player short here
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {unseated.length > 0 ? (
                <div className="rounded-2xl border-[1.5px] border-amber-300 bg-amber-50 p-3">
                  <p className="text-[13px] font-black text-amber-900">
                    Not in a tee time
                  </p>
                  <p className="mt-0.5 text-[13px] leading-5 text-amber-900">
                    {unseated.map(nameOf).join(", ")} - add them to a tee time on
                    the Rounds tab and they&apos;ll be dealt in.
                  </p>
                </div>
              ) : null}
            </div>

            <p className="mt-2 text-center text-[12px] text-slate-400">
              {heldPlayer ? "Tap another player to swap" : "Tap two players to swap them"}
            </p>

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
                  onClick={() => setBoard(computeSlotMatches(slots, players, hcp, "autobalance"))}
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
