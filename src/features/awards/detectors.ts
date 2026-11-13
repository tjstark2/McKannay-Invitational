// What actually happened in a round.
//
// Pure computation over the hole scores - no AI, no judgement, fully testable.
// The awards engine decides WHICH moments to award from these facts, and the
// AI only ever writes words about facts that came from here. It never works a
// number out itself, so a generated award can never cite a stat that is wrong.

export type HoleCard = {
  hole: number;
  par: number;
  /** Stroke index, 1 = hardest. */
  si: number;
};

export type PlayerFacts = {
  playerId: string;
  name: string;
  /** Handicap index, for the band the copy is written in. */
  handicapIndex: number;
  team: string | null;
  gross: number;
  /** Net against par for the holes played. Negative is good. */
  netToPar: number;
  /** How far better than expected, against the FIELD that day. Positive is good. */
  vsField: number;
  holesPlayed: number;
  /** Holes of 8 or worse. */
  snowmen: number;
  /** The single worst hole relative to par. */
  worstHole: { hole: number; strokes: number; overPar: number } | null;
  birdies: number;
  eagles: number;
  frontNine: number | null;
  backNine: number | null;
  /** Longest run of par or better. */
  parStreak: number;
  /** Longest run of double bogey or worse. */
  doubleStreak: number;
  /** Holes where they got a shot and still made double bogey or worse. */
  wastedShots: number;
};

export type MatchFacts = {
  matchId: string;
  aPlayers: string[];
  bPlayers: string[];
  /** The side that received shots, "A" or "B", or null if level. */
  underdog: "A" | "B" | null;
  /** Shots the underdog received in total. */
  strokesGiven: number;
  /** Final holes up for the winner. 0 for a halved match. */
  margin: number;
  winner: "A" | "B" | "T";
  /** The largest deficit the winner overturned. */
  comeback: number;
  /** The last hole that changed who was ahead, if the match was decided late. */
  decidedOn: number | null;
};

export function computePlayerFacts(input: {
  playerId: string;
  name: string;
  handicapIndex: number;
  team: string | null;
  holes: HoleCard[];
  /** hole -> strokes for this player. */
  scores: Record<number, number>;
  /** hole -> shots received, from the same allocation the live screens use. */
  strokes: Record<number, number>;
  /** The median net to par across everyone that round - the field's day. */
  fieldMedianNetToPar: number;
}): PlayerFacts | null {
  const played = input.holes.filter((h) => input.scores[h.hole] != null).sort((a, b) => a.hole - b.hole);
  if (played.length === 0) return null;

  let gross = 0;
  let par = 0;
  let given = 0;
  let snowmen = 0;
  let birdies = 0;
  let eagles = 0;
  let worst: PlayerFacts["worstHole"] = null;
  let parRun = 0;
  let parStreak = 0;
  let dblRun = 0;
  let doubleStreak = 0;
  let wastedShots = 0;
  let front: number | null = null;
  let back: number | null = null;

  for (const h of played) {
    const s = input.scores[h.hole];
    const shots = input.strokes[h.hole] ?? 0;
    gross += s;
    par += h.par;
    given += shots;
    const over = s - h.par;

    if (s >= 8) snowmen += 1;
    if (over === -1) birdies += 1;
    if (over <= -2) eagles += 1;
    if (!worst || over > worst.overPar) worst = { hole: h.hole, strokes: s, overPar: over };

    parRun = over <= 0 ? parRun + 1 : 0;
    parStreak = Math.max(parStreak, parRun);
    dblRun = over >= 2 ? dblRun + 1 : 0;
    doubleStreak = Math.max(doubleStreak, dblRun);

    if (shots > 0 && over >= 2) wastedShots += 1;

    if (h.hole <= 9) front = (front ?? 0) + s;
    else back = (back ?? 0) + s;
  }

  const netToPar = gross - given - par;
  return {
    playerId: input.playerId,
    name: input.name,
    handicapIndex: input.handicapIndex,
    team: input.team,
    gross,
    netToPar,
    vsField: input.fieldMedianNetToPar - netToPar,
    holesPlayed: played.length,
    snowmen,
    worstHole: worst,
    birdies,
    eagles,
    frontNine: front,
    backNine: back,
    parStreak,
    doubleStreak,
    wastedShots,
  };
}

/** The median of a list - the field's day, robust to one disaster. */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * A match's story from its hole-by-hole results.
 *
 * `holes` is who won each completed hole in order, as the live match maths
 * already produces. `strokesA` / `strokesB` are the total shots each side
 * received, so the underdog and how many shots changed hands are known.
 */
export function computeMatchFacts(input: {
  matchId: string;
  aPlayers: string[];
  bPlayers: string[];
  holes: { hole: number; winner: "A" | "B" | "T" }[];
  strokesA: number;
  strokesB: number;
}): MatchFacts | null {
  if (input.holes.length === 0) return null;
  let standing = 0;
  let minA = 0;
  let maxA = 0;
  let lastLeadChange: number | null = null;
  let leader: "A" | "B" | null = null;

  for (const h of input.holes) {
    if (h.winner === "A") standing += 1;
    else if (h.winner === "B") standing -= 1;
    minA = Math.min(minA, standing);
    maxA = Math.max(maxA, standing);
    const now = standing > 0 ? "A" : standing < 0 ? "B" : null;
    if (now !== leader) {
      if (now) lastLeadChange = h.hole;
      leader = now;
    }
  }

  const winner: "A" | "B" | "T" = standing > 0 ? "A" : standing < 0 ? "B" : "T";
  const underdog = input.strokesA > input.strokesB ? "A" : input.strokesB > input.strokesA ? "B" : null;
  return {
    matchId: input.matchId,
    aPlayers: input.aPlayers,
    bPlayers: input.bPlayers,
    underdog,
    strokesGiven: Math.abs(input.strokesA - input.strokesB),
    margin: Math.abs(standing),
    winner,
    // The deepest hole the eventual winner climbed out of.
    comeback: winner === "A" ? -minA : winner === "B" ? maxA : 0,
    decidedOn: winner === "T" ? null : lastLeadChange,
  };
}
