import { useEffect, useState } from "react";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useAuth } from "@/features/auth/AuthContext";
import { BALLOT_KEYS } from "@/features/voting/awards";
import { votingConcluded, votingOpen } from "@/features/voting/votingStatus";
import { roundHasVotes } from "@/features/voting/tally";
import { BallotSheet } from "@/features/voting/BallotSheet";
import { AwardsReveal } from "@/features/voting/AwardsReveal";
import { ConfirmScoreModal } from "@/features/voting/ConfirmScoreModal";
import { onSigned } from "@/features/voting/signedSignal";
import { onOpenAwards } from "@/features/voting/awardsSignal";
import { getSupabaseClient } from "@/lib/supabase/client";
import { setOverlayOpen } from "@/features/trip/tour/overlayState";

/**
 * After a round closes on its own, the AI gets one pass at the award lines on
 * the next cron tick. Hold the reveal this long for it, so people see the good
 * version - but never longer, so a slow AI can't hide the awards.
 */
const AI_GRACE_MS = 12 * 60 * 1000;

type AwardsState = { count: number; polished: boolean };

// One gate, one screen at a time, Pro tournaments only:
//   1. REVEAL - a round is final and has awards (or votes) this person hasn't
//      seen. Everyone gets it, voters or not.
//   2. VOTE   - a round is still open, my card is in, and I haven't voted.
//      A score someone else entered for me gets my confirmation first.
export function PostRoundGate() {
  const { trip, players, rounds, scores, votes, seenRounds, votingEnabled, markRoundSeen } = useTripState();
  const { user } = useAuth();

  const [revealRoundId, setRevealRoundId] = useState<string | null>(null);
  const [voteRoundId, setVoteRoundId] = useState<string | null>(null);
  const [voteDismissed, setVoteDismissed] = useState<string[]>([]);
  const [confirmedRounds, setConfirmedRounds] = useState<string[] | null>(null);
  const [confirmDismissed, setConfirmDismissed] = useState<string[]>([]);
  const [awardsByRound, setAwardsByRound] = useState<Record<string, AwardsState>>({});
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setOverlayOpen("postRoundGate", Boolean(revealRoundId || voteRoundId));
    return () => setOverlayOpen("postRoundGate", false);
  }, [revealRoundId, voteRoundId]);

  const me = user?.id != null ? players.find((p) => p.accountId && p.accountId === user.id) : undefined;

  useEffect(() => {
    if (!me?.id) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("round_confirmations").select("round_id").eq("player_id", me.id);
      if (!cancelled) setConfirmedRounds(((data ?? []) as { round_id: string }[]).map((r) => r.round_id));
    })();
    return () => {
      cancelled = true;
    };
  }, [me?.id]);

  function needsMyConfirmation(roundId: string): boolean {
    if (!me || !user?.id) return false;
    const s = scores.find((x) => x.roundId === roundId && x.playerId === me.id);
    if (!s || s.grossScore == null) return false;
    if (!s.enteredBy || s.enteredBy === user.id) return false;
    return !(confirmedRounds ?? []).includes(roundId);
  }

  // Signing says so directly - the most reliable moment to ask for the vote.
  useEffect(() => {
    return onSigned((roundId) => {
      if (!trip.isPro || !votingEnabled) return;
      setConfirmedRounds((c) => ((c ?? []).includes(roundId) ? c : [...(c ?? []), roundId]));
      setVoteRoundId(roundId);
    });
  }, [trip.isPro, votingEnabled]);

  // "See the awards" from anywhere - replays a round's reveal on demand.
  useEffect(() => {
    return onOpenAwards((roundId) => {
      if (!trip.isPro) return;
      setVoteRoundId(null);
      setRevealRoundId(roundId);
    });
  }, [trip.isPro]);

  // Which final, unseen rounds have awards waiting, and whether the AI has
  // had its pass yet.
  const unseenFinal = rounds.filter((r) => votingConcluded(r, rounds) && !seenRounds.includes(r.id)).map((r) => r.id);
  const unseenKey = unseenFinal.join(",");
  useEffect(() => {
    if (!trip.isPro || unseenFinal.length === 0) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("round_awards").select("round_id,written_by").in("round_id", unseenFinal);
      if (cancelled) return;
      const next: Record<string, AwardsState> = {};
      for (const row of (data ?? []) as { round_id: string; written_by: string }[]) {
        const cur = next[row.round_id] ?? { count: 0, polished: false };
        next[row.round_id] = { count: cur.count + 1, polished: cur.polished || row.written_by === "ai" };
      }
      setAwardsByRound(next);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.isPro, unseenKey, tick]);

  // While a round is in its AI grace window, look again every minute.
  const waitingOnAi = rounds.some((r) => {
    const a = awardsByRound[r.id];
    const finished = r.finishedAt ? new Date(r.finishedAt).getTime() : 0;
    return unseenFinal.includes(r.id) && a && a.count > 0 && !a.polished && finished && Date.now() - finished < AI_GRACE_MS;
  });
  useEffect(() => {
    if (!waitingOnAi) return;
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, [waitingOnAi]);

  // Reveal.
  useEffect(() => {
    if (!user?.id || revealRoundId || !trip.isPro) return;
    const due = rounds.find((r) => {
      if (!unseenFinal.includes(r.id)) return false;
      const a = awardsByRound[r.id];
      if (a && a.count > 0) {
        const finished = r.finishedAt ? new Date(r.finishedAt).getTime() : 0;
        return a.polished || !finished || Date.now() - finished >= AI_GRACE_MS;
      }
      return roundHasVotes(votes, r.id);
    });
    if (due) setRevealRoundId(due.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, revealRoundId, trip.isPro, rounds, votes, unseenKey, awardsByRound, tick]);

  // Vote: my score is in, voting still open, and I haven't voted yet.
  useEffect(() => {
    if (!user?.id || !me || revealRoundId || voteRoundId) return;
    if (!trip.isPro || !votingEnabled) return;
    if (confirmedRounds === null) return;
    const due = rounds.find((r) => {
      if (!votingOpen(r, rounds)) return false;
      if (voteDismissed.includes(r.id)) return false;
      const myScore = scores.find((s) => s.roundId === r.id && s.playerId === me.id);
      if (!myScore || myScore.grossScore == null) return false;
      return !votes.some((v) => v.roundId === r.id && v.voterAccount === user.id && BALLOT_KEYS.includes(v.awardKey));
    });
    if (!due) return;
    if (needsMyConfirmation(due.id)) {
      if (!confirmDismissed.includes(due.id)) setVoteRoundId(due.id);
      return;
    }
    setVoteRoundId(due.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, me, revealRoundId, voteRoundId, voteDismissed, confirmDismissed, confirmedRounds, trip.isPro, votingEnabled, rounds, scores, votes]);

  if (revealRoundId && user?.id) {
    const round = rounds.find((r) => r.id === revealRoundId);
    if (round) {
      return (
        <AwardsReveal
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
    const myScore = scores.find((s) => s.roundId === voteRoundId && s.playerId === me.id);
    if (round && myScore) {
      return (
        <ConfirmScoreModal
          round={round}
          score={myScore}
          playerId={me.id}
          userId={user.id}
          onConfirmed={() => setConfirmedRounds((c) => [...(c ?? []), round.id])}
          onClose={() => {
            setConfirmDismissed((d) => (d.includes(round.id) ? d : [...d, round.id]));
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
        <BallotSheet
          round={round}
          voterAccount={user.id}
          voterPlayerId={me.id}
          onClose={() => {
            setVoteDismissed((d) => (d.includes(round.id) ? d : [...d, round.id]));
            setVoteRoundId(null);
          }}
        />
      );
    }
  }

  return null;
}
