"use client";

// The vote: every award on one screen.
//
// Before, voting was five screens about things the app already knew. Now the
// scores decide everything they can see, and the group only votes on what
// they can't - four quick calls. The scores pre-fill a fair pick where there
// is one, so tapping Send it without touching anything is a complete vote.
// Voting for yourself is allowed. It is funnier.

import { useMemo, useState } from "react";
import type { Round } from "@/types/domain";
import { AvatarWithFrame } from "@/features/cosmetics/AvatarWithFrame";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useLiveRound } from "@/features/trip/scoring/useLiveRound";
import { BALLOT } from "@/features/voting/awards";
import { suggestVotes } from "@/features/awards/vote";

export function BallotSheet({
  round,
  voterAccount,
  voterPlayerId,
  onClose,
}: {
  round: Round;
  voterAccount: string;
  voterPlayerId: string;
  onClose: () => void;
}) {
  const { players, votes, castVote } = useTripState();
  const live = useLiveRound();
  const [sent, setSent] = useState(false);

  // My group first - those are the shots I actually saw.
  const myGroup = useMemo(() => {
    const fromLive = live.round?.id === round.id
      ? live.round.teeTimes.find((t) => t.playerIds.includes(voterPlayerId))?.playerIds
      : undefined;
    const fromRound = round.teeTimes.find((t) => t.players.includes(voterPlayerId))?.players;
    return fromLive ?? fromRound ?? [voterPlayerId];
  }, [live.round, round, voterPlayerId]);

  const ordered = useMemo(() => {
    const inGroup = players.filter((p) => myGroup.includes(p.id));
    const rest = players.filter((p) => !myGroup.includes(p.id)).sort((a, b) => a.name.localeCompare(b.name));
    return [...inGroup, ...rest];
  }, [players, myGroup]);

  const suggested = useMemo(
    () =>
      live.round?.id === round.id
        ? suggestVotes({ holes: live.holes, holeScores: live.holeScores, playerIds: myGroup })
        : {},
    [live.round?.id, live.holes, live.holeScores, round.id, myGroup]
  );

  // What I already voted (re-opening shows it), else the suggestion.
  const [picks, setPicks] = useState<Record<string, string | null>>(() => {
    const out: Record<string, string | null> = {};
    for (const a of BALLOT) {
      const mine = votes.find((v) => v.roundId === round.id && v.voterAccount === voterAccount && v.awardKey === a.key);
      out[a.key] = mine?.nomineePlayer ?? null;
    }
    return out;
  });
  const pickFor = (key: string) => (key in picks && picks[key] !== null ? picks[key] : suggested[key] ?? null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const choose = (key: string, id: string) => {
    setTouched((t) => ({ ...t, [key]: true }));
    // Tapping the current pick clears it.
    setPicks((p) => ({ ...p, [key]: pickFor(key) === id ? "" : id }));
  };

  const send = () => {
    for (const a of BALLOT) {
      const id = pickFor(a.key);
      if (id) castVote({ roundId: round.id, awardKey: a.key, nomineePlayer: id, voterAccount });
    }
    setSent(true);
  };

  const filled = BALLOT.filter((a) => pickFor(a.key)).length;

  if (sent) {
    return (
      <Shell onClose={onClose}>
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="text-5xl">🗳️</div>
          <h2 className="mt-3 font-anton text-3xl text-[#f4efe2]">Votes in</h2>
          <p className="mt-2 text-sm text-[#9fb6a6]">
            The awards drop when the round closes. Every one of them, in order, with receipts.
          </p>
          <button onClick={onClose} className="mt-7 rounded-full bg-accent px-7 py-3 font-black text-[#10271c]">
            Done
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell onClose={onClose}>
      <div className="px-5 pb-2 pt-5 text-center">
        <p className="font-anton text-[13px] tracking-[0.22em] text-accent">VOTE THE AWARDS</p>
        <p className="mt-0.5 text-[13px] font-bold text-[#9fb6a6]">{round.title}</p>
        <p className="mx-auto mt-2 max-w-xs text-xs text-[#9fb6a6]">
          Four quick calls. Where the scores saw something, it&apos;s pre-filled - change anything, then send it.
          Voting for yourself is allowed.
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-28 pt-2">
        {BALLOT.map((a) => {
          const pick = pickFor(a.key);
          const fromScores = !touched[a.key] && !picks[a.key] && suggested[a.key] != null && pick === suggested[a.key];
          return (
            <section key={a.key} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <div className="flex items-center gap-3">
                {a.badge ? (
                  <img src={a.badge} alt="" className="h-10 w-10 object-contain" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center text-2xl">{a.emoji}</span>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-anton text-lg leading-tight text-[#f4efe2]">{a.title}</h3>
                  <p className="text-xs text-[#9fb6a6]">{a.subtitle}</p>
                </div>
                {fromScores ? (
                  <span className="flex-none rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                    From the scores
                  </span>
                ) : null}
              </div>
              <div className="-mx-1 mt-3 flex gap-1 overflow-x-auto pb-1">
                {ordered.map((p) => {
                  const on = pick === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => choose(a.key, p.id)}
                      aria-pressed={on}
                      className={`flex w-[68px] flex-none flex-col items-center gap-1 rounded-xl px-1 py-2 transition ${
                        on ? "bg-accent/20 ring-2 ring-accent" : "bg-transparent"
                      }`}
                    >
                      <AvatarWithFrame
                        frameId={p.frameId}
                        avatarId={p.avatarId}
                        emoji={p.avatarEmoji}
                        name={p.name}
                        size={44}
                        playerId={p.id}
                      />
                      <span className={`w-full truncate text-center text-[11px] font-bold ${on ? "text-accent" : "text-[#cfe0d6]"}`}>
                        {p.id === voterPlayerId ? "Me" : p.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0a2419] via-[#0a2419] to-transparent px-5 pb-6 pt-6">
        <button
          onClick={send}
          disabled={filled === 0}
          className="w-full rounded-full bg-accent py-3.5 font-black text-[#10271c] disabled:opacity-40"
        >
          Send it{filled < BALLOT.length && filled > 0 ? ` (${filled} of ${BALLOT.length})` : ""}
        </button>
        <button onClick={onClose} className="mt-2 w-full text-center text-xs font-semibold text-[#7e978a]">
          Not now
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[130] flex justify-center bg-black/60 p-0 sm:p-4">
      <div className="relative flex w-full max-w-md flex-col overflow-hidden bg-[linear-gradient(180deg,#0f3d2b,#0a2419)] sm:rounded-3xl">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full bg-white/10 px-2.5 py-1 text-lg font-black text-white/80"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
