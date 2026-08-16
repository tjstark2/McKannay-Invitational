import { useEffect, useState } from "react";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useAuth } from "@/features/auth/AuthContext";
import { AWARDS } from "@/features/voting/awards";
import { votingConcluded, votingOpen } from "@/features/voting/votingStatus";
import { roundHasVotes } from "@/features/voting/tally";
import { VotingModal } from "@/features/voting/VotingModal";
import { RevealModal } from "@/features/voting/RevealModal";
import { ConfirmScoreModal } from "@/features/voting/ConfirmScoreModal";
import { getSupabaseClient } from "@/lib/supabase/client";
import { setOverlayOpen } from "@/features/trip/tour/overlayState";

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
  // Rounds I've confirmed (signed the card, or confirmed an organizer-entered
  // score). null until loaded so the vote prompt can't jump the gun.
  const [confirmedRounds, setConfirmedRounds] = useState<string[] | null>(null);
  const [confirmDismissed, setConfirmDismissed] = useState<string[]>([]);

  // Tell the guided tour to hold off while this is covering the screen.
  useEffect(() => {
    setOverlayOpen("postRoundGate", Boolean(revealRoundId || voteRoundId));
    return () => setOverlayOpen("postRoundGate", false);
  }, [revealRoundId, voteRoundId]);

  const me =
    user?.id != null
      ? players.find((p) => p.accountId && p.accountId === user.id)
      : undefined;

  useEffect(() => {
    if (!me?.id) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("round_confirmations")
        .select("round_id")
        .eq("player_id", me.id);
      if (!cancelled) {
        setConfirmedRounds(((data ?? []) as { round_id: string }[]).map((r) => r.round_id));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me?.id]);

  /** Needs my nod first: someone else entered my final and I haven't confirmed. */
  function needsMyConfirmation(roundId: string): boolean {
    if (!me || !user?.id) return false;
    const s = scores.find((x) => x.roundId === roundId && x.playerId === me.id);
    if (!s || s.grossScore == null) return false;
    if (!s.enteredBy || s.enteredBy === user.id) return false;
    return !(confirmedRounds ?? []).includes(roundId);
  }

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
    if (confirmedRounds === null) return;
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
    if (!due) return;
    // A score someone else put in gets confirmed before the vote opens.
    if (needsMyConfirmation(due.id)) {
      if (!confirmDismissed.includes(due.id)) setVoteRoundId(due.id);
      return;
    }
    setVoteRoundId(due.id);
  }, [
    user?.id,
    me,
    revealRoundId,
    voteRoundId,
    voteDismissed,
    confirmDismissed,
    confirmedRounds,
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

  if (voteRoundId && me && user?.id && needsMyConfirmation(voteRoundId)) {
    const round = rounds.find((r) => r.id === voteRoundId);
    const myScore = scores.find(
      (s) => s.roundId === voteRoundId && s.playerId === me.id
    );
    if (round && myScore) {
      return (
        <ConfirmScoreModal
          round={round}
          score={myScore}
          playerId={me.id}
          userId={user.id}
          onConfirmed={() => {
            setConfirmedRounds((c) => [...(c ?? []), round.id]);
          }}
          onClose={() => {
            setConfirmDismissed((d) =>
              d.includes(round.id) ? d : [...d, round.id]
            );
            setVoteRoundId(null);
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
