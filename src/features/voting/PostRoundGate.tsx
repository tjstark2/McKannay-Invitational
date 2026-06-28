import { useEffect, useState } from "react";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useAuth } from "@/features/auth/AuthContext";
import { AWARDS } from "@/features/voting/awards";
import { votingConcluded, votingOpen } from "@/features/voting/votingStatus";
import { roundHasVotes } from "@/features/voting/tally";
import { VotingModal } from "@/features/voting/VotingModal";
import { RevealModal } from "@/features/voting/RevealModal";

// One gate, one modal at a time. On open it first REVEALS any concluded round
// whose results this person hasn't seen (everyone, voters and non-voters), then
// prompts to VOTE on any open round where their score is in and they haven't
// finished voting. Casting a vote never closes the voting modal.
export function PostRoundGate() {
  const {
    trip,
    players,
    rounds,
    scores,
    votes,
    seenRounds,
    votingEnabled,
    markRoundSeen,
  } = useTripState();
  const { user } = useAuth();

  const [revealRoundId, setRevealRoundId] = useState<string | null>(null);
  const [voteRoundId, setVoteRoundId] = useState<string | null>(null);
  const [voteDismissed, setVoteDismissed] = useState<string[]>([]);

  const me =
    user?.id != null
      ? players.find((p) => p.accountId && p.accountId === user.id)
      : undefined;

  // Reveal: any concluded round (with votes) not yet seen by this user.
  useEffect(() => {
    if (!user?.id || revealRoundId) return;
    const due = rounds.find(
      (r) =>
        votingConcluded(r, rounds) &&
        roundHasVotes(votes, r.id) &&
        !seenRounds.includes(r.id)
    );
    if (due) setRevealRoundId(due.id);
  }, [user?.id, revealRoundId, rounds, votes, seenRounds]);

  // Vote: my score is in, voting still open, I haven't finished all awards.
  useEffect(() => {
    if (!user?.id || !me || revealRoundId || voteRoundId) return;
    if (!trip.isPro || !votingEnabled) return;
    const due = rounds.find((r) => {
      if (!votingOpen(r, rounds)) return false;
      if (voteDismissed.includes(r.id)) return false;
      const myScore = scores.find(
        (s) => s.roundId === r.id && s.playerId === me.id
      );
      if (!myScore || myScore.grossScore == null) return false;
      const votedCount = votes.filter(
        (v) => v.roundId === r.id && v.voterAccount === user.id
      ).length;
      return votedCount < AWARDS.length;
    });
    if (due) setVoteRoundId(due.id);
  }, [
    user?.id,
    me,
    revealRoundId,
    voteRoundId,
    voteDismissed,
    trip.isPro,
    votingEnabled,
    rounds,
    scores,
    votes,
  ]);

  if (revealRoundId && user?.id) {
    const round = rounds.find((r) => r.id === revealRoundId);
    if (round) {
      return (
        <RevealModal
          round={round}
          onClose={() => {
            markRoundSeen(round.id, user.id);
            setRevealRoundId(null);
          }}
        />
      );
    }
  }

  if (voteRoundId && me && user?.id) {
    const round = rounds.find((r) => r.id === voteRoundId);
    if (round) {
      return (
        <VotingModal
          round={round}
          voterAccount={user.id}
          voterPlayerId={me.id}
          onClose={() => {
            setVoteDismissed((d) =>
              d.includes(round.id) ? d : [...d, round.id]
            );
            setVoteRoundId(null);
          }}
        />
      );
    }
  }

  return null;
}
