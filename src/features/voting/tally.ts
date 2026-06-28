import type { Vote } from "@/types/domain";

export type AwardWinners = {
  awardKey: string;
  winnerIds: string[]; // co-winners on tie; empty if 0 votes
  count: number; // votes the winner(s) received
};

function winnersFromCounts(counts: Map<string, number>): {
  ids: string[];
  count: number;
} {
  let max = 0;
  let ids: string[] = [];
  counts.forEach((c, id) => {
    if (c > max) {
      max = c;
      ids = [id];
    } else if (c === max) {
      ids.push(id);
    }
  });
  if (max === 0) return { ids: [], count: 0 };
  return { ids, count: max };
}

// Winners of a single award within one round.
export function roundAwardWinners(
  votes: Vote[],
  roundId: string,
  awardKey: string
): AwardWinners {
  const counts = new Map<string, number>();
  votes
    .filter((v) => v.roundId === roundId && v.awardKey === awardKey)
    .forEach((v) =>
      counts.set(v.nomineePlayer, (counts.get(v.nomineePlayer) ?? 0) + 1)
    );
  const { ids, count } = winnersFromCounts(counts);
  return { awardKey, winnerIds: ids, count };
}

// Cumulative trip winners of an award = most TOTAL votes across all rounds.
// This is the "true" badge.
export function tripAwardWinners(
  votes: Vote[],
  awardKey: string
): AwardWinners {
  const counts = new Map<string, number>();
  votes
    .filter((v) => v.awardKey === awardKey)
    .forEach((v) =>
      counts.set(v.nomineePlayer, (counts.get(v.nomineePlayer) ?? 0) + 1)
    );
  const { ids, count } = winnersFromCounts(counts);
  return { awardKey, winnerIds: ids, count };
}

// Does a round have at least one vote (worth revealing)?
export function roundHasVotes(votes: Vote[], roundId: string): boolean {
  return votes.some((v) => v.roundId === roundId);
}
