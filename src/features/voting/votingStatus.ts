import type { Round } from "@/types/domain";

const SEVEN_HOURS_MS = 7 * 60 * 60 * 1000;

// A round's voting is concluded (computed on load) when ANY of:
//  - it has been Finished by an organizer,
//  - a LATER round has been Started, or
//  - 7 hours have passed since its first score.
export function votingConcluded(
  round: Round,
  allRounds: Round[],
  now: number = Date.now()
): boolean {
  if (round.finishedAt) return true;

  const laterStarted = allRounds.some(
    (r) => r.roundNumber > round.roundNumber && r.startedAt
  );
  if (laterStarted) return true;

  if (round.firstScoreAt) {
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
