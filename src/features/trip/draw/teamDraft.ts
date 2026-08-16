// Captains draft for TEAMS (not matchups): the two captains alternate picking
// the rest of the roster onto their side.
//
// Same principle as the matchup draw - the randomness (the coin toss) happens
// once, up front, and everything after it is deterministic. Snake order keeps
// the first pick from being a lasting advantage: A, B, B, A, A, B, B...

import type { TeamId } from "@/types";

export type TeamDraftPick = {
  round: number; // 1-based pick number
  team: TeamId;
  playerId: string;
};

export type TeamDraftState = {
  first: TeamId;
  /** Roster still on the board, in display order. */
  remaining: string[];
  picks: TeamDraftPick[];
};

/** Coin toss for who picks first. The one random moment in the whole draft. */
export function tossForFirstPick(): TeamId {
  return Math.random() < 0.5 ? "A" : "B";
}

/**
 * Snake order for n picks: the captain who won the toss picks first, then the
 * other captain takes two in a row, and it alternates in pairs from there.
 * With first = "A" that gives A, B, B, A, A, B, B, A...
 */
export function snakeOrder(first: TeamId, count: number): TeamId[] {
  const other: TeamId = first === "A" ? "B" : "A";
  const out: TeamId[] = [];
  for (let i = 0; i < count; i++) {
    // Pairs after the opening pick: index 0 -> first, 1,2 -> other, 3,4 -> first...
    const inPairs = Math.floor((i + 1) / 2);
    out.push(inPairs % 2 === 0 ? first : other);
  }
  return out;
}

/** Whose turn it is with `picksMade` already on the board. */
export function nextTeam(first: TeamId, picksMade: number, total: number): TeamId | null {
  if (picksMade >= total) return null;
  return snakeOrder(first, total)[picksMade];
}

export function startTeamDraft(
  playerIds: string[],
  captainA: string | null,
  captainB: string | null,
  first: TeamId = tossForFirstPick()
): TeamDraftState {
  // Captains are already on their own side, so they aren't in the pool.
  const remaining = playerIds.filter((id) => id !== captainA && id !== captainB);
  return { first, remaining, picks: [] };
}

export function applyPick(state: TeamDraftState, playerId: string): TeamDraftState {
  const total = state.remaining.length + state.picks.length;
  const team = nextTeam(state.first, state.picks.length, total);
  if (!team || !state.remaining.includes(playerId)) return state;
  return {
    ...state,
    remaining: state.remaining.filter((id) => id !== playerId),
    picks: [...state.picks, { round: state.picks.length + 1, team, playerId }],
  };
}

export function undoPick(state: TeamDraftState): TeamDraftState {
  const last = state.picks[state.picks.length - 1];
  if (!last) return state;
  return {
    ...state,
    remaining: [last.playerId, ...state.remaining],
    picks: state.picks.slice(0, -1),
  };
}

/** Final sides, captains included. */
export function draftResult(
  state: TeamDraftState,
  captainA: string | null,
  captainB: string | null
): { a: string[]; b: string[] } {
  const a = captainA ? [captainA] : [];
  const b = captainB ? [captainB] : [];
  for (const p of state.picks) {
    if (p.team === "A") a.push(p.playerId);
    else b.push(p.playerId);
  }
  return { a, b };
}

/** How lopsided the sides ended up, by combined handicap. */
export function draftBalance(
  result: { a: string[]; b: string[] },
  hcp: Record<string, number>
): { a: number; b: number; diff: number } {
  const sum = (ids: string[]) => ids.reduce((t, id) => t + (hcp[id] ?? 0), 0);
  const a = sum(result.a);
  const b = sum(result.b);
  return { a, b, diff: Math.abs(a - b) };
}
