// Match-state moments: the lead changing hands, and a match still on a knife
// edge at the turn. Pure comparison so it can be tested and so the caller
// decides what to do with it.
//
// "Standing" here is net holes up from team A's point of view: positive means
// A is ahead, negative means B, zero is all square.

export type MatchMoment = {
  key: "lead_change" | "all_square" | "close_at_turn";
  text: string;
};

export type MatchSide = { name: string; standing: number };

/**
 * Compare the state of a match before and after a hole. Returns a moment when
 * the lead actually changed hands or the match drew level - the two things
 * worth interrupting someone for.
 */
export function detectLeadChange(
  before: number,
  after: number,
  aName: string,
  bName: string,
  hole: number
): MatchMoment | null {
  if (before === after) return null;

  const leaderOf = (n: number) => (n > 0 ? "A" : n < 0 ? "B" : "T");
  const wasLeader = leaderOf(before);
  const nowLeader = leaderOf(after);
  if (wasLeader === nowLeader) return null;

  const up = Math.abs(after);
  if (nowLeader === "T") {
    return {
      key: "all_square",
      text: `⚖️ All square through ${hole}. ${aName} and ${bName} start again.`,
    };
  }
  // Only a genuine turnover, not going from level to a lead.
  if (wasLeader === "T") {
    const name = nowLeader === "A" ? aName : bName;
    return {
      key: "lead_change",
      text: `📈 ${name} take the lead on ${hole}, ${up} up.`,
    };
  }
  const name = nowLeader === "A" ? aName : bName;
  const lost = nowLeader === "A" ? bName : aName;
  return {
    key: "lead_change",
    text: `🔄 ${name} turn it around on ${hole} and go ${up} up on ${lost}.`,
  };
}

/**
 * At the turn (through 9), a match within one hole is worth a nudge - it's the
 * point where people start watching the other groups.
 */
export function detectCloseAtTurn(
  holesComplete: number,
  standing: number,
  aName: string,
  bName: string
): MatchMoment | null {
  if (holesComplete !== 9) return null;
  if (Math.abs(standing) > 1) return null;
  if (standing === 0) {
    return {
      key: "close_at_turn",
      text: `🔥 ${aName} and ${bName} make the turn all square.`,
    };
  }
  const leader = standing > 0 ? aName : bName;
  const chaser = standing > 0 ? bName : aName;
  return {
    key: "close_at_turn",
    text: `🔥 ${leader} lead ${chaser} by one at the turn. Anyone's match.`,
  };
}

/**
 * Net holes up for side A across the holes both sides have finished. Ties
 * (halved holes) move nothing, which is what match play does.
 */
export function standingFromHoles(
  aByHole: Record<number, number>,
  bByHole: Record<number, number>
): { standing: number; holesComplete: number } {
  let standing = 0;
  let holesComplete = 0;
  const holes = new Set([
    ...Object.keys(aByHole).map(Number),
    ...Object.keys(bByHole).map(Number),
  ]);
  for (const h of [...holes].sort((x, y) => x - y)) {
    const a = aByHole[h];
    const b = bByHole[h];
    if (a == null || b == null) continue;
    holesComplete += 1;
    if (a < b) standing += 1;
    else if (b < a) standing -= 1;
  }
  return { standing, holesComplete };
}
