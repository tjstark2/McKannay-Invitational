import { useEffect, useState } from "react";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useAuth } from "@/features/auth/AuthContext";
import { roundLifecycle } from "@/features/trip/roundLifecycle";
import { AWARDS } from "@/features/voting/awards";
import { VotingModal } from "@/features/voting/VotingModal";

// Prompts the signed-in player to vote whenever their round is done (a final
// score exists for them, no matter who entered it - covers best ball / match
// play / an admin logging the group), voting is still open, and they haven't
// finished voting that round. Opening is decided once; casting a vote does NOT
// close the modal (the player stays in it until they finish or dismiss it).
export function VotingGate() {
  const { trip, players, rounds, scores, votes, votingEnabled } = useTripState();
  const { user } = useAuth();
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const me =
    user?.id != null
      ? players.find((p) => p.accountId && p.accountId === user.id)
      : undefined;
  const eligible = Boolean(user?.id && trip.isPro && votingEnabled && me);

  useEffect(() => {
    if (!eligible || activeRoundId || !me || !user?.id) return;
    const due = rounds.find((r) => {
      if (roundLifecycle(r) !== "live") return false;
      if (dismissed.includes(r.id)) return false;
      const myScore = scores.find(
        (s) => s.roundId === r.id && s.playerId === me.id
      );
      if (!myScore || myScore.grossScore == null) return false;
      const votedCount = votes.filter(
        (v) => v.roundId === r.id && v.voterAccount === user.id
      ).length;
      return votedCount < AWARDS.length; // not finished voting this round
    });
    if (due) setActiveRoundId(due.id);
  }, [eligible, activeRoundId, me, user?.id, rounds, scores, votes, dismissed]);

  if (!activeRoundId || !me || !user?.id) return null;
  const round = rounds.find((r) => r.id === activeRoundId);
  if (!round) return null;

  return (
    <VotingModal
      round={round}
      voterAccount={user.id}
      voterPlayerId={me.id}
      onClose={() => {
        setDismissed((d) => (d.includes(round.id) ? d : [...d, round.id]));
        setActiveRoundId(null);
      }}
    />
  );
}
