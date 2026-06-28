import { useState } from "react";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useAuth } from "@/features/auth/AuthContext";
import { roundLifecycle } from "@/features/trip/roundLifecycle";
import { VotingModal } from "@/features/voting/VotingModal";

// Prompts the signed-in player to vote whenever:
//  - the trip is Pro and voting is enabled,
//  - a round's voting is still open (started, not finished),
//  - YOUR player already has a final score in that round (no matter who entered
//    it - covers best ball / match play / an admin logging for the group), and
//  - you haven't voted in that round yet.
// This makes the ballot appear on app open, not only right after you tap save.
export function VotingGate() {
  const { trip, players, rounds, scores, votes, votingEnabled } = useTripState();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState<string[]>([]);

  if (!user?.id || !trip.isPro || !votingEnabled) return null;

  const me = players.find((p) => p.accountId && p.accountId === user.id);
  if (!me) return null;

  const due = rounds.find((r) => {
    if (roundLifecycle(r) !== "live") return false;
    if (dismissed.includes(r.id)) return false;
    const myScore = scores.find(
      (s) => s.roundId === r.id && s.playerId === me.id
    );
    if (!myScore || myScore.grossScore == null) return false;
    const alreadyVoted = votes.some(
      (v) => v.roundId === r.id && v.voterAccount === user.id
    );
    return !alreadyVoted;
  });

  if (!due) return null;

  return (
    <VotingModal
      round={due}
      voterAccount={user.id}
      voterPlayerId={me.id}
      onClose={() => setDismissed((d) => [...d, due.id])}
    />
  );
}
