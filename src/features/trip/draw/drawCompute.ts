// Matchup Draw — pure outcome engine.
//
// CRITICAL INVARIANT (see brief §8): the OUTCOME is decided up front, once, on
// Start. Every animation (slot / hat / wheel / draft) is purely presentational
// and replays this stored result. So all randomness lives here and nowhere else.
//
// This module is pure + framework-free so it can be unit-tested and reused by
// the setup screen, the run animations, the results board, and the recap.

import type { Player, Round, TeamId } from "@/types";

export type DrawMethod =
  | "manual"
  | "autobalance"
  | "slot"
  | "hat"
  | "wheel"
  | "draft"
  | "fieldmanual"
  | "fieldrandom"
  | "fieldbalanced";

export type RoundShape = "singles" | "pairs" | "field";

/** One matchup: player ids on each side. 1 per side for singles, 2 for pairs. */
export type DrawMatch = { a: string[]; b: string[] };

/** A field-round tee-time group (mixed teams, no head-to-head). */
export type DrawGroup = { tee: string; players: string[] };

export type DraftLogEntry = {
  captainTeamId: TeamId;
  verb: "sends out" | "counters with";
  playerId: string;
  matchNo: number;
  locks: boolean;
};

// ---------------------------------------------------------------------------
// Round classification
// ---------------------------------------------------------------------------

/** Field formats have no head-to-head opponent; they produce tee-time groups. */
export function roundShape(round: Pick<Round, "format" | "groupSize">): RoundShape {
  if (round.format === "net_score" || round.format === "casual") return "field";
  const gs =
    round.groupSize ?? (round.format === "match_play" ? 1 : 2);
  return gs >= 2 ? "pairs" : "singles";
}

export function isFieldRound(round: Pick<Round, "format" | "groupSize">): boolean {
  return roundShape(round) === "field";
}

/** Methods valid for a given round shape (field rounds hide the deciders). */
export function methodsForShape(shape: RoundShape): DrawMethod[] {
  if (shape === "field") return ["fieldrandom", "fieldbalanced", "fieldmanual"];
  return ["manual", "autobalance", "slot", "hat", "wheel", "draft"];
}

/** Only Manual (and the free field methods) are free; the rest are Pro. */
export function isProMethod(method: DrawMethod): boolean {
  return method !== "manual" && method !== "fieldmanual" && method !== "fieldrandom";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const hcpOf = (hcp: Record<string, number>) => (id: string) => hcp[id] ?? 0;

/**
 * High + low pairing within one team (brief §3.1): sort by handicap ascending,
 * then pair the lowest with the highest working inward. An odd roster leaves a
 * final single-element "pair" (the leftover) — callers must resolve it (§12).
 */
export function buildPairs(ids: string[], hcp: Record<string, number>): string[][] {
  const sorted = [...ids].sort((x, y) => hcpOf(hcp)(x) - hcpOf(hcp)(y));
  const pairs: string[][] = [];
  let i = 0;
  let j = sorted.length - 1;
  while (i < j) {
    pairs.push([sorted[i], sorted[j]]);
    i++;
    j--;
  }
  if (i === j) pairs.push([sorted[i]]); // leftover (odd team)
  return pairs;
}

const teamIds = (players: Player[], team: TeamId) =>
  players.filter((p) => p.team === team).map((p) => p.id);

// ---------------------------------------------------------------------------
// Outcome computation (the one place randomness happens)
// ---------------------------------------------------------------------------

export type ComputeInput = {
  round: Pick<Round, "format" | "groupSize">;
  players: Player[];
  hcp: Record<string, number>; // course handicaps keyed by player id
  method: DrawMethod;
};

/*
 * computeMatches() used to live here: it paired each team's whole roster and
 * then dropped any leftover player, and it ignored per-tee-time formats. Both
 * faults are why draws dealt 8 of 10 players and repeated others. It has been
 * replaced by computeSlotMatches(), which deals inside each tee time. Removed
 * rather than left in place so nothing calls it again by accident.
 */


/** One tee time's worth of players, with the format they're playing. */
export type TeeSlot = {
  teeTimeId: string;
  label: string;
  /** Players actually assigned to this tee time. */
  playerIds: string[];
  /** 1 = singles, 2 = pairs. Taken from the round segment. */
  perSide: number;
  points: number;
};

/** A matchup that knows which tee time it belongs to. */
export type SlotMatch = DrawMatch & {
  teeTimeId: string;
  label: string;
  perSide: number;
  points: number;
};

/**
 * Deal matchups WITHIN each tee time.
 *
 * This replaces the old whole-round pairing, which had two real faults: it
 * built pairs from each team's full roster and then dropped any leftover
 * player (`buildPairs(...).filter(p => p.length === 2)`), so an odd team lost
 * someone entirely; and it ignored per-tee-time formats, so a round mixing 2v2
 * and 1v1 was dealt as if every group were the same shape. Dealing inside the
 * group it actually belongs to fixes both: everyone assigned to a tee time is
 * dealt exactly once, into the format that group is really playing.
 *
 * Anyone in a tee time whose team has no opponent left is still placed - they
 * appear on their side with an empty opposite slot, which the board shows as a
 * gap to fix rather than silently swallowing them.
 */
export function computeSlotMatches(
  slots: TeeSlot[],
  players: Player[],
  hcp: Record<string, number>,
  method: DrawMethod
): SlotMatch[] {
  const teamOf = new Map(players.map((p) => [p.id, p.team]));
  const out: SlotMatch[] = [];

  for (const slot of slots) {
    const inSlot = slot.playerIds.filter((id) => teamOf.has(id));
    let aSide = inSlot.filter((id) => teamOf.get(id) === "A");
    let bSide = inSlot.filter((id) => teamOf.get(id) === "B");

    if (method === "autobalance") {
      const byHcp = (x: string, y: string) => hcpOf(hcp)(x) - hcpOf(hcp)(y);
      aSide = [...aSide].sort(byHcp);
      bSide = [...bSide].sort(byHcp);
    } else if (method !== "manual" && method !== "fieldmanual") {
      aSide = shuffle(aSide);
      bSide = shuffle(bSide);
    }

    const per = Math.max(1, slot.perSide);
    const rounds = Math.max(
      Math.ceil(aSide.length / per),
      Math.ceil(bSide.length / per),
      1
    );
    for (let i = 0; i < rounds; i++) {
      const a = aSide.slice(i * per, i * per + per);
      const b = bSide.slice(i * per, i * per + per);
      if (a.length === 0 && b.length === 0) continue;
      out.push({
        a,
        b,
        teeTimeId: slot.teeTimeId,
        label: slot.label,
        perSide: per,
        points: slot.points,
      });
    }
  }
  return out;
}

/** Every player the given slots account for - used to spot anyone left out. */
export function playersInSlots(slots: TeeSlot[]): string[] {
  return slots.flatMap((s) => s.playerIds);
}

/**
 * Field round: chunk players into tee-time groups of 4 (a final group of 2–3 is
 * allowed — never padded). fieldrandom shuffles; fieldmanual keeps roster order
 * for the admin to rearrange; fieldbalanced snake-deals by course handicap so
 * every group mixes lows and highs and group totals stay close. Tee times start
 * at 8:00 AM in 10-minute steps by default.
 */
export function computeGroups(
  playerIds: string[],
  method: "fieldmanual" | "fieldrandom" | "fieldbalanced" = "fieldrandom",
  startMinutes = 8 * 60,
  stepMinutes = 10,
  groupSize = 4,
  hcp: Record<string, number> = {}
): DrawGroup[] {
  // Balanced groups come out of the snake deal already grouped; chunking the
  // flat list would misalign whenever the last group runs short.
  if (method === "fieldbalanced") {
    return snakeDeal(playerIds, hcp, groupSize).map((players, i) => ({
      tee: minutesToClock(startMinutes + i * stepMinutes),
      players,
    }));
  }
  const ordered = method === "fieldrandom" ? shuffle(playerIds) : [...playerIds];
  const groups: DrawGroup[] = [];
  for (let i = 0; i < ordered.length; i += groupSize) {
    const total = startMinutes + (groups.length * stepMinutes);
    groups.push({ tee: minutesToClock(total), players: ordered.slice(i, i + groupSize) });
  }
  return groups;
}

/**
 * Balanced deal: highest handicaps first, each into the group with the lowest
 * running total that still has a seat (longest-processing-time scheduling).
 * Groups end up mixing lows and highs with totals a stroke or two apart; only
 * the last group runs short when the roster doesn't divide evenly.
 */
function snakeDeal(
  playerIds: string[],
  hcp: Record<string, number>,
  groupSize: number
): string[][] {
  const sorted = [...playerIds].sort((x, y) => hcpOf(hcp)(y) - hcpOf(hcp)(x));
  const groupCount = Math.max(1, Math.ceil(sorted.length / groupSize));
  const remainder = sorted.length - (groupCount - 1) * groupSize;
  // Every group holds groupSize except the last, which takes the remainder.
  const caps = Array.from({ length: groupCount }, (_, i) =>
    i === groupCount - 1 ? remainder : groupSize
  );
  const groups: string[][] = Array.from({ length: groupCount }, () => []);
  const totals = new Array(groupCount).fill(0);
  for (const id of sorted) {
    let best = -1;
    for (let g = 0; g < groupCount; g++) {
      if (groups[g].length >= caps[g]) continue;
      if (best === -1 || totals[g] < totals[best]) best = g;
    }
    groups[best].push(id);
    totals[best] += hcpOf(hcp)(id);
  }
  // Read nicer low-to-high inside each group.
  return groups.map((g) => [...g].sort((x, y) => hcpOf(hcp)(x) - hcpOf(hcp)(y)));
}

function minutesToClock(total: number): string {
  const h24 = Math.floor(total / 60) % 24;
  const m = total % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h = h24 % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ---------------------------------------------------------------------------
// Captain's Draft timeline (brief §4.6) — story preserved for the recap
// ---------------------------------------------------------------------------

/**
 * Build the ordered pick timeline for a computed set of matches. The toss
 * winner throws first; the thrower alternates each match. Each match pushes the
 * thrower's side as "sends out", then the opponent's as "counters with"; the
 * final counter entry carries locks:true.
 */
export function buildDraftLog(
  matches: DrawMatch[],
  first: TeamId
): DraftLogEntry[] {
  const other: TeamId = first === "A" ? "B" : "A";
  const log: DraftLogEntry[] = [];
  matches.forEach((m, i) => {
    const throwerIsA = first === "A" ? i % 2 === 0 : i % 2 === 1;
    const throwerTeam: TeamId = throwerIsA ? "A" : "B";
    const counterTeam: TeamId = throwerIsA ? "B" : "A";
    const throwerSide = throwerIsA ? m.a : m.b;
    const counterSide = throwerIsA ? m.b : m.a;
    throwerSide.forEach((pid) =>
      log.push({ captainTeamId: throwerTeam, verb: "sends out", playerId: pid, matchNo: i + 1, locks: false })
    );
    counterSide.forEach((pid, k) =>
      log.push({
        captainTeamId: counterTeam,
        verb: "counters with",
        playerId: pid,
        matchNo: i + 1,
        locks: k === counterSide.length - 1,
      })
    );
  });
  void other;
  return log;
}

/** Coin toss winner for the draft (decided up front like everything else). */
export function flipCoin(): TeamId {
  return Math.random() < 0.5 ? "A" : "B";
}

// ---------------------------------------------------------------------------
// Fairness (Auto-Balance Δ chip, brief §4.2)
// ---------------------------------------------------------------------------

export function fairnessDelta(match: DrawMatch, hcp: Record<string, number>): number {
  const sum = (ids: string[]) => ids.reduce((t, id) => t + hcpOf(hcp)(id), 0);
  return Math.abs(sum(match.a) - sum(match.b));
}

export function fairnessTone(diff: number): "even" | "close" | "wide" {
  if (diff <= 3) return "even";
  if (diff <= 6) return "close";
  return "wide";
}

// ---------------------------------------------------------------------------
// Validation / edge cases (brief §12)
// ---------------------------------------------------------------------------

export type DrawIssue = { code: string; message: string };

/** Returns blocking issues that must be resolved before a draw can run. */
export function validateDraw(
  round: Pick<Round, "format" | "groupSize">,
  players: Player[]
): DrawIssue[] {
  const issues: DrawIssue[] = [];
  const shape = roundShape(round);
  const a = teamIds(players, "A").length;
  const b = teamIds(players, "B").length;

  if (shape === "field") {
    if (a + b < 2) issues.push({ code: "empty", message: "Add players before drawing tee-time groups." });
    return issues;
  }
  if (a === 0 || b === 0) {
    issues.push({ code: "empty_team", message: "Both teams need players before you can set matchups." });
    return issues;
  }
  if (shape === "pairs") {
    if (a % 2 !== 0 || b % 2 !== 0) {
      issues.push({
        code: "odd_team",
        message: "This is a 2-person format, so each team needs an even number of players. Add, remove, or sit someone out.",
      });
    }
    if (a !== b) {
      issues.push({ code: "uneven_pairs", message: `Teams are uneven (${a} vs ${b}). Even them up so every pair has an opponent.` });
    }
  }
  if (shape === "singles" && a !== b) {
    issues.push({
      code: "uneven_singles",
      message: `Teams are uneven (${a} vs ${b}). Assign a bye or sit someone out so everyone has a match.`,
    });
  }
  return issues;
}
