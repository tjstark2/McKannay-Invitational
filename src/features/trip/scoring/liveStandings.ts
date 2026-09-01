// Live standings during a round.
//
// The two scoring modes keep their scores in different places, and that is why
// three of the five screens looked dead mid-round:
//
//   basic_918     one row per player per round in `score_entries`, written when
//                 someone types a front nine or a final gross. There is no
//                 "during" - a score either exists or it does not.
//   hole_by_hole  one row per player PER HOLE in `hole_scores`, written as the
//                 round is played. `score_entries` stays empty until a card is
//                 signed.
//
// Pecking Order, The Nest and Matches all read `score_entries`, so on a
// hole-by-hole round they showed nothing until signing - while the live table
// inside Tee It Up, which reads hole scores directly, updated all along.
//
// This builds one shape from either source so those screens can show the same
// thing: total strokes, how that sits against par, and the net after handicap.

import type { Course, Player, Round, ScoreEntry } from "@/types";
import { allocateForMatch, holesInPlay } from "@/features/trip/scoring/strokeIndex";

export type HoleScoreLite = {
  roundId: string;
  playerId: string;
  hole: number;
  strokes: number;
};

export type LiveRow = {
  playerId: string;
  /** Holes completed. Equals the round length once the card is done. */
  thru: number;
  /** Raw strokes taken across the holes played. */
  gross: number;
  /** Par for the holes actually played, not the whole course. */
  parPlayed: number;
  /** gross - parPlayed. What a scratch player would call their score. */
  toPar: number;
  /** Handicap strokes received across the holes played. */
  strokesGiven: number;
  /** gross - strokesGiven. */
  net: number;
  /** net - parPlayed. This is what decides the match. */
  netToPar: number;
  /** True once every playable hole has a score. */
  complete: boolean;
};

/**
 * Build live rows for one hole-by-hole round.
 *
 * `holes` is the course card for the round: hole number, par and stroke index.
 * Strokes are allocated relative to the lowest handicap in each tee-time group,
 * exactly as the scoring card does, so the numbers agree wherever they appear.
 */
export type LiveRoundInput = {
  roundId: string;
  /** Tee-time groups: who is in each, and that group's allowance. */
  groups: { playerIds: string[]; allowancePct: number }[];
  /** The course card for this round. */
  holes: { hole: number; par: number; si: number }[];
  holesCount: 9 | 18;
  nine: "front" | "back" | null;
  tee: { rating: number | null; slope: number | null; par: number };
  players: { id: string; name: string; handicapIndex: number }[];
  holeScores: HoleScoreLite[];
};

/**
 * Build live rows for one hole-by-hole round.
 *
 * Strokes are allocated per tee-time group, relative to the lowest handicap in
 * that group - the same rule the scoring card uses, so the numbers agree
 * wherever they appear.
 */
export function liveRowsForRound(input: LiveRoundInput): LiveRow[] {
  const playable = holesInPlay(input.holes, input.holesCount, input.nine);
  if (playable.length === 0) return [];
  const parOf = new Map(playable.map((h) => [h.hole, h.par]));

  const mine = input.holeScores.filter(
    (s) => s.roundId === input.roundId && parOf.has(s.hole)
  );
  if (mine.length === 0) return [];

  const strokesFor = new Map<string, Record<number, number>>();
  for (const g of input.groups) {
    const group = g.playerIds
      .map((id) => input.players.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
    if (group.length === 0) continue;
    allocateForMatch({
      players: group.map((p) => ({
        playerId: p.id,
        name: p.name,
        index: p.handicapIndex,
      })),
      tee: input.tee,
      holes: input.holes,
      holesCount: input.holesCount,
      nine: input.nine,
      allowancePct: g.allowancePct,
    }).forEach((a) => strokesFor.set(a.playerId, a.byHole));
  }

  const out: LiveRow[] = [];
  for (const p of input.players) {
    const played = mine.filter((s) => s.playerId === p.id);
    if (played.length === 0) continue;
    const byHole = strokesFor.get(p.id) ?? {};
    let gross = 0;
    let parPlayed = 0;
    let strokesGiven = 0;
    for (const s of played) {
      gross += s.strokes;
      parPlayed += parOf.get(s.hole) ?? 4;
      strokesGiven += byHole[s.hole] ?? 0;
    }
    const net = gross - strokesGiven;
    out.push({
      playerId: p.id,
      thru: played.length,
      gross,
      parPlayed,
      toPar: gross - parPlayed,
      strokesGiven,
      net,
      netToPar: net - parPlayed,
      complete: played.length === playable.length,
    });
  }
  return out.sort((a, b) => a.netToPar - b.netToPar || b.thru - a.thru);
}

/**
 * The same shape from a basic 9/18 tournament, where a round is a single
 * submitted number. There is no partial state, so `thru` is all or nothing.
 */
export function liveRowsFromEntries(
  round: Round,
  holesCount: 9 | 18,
  players: Player[],
  scores: ScoreEntry[],
  courses: Course[],
  courseHandicapOf: (player: Player, round: Round, courses: Course[]) => number
): LiveRow[] {
  const course = courses.find((c) => c.id === round.courseId);
  const par = course?.par ?? 72;
  const holesPlayed = holesCount === 9 ? 9 : 18;
  const parPlayed = holesCount === 9 ? Math.round(par / 2) : par;

  const out: LiveRow[] = [];
  for (const p of players) {
    const s = scores.find((x) => x.roundId === round.id && x.playerId === p.id);
    if (!s || s.grossScore == null) continue;
    const strokesGiven = courseHandicapOf(p, round, courses);
    const net = s.grossScore - strokesGiven;
    out.push({
      playerId: p.id,
      thru: holesPlayed,
      gross: s.grossScore,
      parPlayed,
      toPar: s.grossScore - parPlayed,
      strokesGiven,
      net,
      netToPar: net - parPlayed,
      complete: true,
    });
  }
  return out.sort((a, b) => a.netToPar - b.netToPar);
}

/** "E", "+3", "-2" - how a golfer writes a score against par. */
export function toParLabel(n: number): string {
  if (n === 0) return "E";
  return n > 0 ? `+${n}` : `${n}`;
}


/** Where a match stands right now, from holes both sides have finished. */
export type LiveMatchState = {
  matchId: string;
  /** Holes where BOTH sides have a score. */
  thru: number;
  /** Net holes up for side A. Negative means B is up, 0 is all square. */
  standing: number;
  /** "2 UP", "ALL SQUARE", "3 DOWN" from side A's point of view. */
  label: string;
};

/**
 * Live status for each match, best ball per side.
 *
 * Deliberately does NOT decide a winner or award points: a match is not
 * settled until the cards are signed, and showing a result from a half-played
 * round would put points on the board that can still move.
 */
export function liveMatchStates(
  input: LiveRoundInput,
  matches: { id: string; aPlayers: string[]; bPlayers: string[] }[]
): LiveMatchState[] {
  const playable = holesInPlay(input.holes, input.holesCount, input.nine);
  if (playable.length === 0) return [];
  const parOf = new Map(playable.map((h) => [h.hole, h.par]));
  const mine = input.holeScores.filter(
    (s) => s.roundId === input.roundId && parOf.has(s.hole)
  );
  if (mine.length === 0) return [];

  // Same allocation the card uses, so the numbers agree.
  const strokesFor = new Map<string, Record<number, number>>();
  for (const g of input.groups) {
    const group = g.playerIds
      .map((id) => input.players.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
    if (group.length === 0) continue;
    allocateForMatch({
      players: group.map((p) => ({ playerId: p.id, name: p.name, index: p.handicapIndex })),
      tee: input.tee,
      holes: input.holes,
      holesCount: input.holesCount,
      nine: input.nine,
      allowancePct: g.allowancePct,
    }).forEach((a) => strokesFor.set(a.playerId, a.byHole));
  }

  const bestNetOn = (ids: string[], hole: number): number | null => {
    const nets = ids
      .map((id) => {
        const sc = mine.find((s) => s.playerId === id && s.hole === hole);
        if (!sc) return null;
        return sc.strokes - ((strokesFor.get(id) ?? {})[hole] ?? 0);
      })
      .filter((n): n is number => n != null);
    // Every player on the side has to be in before the hole counts.
    return nets.length === ids.length && nets.length > 0 ? Math.min(...nets) : null;
  };

  return matches.map((m) => {
    let standing = 0;
    let thru = 0;
    for (const h of playable) {
      const a = bestNetOn(m.aPlayers, h.hole);
      const b = bestNetOn(m.bPlayers, h.hole);
      if (a == null || b == null) continue;
      thru += 1;
      if (a < b) standing += 1;
      else if (b < a) standing -= 1;
    }
    const up = Math.abs(standing);
    const label =
      thru === 0 ? "Not started" : standing === 0 ? "All square" : `${up} up`;
    return { matchId: m.id, thru, standing, label };
  });
}
