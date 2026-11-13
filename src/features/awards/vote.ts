// The vote and the reveal, as plain logic the screens can share.

import { MOMENTS, lineFor } from "@/features/awards/moments";

/**
 * Pre-filled picks for the ballot, from the scores of the voter's own group -
 * those are the shots they actually saw. Sending the ballot untouched is a
 * complete vote, so the suggestion has to be a fair one or none at all:
 *   - Shot of the day: the best hole against par, birdie or better only. A
 *     par is not a shot of the day. Ties go to the harder hole.
 *   - Dumbest decision: the worst hole, triple bogey or worse only. Ties go
 *     to the bigger number.
 */
export function suggestVotes(input: {
  holes: { hole: number; par: number; si: number }[];
  holeScores: { playerId: string; hole: number; strokes: number }[];
  playerIds: string[];
}): Partial<Record<string, string>> {
  const card = new Map(input.holes.map((h) => [h.hole, h]));
  let best: { id: string; diff: number; si: number } | null = null;
  let worst: { id: string; diff: number; strokes: number } | null = null;

  for (const s of input.holeScores) {
    if (!input.playerIds.includes(s.playerId)) continue;
    const h = card.get(s.hole);
    if (!h) continue;
    const diff = s.strokes - h.par;
    if (diff <= -1 && (!best || diff < best.diff || (diff === best.diff && h.si < best.si))) {
      best = { id: s.playerId, diff, si: h.si };
    }
    if (diff >= 3 && (!worst || diff > worst.diff || (diff === worst.diff && s.strokes > worst.strokes))) {
      worst = { id: s.playerId, diff, strokes: s.strokes };
    }
  }

  const out: Partial<Record<string, string>> = {};
  if (best) out.shot_of_the_day = best.id;
  if (worst) out.worst_decision = worst.id;
  return out;
}

export type RevealCard = {
  key: string;
  title: string;
  playerIds: string[];
  line: string;
  stat: string;
  /** Voted by the group, or proven by the scores. */
  voted: boolean;
};

/**
 * The order awards are revealed in. The group's votes go first - a warm-up -
 * then the awards the scores proved, smallest to biggest, so the round's
 * headline lands last.
 */
export function revealOrder(
  proven: { momentId: string; title: string; playerIds: string[]; line: string; stat: string; position: number }[],
  voted: { key: string; title: string; winnerIds: string[]; count: number }[],
  nameOf: (id: string) => string,
  roundId: string
): RevealCard[] {
  const fromVotes: RevealCard[] = voted
    .filter((v) => v.winnerIds.length > 0)
    .map((v) => {
      const moment = MOMENTS.find((m) => m.id === v.key);
      const name = v.winnerIds.map(nameOf).join(" and ");
      const line = moment
        ? lineFor(moment, { tier: 1, standing: "tied", band: "mid", stage: "middle" }, { name }, `${roundId}:${v.key}`)
        : `The group has spoken: ${name}.`;
      return {
        key: v.key,
        title: v.title,
        playerIds: v.winnerIds,
        line,
        stat: `${v.count} ${v.count === 1 ? "vote" : "votes"}${v.winnerIds.length > 1 ? " each - a tie" : ""}`,
        voted: true,
      };
    });
  const fromScores: RevealCard[] = [...proven]
    .sort((a, b) => b.position - a.position)
    .map((a) => ({ key: a.momentId, title: a.title, playerIds: a.playerIds, line: a.line, stat: a.stat, voted: false }));
  return [...fromVotes, ...fromScores];
}
