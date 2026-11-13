// Where a round is in its life. ONE answer, used everywhere.
//
// This replaces seven separate ways the app used to work it out, which did
// not agree:
//   - started_at / finished_at on the round
//   - getRoundStatus(), which counted PUBLISHED scores and ignored the
//     round's own start and finish - so on a hole-by-hole round, where
//     totals are only published at close, a finished round read as
//     unfinished and the Nest would not move on
//   - the voting window's own rules
//   - the engine's close rule
//   - "started and not finished" in the app shell
//   - trips.current_round_id, a separate pointer
//   - the dashboard's trip status, which counted published scores again
//
// The round's own timestamps are the truth. The engine writes them -
// started_at when scoring opens, finished_at when the round closes - and
// everything else reads them through here.

export type RoundPhase =
  /** Not yet opened for scoring. */
  | "upcoming"
  /** Scoring is open. */
  | "live"
  /** Closed. Results, totals and points are settled. */
  | "final";

type RoundLike = {
  id: string;
  roundNumber: number;
  startedAt?: string | null;
  finishedAt?: string | null;
};

export function roundPhase(round: RoundLike): RoundPhase {
  if (round.finishedAt) return "final";
  if (round.startedAt) return "live";
  return "upcoming";
}

/**
 * The one round the app should be about right now.
 *
 *   1. A round being played - the lowest-numbered, if two overlap.
 *   2. Otherwise the organizer's chosen round, if it hasn't finished.
 *   3. Otherwise the next round that hasn't been played.
 *   4. Otherwise, everything is done: the last round played.
 *
 * Step 2 is why the organizer's pointer still matters, but it can no longer
 * point the whole app at a round that has already finished - which is how
 * the Nest showed "Next round: Thursday" on Friday.
 */
export function focusRound<T extends RoundLike>(
  rounds: T[],
  currentRoundId?: string | null
): T | null {
  if (rounds.length === 0) return null;
  const byNumber = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);

  const live = byNumber.find((r) => roundPhase(r) === "live");
  if (live) return live;

  const chosen = byNumber.find((r) => r.id === currentRoundId);
  if (chosen && roundPhase(chosen) !== "final") return chosen;

  const next = byNumber.find((r) => roundPhase(r) === "upcoming");
  if (next) return next;

  return byNumber[byNumber.length - 1];
}

/** The round being played right now, if any. */
export function liveRound<T extends RoundLike>(rounds: T[]): T | null {
  return [...rounds]
    .sort((a, b) => a.roundNumber - b.roundNumber)
    .find((r) => roundPhase(r) === "live") ?? null;
}

/** Every round is final - the trip is over. */
export function allRoundsFinal(rounds: RoundLike[]): boolean {
  return rounds.length > 0 && rounds.every((r) => roundPhase(r) === "final");
}
