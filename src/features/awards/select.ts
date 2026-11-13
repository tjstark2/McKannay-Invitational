// Which moments become the round's awards.
//
//   - Every moment proposes candidates from the facts.
//   - One award per moment per round: two Santa's Helpers dilute the joke.
//   - Repeats are allowed but have to earn it: a moment already won by the
//     same person this trip scores 40% lower, so it only fires again when it
//     is genuinely worse - which is exactly when ragging them is funny.
//   - Spread: nobody takes more than two, unless the round really is theirs.
//   - Between 3 and 7 awards, depending on how much actually happened.
//
// The voted moments are returned separately: the app cannot see them, so the
// group decides them.

import type { MatchFacts, PlayerFacts } from "@/features/awards/detectors";
import {
  MOMENTS,
  bandFor,
  lineFor,
  type Candidate,
  type Moment,
  type Stage,
  type Standing,
  type VariantKey,
  variantFor,
} from "@/features/awards/moments";

export type Award = {
  momentId: string;
  title: string;
  playerIds: string[];
  /** The hand-written line, filled. The AI may rewrite it; this is the fallback. */
  line: string;
  stat: string;
  variant: VariantKey;
  /** How many times these people have now won it this trip. */
  tier: number;
  score: number;
};

const MIN_AWARDS = 3;
const MAX_AWARDS = 7;
/** A candidate this strong always earns a place, up to the maximum. */
const STRONG = 52;
const REPEAT_DECAY = 0.6;
const MAX_PER_PLAYER = 2;

export function selectAwards(input: {
  roundId: string;
  players: PlayerFacts[];
  matches: MatchFacts[];
  previousNetToPar: Record<string, number>;
  /** Awards already given earlier this trip. */
  history: { momentId: string; playerId: string }[];
  /** Where a team stands going into the result. */
  standingOf: (team: string | null) => Standing;
  stage: Stage;
}): { awards: Award[]; voteable: Moment[] } {
  const inputs = { players: input.players, matches: input.matches, previousNetToPar: input.previousNetToPar };
  const timesWon = (momentId: string, ids: string[]) =>
    Math.max(0, ...ids.map((id) => input.history.filter((h) => h.momentId === momentId && h.playerId === id).length));

  const scored: (Candidate & { moment: Moment; tier: number; adjusted: number })[] = [];
  for (const moment of MOMENTS) {
    if (moment.voteable || !moment.detect) continue;
    for (const c of moment.detect(inputs)) {
      const prior = timesWon(c.momentId, c.playerIds);
      scored.push({
        ...c,
        moment,
        tier: prior + 1,
        adjusted: prior > 0 ? c.score * REPEAT_DECAY : c.score,
      });
    }
  }
  scored.sort((a, b) => b.adjusted - a.adjusted);

  const usedMoments = new Set<string>();
  const perPlayer = new Map<string, number>();
  const chosen: typeof scored = [];

  const fits = (c: (typeof scored)[number]) =>
    !usedMoments.has(c.momentId) && c.playerIds.every((id) => (perPlayer.get(id) ?? 0) < MAX_PER_PLAYER);

  const take = (c: (typeof scored)[number]) => {
    chosen.push(c);
    usedMoments.add(c.momentId);
    for (const id of c.playerIds) perPlayer.set(id, (perPlayer.get(id) ?? 0) + 1);
  };

  for (const c of scored) {
    if (chosen.length >= MAX_AWARDS) break;
    if (c.adjusted >= STRONG && fits(c)) take(c);
  }
  // A quiet round still gets enough to be worth opening.
  for (const c of scored) {
    if (chosen.length >= MIN_AWARDS) break;
    if (fits(c)) take(c);
  }

  const awards = chosen.map((c) => {
    const lead = input.players.find((p) => p.playerId === c.playerIds[0]);
    const ctx = {
      tier: c.tier,
      standing: input.standingOf(lead?.team ?? null),
      band: bandFor(lead?.handicapIndex ?? 15),
      stage: input.stage,
    };
    return {
      momentId: c.momentId,
      title: c.moment.title,
      playerIds: c.playerIds,
      line: lineFor(c.moment, ctx, c.vars, `${input.roundId}:${c.momentId}`),
      stat: c.stat,
      variant: variantFor(c.moment, ctx),
      tier: c.tier,
      score: Math.round(c.adjusted),
    };
  });

  return { awards, voteable: MOMENTS.filter((m) => m.voteable) };
}
