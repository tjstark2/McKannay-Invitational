// A round's awards, from the raw round data.
//
// Pure: no database, no AI. The server loads the round and hands it here, so
// the whole path from hole scores to filled award lines is testable.
//
// Two different stroke allocations, on purpose:
//   - Player facts use each player's FULL course handicap. Awards compare
//     players across the whole field (medalist, sandbagger), so a player's
//     net must not depend on who they teed off with.
//   - Match facts use the match's own relative strokes - the same maths the
//     live match screen shows - because "gave 8 shots and won by 1" has to
//     mean the shots that were actually given in that match.

import { computeMatchFacts, computePlayerFacts, median, type MatchFacts, type PlayerFacts } from "@/features/awards/detectors";
import type { Stage, Standing } from "@/features/awards/moments";
import { selectAwards, type Award } from "@/features/awards/select";
import { liveMatchStates, type HoleScoreLite } from "@/features/trip/scoring/liveStandings";
import { allocateForMatch, holesInPlay } from "@/features/trip/scoring/strokeIndex";

export type BuildInput = {
  roundId: string;
  holes: { hole: number; par: number; si: number }[];
  holesCount: 9 | 18;
  nine: "front" | "back" | null;
  tee: { rating: number | null; slope: number | null; par: number };
  format: string | null;
  /** Tee-time groups and their allowance - the match maths needs them. */
  groups: { playerIds: string[]; allowancePct: number }[];
  /** Everyone who played. `team` is the team code, "A" or "B". */
  players: { id: string; name: string; handicapIndex: number; team: string | null }[];
  holeScores: HoleScoreLite[];
  matches: { id: string; aPlayers: string[]; bPlayers: string[] }[];
  previousNetToPar: Record<string, number>;
  history: { momentId: string; playerId: string }[];
  /** Team points after this round. */
  points: { a: number; b: number };
  stage: Stage;
};

export type BuiltAwards = {
  facts: PlayerFacts[];
  matchFacts: MatchFacts[];
  awards: Award[];
};

/** Where a team stands. "decided" only once the last round is in and somebody won. */
export function standingFor(
  team: string | null,
  points: { a: number; b: number },
  stage: Stage
): Standing {
  if (team !== "A" && team !== "B") return "tied";
  if (points.a === points.b) return "tied";
  if (stage === "finale") return "decided";
  const mine = team === "A" ? points.a : points.b;
  const theirs = team === "A" ? points.b : points.a;
  return mine > theirs ? "leading" : "trailing";
}

export function buildRoundAwards(input: BuildInput): BuiltAwards {
  const playable = holesInPlay(input.holes, input.holesCount, input.nine);
  const inPlay = new Set(playable.map((h) => h.hole));
  const scores = input.holeScores.filter((s) => s.roundId === input.roundId && inPlay.has(s.hole));

  // ---- players, off their full course handicap ----------------------------
  const full = new Map<string, Record<number, number>>();
  for (const p of input.players) {
    const [a] = allocateForMatch({
      players: [{ playerId: p.id, name: p.name, index: p.handicapIndex }],
      tee: input.tee,
      holes: input.holes,
      holesCount: input.holesCount,
      nine: input.nine,
      allowancePct: 100,
      basis: "full",
    });
    full.set(p.id, a?.byHole ?? {});
  }

  const cardOf = (id: string) => {
    const card: Record<number, number> = {};
    for (const s of scores) if (s.playerId === id) card[s.hole] = s.strokes;
    return card;
  };

  // First pass without the field, to find the field's day.
  const raw = input.players
    .map((p) =>
      computePlayerFacts({
        playerId: p.id, name: p.name, handicapIndex: p.handicapIndex, team: p.team,
        holes: playable, scores: cardOf(p.id), strokes: full.get(p.id) ?? {}, fieldMedianNetToPar: 0,
      })
    )
    .filter((f): f is PlayerFacts => f != null);
  // Only cards with at least nine holes set the bar - a two-hole card would
  // drag the median anywhere.
  const field = median(raw.filter((f) => f.holesPlayed >= 9).map((f) => f.netToPar));
  const facts = raw.map((f) => ({ ...f, vsField: field - f.netToPar }));

  // ---- matches, off the match's own strokes -------------------------------
  const relative = new Map<string, number>();
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
      basis: "relative",
    }).forEach((a) => relative.set(a.playerId, Object.values(a.byHole).reduce((s, n) => s + n, 0)));
  }
  // A side's shots, averaged so a pair isn't counted as twice the underdog.
  const sideShots = (ids: string[]) =>
    ids.length ? Math.round(ids.reduce((s, id) => s + (relative.get(id) ?? 0), 0) / ids.length) : 0;

  const states = liveMatchStates(
    {
      roundId: input.roundId,
      groups: input.groups,
      holes: input.holes,
      holesCount: input.holesCount,
      nine: input.nine,
      tee: input.tee,
      players: input.players.map((p) => ({ id: p.id, name: p.name, handicapIndex: p.handicapIndex })),
      holeScores: scores,
      format: input.format,
    },
    input.matches
  );
  const matchFacts = input.matches
    .map((m) => {
      const st = states.find((s) => s.matchId === m.id);
      if (!st) return null;
      return computeMatchFacts({
        matchId: m.id,
        aPlayers: m.aPlayers,
        bPlayers: m.bPlayers,
        holes: st.holes,
        strokesA: sideShots(m.aPlayers),
        strokesB: sideShots(m.bPlayers),
      });
    })
    .filter((m): m is MatchFacts => m != null);

  const { awards } = selectAwards({
    roundId: input.roundId,
    players: facts,
    matches: matchFacts,
    previousNetToPar: input.previousNetToPar,
    history: input.history,
    standingOf: (team) => standingFor(team, input.points, input.stage),
    stage: input.stage,
  });

  return { facts, matchFacts, awards };
}
