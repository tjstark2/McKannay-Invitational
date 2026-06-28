import { useState } from "react";
import type { Round } from "@/types/domain";
import { AvatarWithFrame } from "@/features/cosmetics/AvatarWithFrame";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { AWARDS } from "@/features/voting/awards";
import { roundAwardWinners } from "@/features/voting/tally";

export function RevealModal({
  round,
  onClose,
}: {
  round: Round;
  onClose: () => void;
}) {
  const { players, votes } = useTripState();
  const [idx, setIdx] = useState(0);

  const nameFor = (id: string) =>
    players.find((p) => p.id === id)?.name ?? "Someone";
  const playerFor = (id: string) => players.find((p) => p.id === id);

  const cover = idx === 0;
  const awardIdx = idx - 1;
  const done = awardIdx >= AWARDS.length;

  const next = () => setIdx((i) => i + 1);
  const back = () => setIdx((i) => Math.max(0, i - 1));

  return (
    <div className="fixed inset-0 z-[130] flex justify-center bg-black/60">
      <div className="relative flex w-full max-w-md flex-col overflow-hidden bg-[linear-gradient(180deg,#0f3d2b,#0a2419)]">
        {/* progress */}
        <div className="absolute left-3 right-3 top-3 z-20 flex gap-1">
          {Array.from({ length: AWARDS.length + 1 }).map((_, i) => (
            <span
              key={i}
              className="h-1 flex-1 rounded-full"
              style={{ background: i <= idx ? "#e7c869" : "rgba(255,255,255,0.2)" }}
            />
          ))}
        </div>
        {/* tap zones */}
        <div className="absolute inset-0 z-10 flex">
          <button className="flex-1" aria-label="Back" onClick={back} />
          <button
            className="flex-1"
            aria-label="Next"
            onClick={done ? onClose : next}
          />
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-6 z-30 rounded-full bg-white/10 px-2.5 py-1 text-lg font-black text-white/80"
        >
          ×
        </button>

        <div className="relative z-0 flex flex-1 flex-col items-center justify-center px-8 text-center text-[#f4efe2]">
          {cover ? (
            <>
              <div className="text-5xl">📣</div>
              <p className="mt-3 font-anton text-[15px] tracking-[0.2em] text-accent">
                RESULTS ARE IN
              </p>
              <h2 className="mt-1 font-anton text-3xl">{round.title} Awards</h2>
              <p className="mt-2 text-sm text-[#9fb6a6]">
                Tap to see who took each one.
              </p>
            </>
          ) : done ? (
            <>
              <div className="text-5xl">🏌️</div>
              <h2 className="mt-3 font-anton text-3xl">That&apos;s a wrap</h2>
              <p className="mt-2 text-sm text-[#9fb6a6]">
                On to the next round.
              </p>
              <button
                onClick={onClose}
                className="mt-6 rounded-full bg-accent px-7 py-3 font-black text-[#10271c]"
              >
                Done
              </button>
            </>
          ) : (
            (() => {
              const award = AWARDS[awardIdx];
              const result = roundAwardWinners(votes, round.id, award.key);
              return (
                <>
                  <img
                    src={award.badge}
                    alt=""
                    className="h-32 w-auto object-contain drop-shadow-[0_12px_14px_rgba(0,0,0,0.5)]"
                  />
                  <p className="mt-2 font-anton text-2xl">{award.title}</p>
                  {result.winnerIds.length === 0 ? (
                    <p className="mt-4 text-sm text-[#9fb6a6]">
                      No votes this round.
                    </p>
                  ) : (
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
                      {result.winnerIds.map((id) => {
                        const pl = playerFor(id);
                        return (
                          <div key={id} className="flex flex-col items-center gap-2">
                            <AvatarWithFrame
                              frameId={pl?.frameId}
                              avatarId={pl?.avatarId}
                              emoji={pl?.avatarEmoji}
                              name={nameFor(id)}
                              size={64}
                            />
                            <span className="font-anton text-xl">
                              {nameFor(id)}
                            </span>
                          </div>
                        );
                      })}
                      <p className="w-full text-xs text-[#9fb6a6]">
                        {result.winnerIds.length > 1 ? "Tied - " : ""}
                        {result.count} vote{result.count === 1 ? "" : "s"}
                      </p>
                    </div>
                  )}
                </>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}
