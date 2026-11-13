"use client";

// The awards reveal: one at a time, tap to flip.
//
// Each award shows its title first - "and it goes to..." - and only the next
// tap shows who. The group's votes go first as a warm-up, then the awards the
// scores proved, smallest to biggest, so the round's headline lands last.

import { useEffect, useMemo, useState } from "react";
import type { Round } from "@/types/domain";
import { AvatarWithFrame } from "@/features/cosmetics/AvatarWithFrame";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchRoundAwards, type RoundAward } from "@/lib/supabase/roundAwards";
import { BALLOT, MOMENT_EMOJI, awardDef } from "@/features/voting/awards";
import { roundAwardWinners } from "@/features/voting/tally";
import { revealOrder, type RevealCard } from "@/features/awards/vote";

export function AwardsReveal({ round, onClose }: { round: Round; onClose: () => void }) {
  const { players, votes } = useTripState();
  const [proven, setProven] = useState<RoundAward[] | null>(null);
  // -1 is the cover. Each card has two steps: the tease, then the winner.
  const [idx, setIdx] = useState(-1);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setProven([]);
      return;
    }
    let cancelled = false;
    fetchRoundAwards(supabase, round.id)
      .then((rows) => !cancelled && setProven(rows))
      .catch(() => !cancelled && setProven([]));
    return () => {
      cancelled = true;
    };
  }, [round.id]);

  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "Someone";

  const cards: RevealCard[] = useMemo(() => {
    if (proven === null) return [];
    const voted = BALLOT.map((a) => {
      const w = roundAwardWinners(votes, round.id, a.key);
      return { key: a.key, title: a.title, winnerIds: w.winnerIds, count: w.count };
    });
    return revealOrder(proven, voted, nameOf, round.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proven, votes, round.id, players]);

  const empty = proven !== null && cards.length === 0;

  const done = idx >= cards.length;
  const card = idx >= 0 && !done ? cards[idx] : null;
  const isLast = idx === cards.length - 1;

  const next = () => {
    if (proven === null) return;
    if (done || empty) return onClose();
    if (card && !shown) return setShown(true);
    setShown(false);
    setIdx((i) => i + 1);
  };
  const back = () => {
    if (shown) return setShown(false);
    setIdx((i) => Math.max(-1, i - 1));
  };

  return (
    <div className="fixed inset-0 z-[130] flex justify-center bg-black/70">
      <div className="relative flex w-full max-w-md flex-col overflow-hidden bg-[radial-gradient(120%_80%_at_50%_0%,#1a4630_0%,#103022_45%,#0a2017_100%)]">
        <div className="absolute left-3 right-12 top-4 z-20 flex gap-1">
          {cards.map((c, i) => (
            <span
              key={c.key}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{ background: i < idx || (i === idx && shown) ? "#e7c869" : i === idx ? "rgba(231,200,105,0.45)" : "rgba(255,255,255,0.18)" }}
            />
          ))}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-2 z-30 rounded-full bg-white/10 px-2.5 py-1 text-lg font-black text-white/80"
        >
          ×
        </button>

        {/* Tap zones: left third goes back, the rest goes forward. */}
        <div className="absolute inset-0 z-10 flex">
          <button className="w-1/3" aria-label="Back" onClick={back} />
          <button className="flex-1" aria-label="Next" onClick={next} />
        </div>

        <div className="pointer-events-none relative z-0 flex flex-1 flex-col items-center justify-center px-8 text-center text-[#f4efe2]">
          {empty ? (
            <Pop k="empty">
              <div className="text-5xl">🦗</div>
              <h2 className="mt-3 font-anton text-3xl">No awards yet</h2>
              <p className="mt-2 text-sm text-[#9fb6a6]">
                Nothing has been handed out for {round.title}. An organizer can build them from the Schedule.
              </p>
            </Pop>
          ) : idx === -1 ? (
            <Pop k="cover">
              <div className="text-6xl">🏆</div>
              <p className="mt-4 font-anton text-[15px] tracking-[0.22em] text-accent">THE AWARDS ARE IN</p>
              <h2 className="mt-1 font-anton text-4xl leading-none">{round.title}</h2>
              <p className="mt-3 text-sm text-[#9fb6a6]">
                {proven === null ? "Counting the damage..." : `${cards.length} awards. Tap to start.`}
              </p>
            </Pop>
          ) : done ? (
            <Pop k="done">
              <div className="text-5xl">🏌️</div>
              <h2 className="mt-3 font-anton text-3xl">That&apos;s a wrap</h2>
              <p className="mt-2 text-sm text-[#9fb6a6]">Screenshot it. Send it to the group chat. Show no mercy.</p>
              <p className="mt-6 rounded-full bg-accent px-7 py-3 font-black text-[#10271c]">Done</p>
            </Pop>
          ) : card ? (
            <Pop k={`${card.key}:${shown ? "won" : "tease"}`}>
              <Badge card={card} big={!shown} />
              <p className="mt-3 font-anton text-[12px] tracking-[0.22em] text-accent">
                {card.voted ? "VOTED BY THE GROUP" : isLast ? "THE HEADLINER" : "PROVEN BY THE SCORES"}
              </p>
              <h2 className="mt-1 font-anton text-3xl leading-tight">{card.title}</h2>
              {!shown ? (
                <p className="mt-6 text-sm text-[#9fb6a6]">And it goes to...</p>
              ) : (
                <>
                  <div className="mt-5 flex flex-wrap items-start justify-center gap-4">
                    {card.playerIds.map((id) => {
                      const p = players.find((x) => x.id === id);
                      return (
                        <div key={id} className="flex flex-col items-center gap-2">
                          <AvatarWithFrame
                            frameId={p?.frameId}
                            avatarId={p?.avatarId}
                            emoji={p?.avatarEmoji}
                            name={nameOf(id)}
                            size={card.playerIds.length > 1 ? 60 : 84}
                            playerId={p?.id}
                          />
                          <span className="font-anton text-2xl leading-none">{nameOf(id)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-5 text-lg font-semibold leading-snug">{card.line}</p>
                  <p className="mt-3 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-[#cfe0d6]">{card.stat}</p>
                </>
              )}
            </Pop>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Badge({ card, big }: { card: RevealCard; big: boolean }) {
  const def = awardDef(card.key);
  if (def?.badge) {
    return <img src={def.badge} alt="" className={`${big ? "h-36" : "h-20"} w-auto object-contain drop-shadow-[0_12px_14px_rgba(0,0,0,0.5)]`} />;
  }
  const emoji = def?.emoji ?? MOMENT_EMOJI[card.key] ?? "🏆";
  return <div className={big ? "text-8xl" : "text-5xl"}>{emoji}</div>;
}

/** Fades and scales its content in each time `k` changes. */
function Pop({ k, children }: { k: string; children: React.ReactNode }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(false);
    const t = setTimeout(() => setOn(true), 20);
    return () => clearTimeout(t);
  }, [k]);
  return (
    <div
      className={`flex flex-col items-center transition-all duration-500 ease-out ${
        on ? "scale-100 opacity-100" : "scale-90 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}
