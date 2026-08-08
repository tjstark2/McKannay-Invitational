// Hole-by-hole stroke allocation.
//
// Only used when a tournament is in `hole_by_hole` mode. The 9/18 path keeps
// using lib/scoring.ts untouched - this file never changes that behaviour.
//
// Rules locked with TJ (Aug 2026):
//   * Course handicap = index * slope/113 + (rating - par), then FLOORED.
//   * Strokes given = CEIL(allowance% * (highCH - lowCH)). 1.3 and 1.5 both -> 2.
//   * Strokes land on the hardest holes by course handicap number (1..18).
//     A difference over 18 wraps and puts a second stroke from number 1 again.
//   * 9-hole rounds: half the course handicap (ceiled), allocated only within
//     the nine being played, ranked by that hole's course handicap number.

export type HoleInfo = { hole: number; par: number; si: number };

export type PlayerHandicap = {
  playerId: string;
  index: number; // handicap index as entered
};

export type TeeInfo = { rating: number | null; slope: number | null; par: number | null };

/** Raw course handicap before flooring. */
export function rawCourseHandicap(index: number, tee: TeeInfo): number {
  const slope = tee.slope ?? 113;
  const rating = tee.rating ?? tee.par ?? 72;
  const par = tee.par ?? 72;
  return index * (slope / 113) + (rating - par);
}

/** Course handicap as displayed and used: floored. */
export function courseHandicapFloored(index: number, tee: TeeInfo): number {
  return Math.floor(rawCourseHandicap(index, tee));
}

/** "Riley is a course handicap of 17 (17.4)" */
export function describeHandicap(name: string, index: number, tee: TeeInfo): string {
  const raw = rawCourseHandicap(index, tee);
  return `${name} is a course handicap of ${Math.floor(raw)} (${raw.toFixed(1)})`;
}

/**
 * Strokes one player receives relative to the low player in the match.
 * allowancePct 0-100. Result is always a whole number of strokes.
 */
export function strokesReceived(
  playerCH: number,
  lowCH: number,
  allowancePct: number,
  holesPlayed: 9 | 18 = 18
): number {
  const diff = Math.max(0, playerCH - lowCH);
  const allowed = (allowancePct / 100) * diff;
  const forNine = holesPlayed === 9 ? allowed / 2 : allowed;
  return Math.ceil(forNine - 1e-9); // guard float noise: 3.0000000001 stays 3
}

/**
 * Which holes those strokes fall on. Holes are ranked by course handicap
 * number; only the holes actually being played are eligible.
 * Returns a map hole -> strokes on that hole (usually 1, 2 when it wraps).
 */
export function allocateStrokes(holes: HoleInfo[], strokes: number): Record<number, number> {
  const out: Record<number, number> = {};
  if (strokes <= 0 || holes.length === 0) return out;
  const ranked = [...holes].sort((a, b) => a.si - b.si);
  for (let i = 0; i < strokes; i++) {
    const h = ranked[i % ranked.length];
    out[h.hole] = (out[h.hole] ?? 0) + 1;
  }
  return out;
}

/** Holes in play for a round. */
export function holesInPlay(
  all: HoleInfo[],
  holesCount: 9 | 18,
  nine: "front" | "back" | null
): HoleInfo[] {
  if (holesCount === 18) return all;
  return nine === "back"
    ? all.filter((h) => h.hole >= 10)
    : all.filter((h) => h.hole <= 9);
}

export type MatchStrokes = {
  playerId: string;
  courseHandicap: number;
  strokes: number;
  byHole: Record<number, number>;
  summary: string;
};

/**
 * Full allocation for one match/group. Everyone is measured off the lowest
 * course handicap in the group (that player plays off scratch for the match).
 */
export function allocateForMatch(params: {
  players: (PlayerHandicap & { name: string })[];
  tee: TeeInfo;
  holes: HoleInfo[];
  holesCount: 9 | 18;
  nine: "front" | "back" | null;
  allowancePct: number;
}): MatchStrokes[] {
  const { players, tee, holes, holesCount, nine, allowancePct } = params;
  const eligible = holesInPlay(holes, holesCount, nine);
  const chs = players.map((p) => ({ ...p, ch: courseHandicapFloored(p.index, tee) }));
  const low = chs.reduce((min, p) => Math.min(min, p.ch), Infinity);

  return chs.map((p) => {
    const strokes = strokesReceived(p.ch, low, allowancePct, holesCount);
    const byHole = allocateStrokes(eligible, strokes);
    const holeList = Object.keys(byHole)
      .map(Number)
      .sort((a, b) => a - b)
      .join(", ");
    const summary =
      strokes === 0
        ? `${p.name} plays off scratch here - no strokes.`
        : `${p.name} gets ${strokes} stroke${strokes === 1 ? "" : "s"}: 1 stroke on hole${
            holeList.includes(",") ? "s" : ""
          } ${holeList}.`;
    return { playerId: p.playerId, courseHandicap: p.ch, strokes, byHole, summary };
  });
}

/** Net score for a hole given the strokes that player receives on it. */
export function netForHole(gross: number, strokesOnHole: number): number {
  return gross - strokesOnHole;
}
