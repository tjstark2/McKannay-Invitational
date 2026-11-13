import type { Round } from "@/types/domain";
import { roundPhase } from "@/features/trip/scoring/roundPhase";

const SEVEN_HOURS_MS = 7 * 60 * 60 * 1000;

// A round's voting is concluded when ANY of:
//  - the round is final - closed by the engine or an organizer. For any round
//    the engine manages, this is the ONLY thing that closes voting, so voting
//    lasts exactly as long as the round does. Voting and the round used to run
//    on different clocks: voting shut 7 hours after the FIRST score while the
//    round closed 3 hours after the LAST, so either could end first.
//  - a LATER round has been started, or
//  - for older rounds the engine never managed (no last-score time recorded),
//    7 hours have passed since the first score - a safety net so their voting
//    still ends.
export function votingConcluded(
  round: Round,
  allRounds: Round[],
  now: number = Date.now()
): boolean {
  if (roundPhase(round) === "final") return true;

  const laterStarted = allRounds.some(
    (r) => r.roundNumber > round.roundNumber && r.startedAt
  );
  if (laterStarted) return true;

  if (!round.lastScoreAt && round.firstScoreAt) {
    const first = new Date(round.firstScoreAt).getTime();
    if (Number.isFinite(first) && now - first >= SEVEN_HOURS_MS) return true;
  }
  return false;
}

// Voting is open for a round when it has started and is not yet concluded.
export function votingOpen(
  round: Round,
  allRounds: Round[],
  now: number = Date.now()
): boolean {
  return Boolean(round.startedAt) && !votingConcluded(round, allRounds, now);
}
