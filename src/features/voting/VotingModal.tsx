import { useMemo, useState } from "react";
import type { Player, Round, Vote } from "@/types/domain";
import { AvatarWithFrame } from "@/features/cosmetics/AvatarWithFrame";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { AWARDS, awardsForKeys } from "@/features/voting/awards";

export function VotingModal({
  round,
  voterAccount,
  voterPlayerId,
  onClose,
}: {
  round: Round;
  voterAccount: string;
  voterPlayerId: string | null;
  onClose: () => void;
}) {
  const { players, teams, votes, castVote } = useTripState();
  const awards = awardsForKeys(AWARDS.map((a) => a.key));

  const [idx, setIdx] = useState(0);
  const [team, setTeam] = useState<"all" | string>("all");

  // Players you can vote for: everyone except yourself.
  const eligible = useMemo(
    () => players.filter((p) => p.id !== voterPlayerId),
    [players, voterPlayerId]
  );

  // Your existing picks for this round (so re-opening shows them).
  const myVotes = useMemo(() => {
    const map: Record<string, string> = {};
    votes
      .filter(
        (v: Vote) => v.roundId === round.id && v.voterAccount === voterAccount
      )
      .forEach((v) => (map[v.awardKey] = v.nomineePlayer));
    return map;
  }, [votes, round.id, voterAccount]);

  const teamLabel = (code: string) =>
    teams.find((t) => t.id === code)?.name ?? `Team ${code}`;

  if (idx >= awards.length) {
    return (
      <Shell onClose={onClose}>
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="text-5xl">🏆</div>
          <h2 className="mt-3 font-anton text-3xl text-[#f4efe2]">Votes in!</h2>
          <p className="mt-2 text-sm text-[#9fb6a6]">
            Winners are revealed when the round wraps - you&apos;ll see who took
            each award next time you open the tournament.
          </p>
          <button
            onClick={onClose}
            className="mt-7 rounded-full bg-accent px-7 py-3 font-black text-[#10271c]"
          >
            Done
          </button>
        </div>
      </Shell>
    );
  }

  const award = awards[idx];
  const visible =
    team === "all" ? eligible : eligible.filter((p) => p.team === team);

  const teamCodes = Array.from(new Set(teams.map((t) => t.id))).sort();

  const advance = () => {
    setTeam("all");
    setIdx((i) => i + 1);
  };
  const vote = (nominee: string) => {
    castVote({
      roundId: round.id,
      awardKey: award.key,
      nomineePlayer: nominee,
      voterAccount,
    });
    setTimeout(advance, 180);
  };

  return (
    <Shell onClose={onClose}>
      <div className="px-5 pt-5 text-center">
        <p className="font-anton text-[13px] tracking-[0.22em] text-accent">
          POST-ROUND AWARDS
        </p>
        <p className="mt-0.5 text-[13px] font-bold text-[#9fb6a6]">
          {round.title}
        </p>
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {awards.map((a, i) => (
            <span
              key={a.key}
              className="h-2 rounded-full"
              style={{
                width: i === idx ? 10 : 8,
                background:
                  a.key in myVotes
                    ? "#34d399"
                    : i === idx
                    ? "#e7c869"
                    : "rgba(255,255,255,0.18)",
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-1 flex justify-center">
        <img
          src={award.badge}
          alt=""
          className="h-28 w-auto object-contain drop-shadow-[0_12px_14px_rgba(0,0,0,0.5)]"
        />
      </div>
      <h2 className="px-6 text-center font-anton text-2xl text-[#f4efe2]">
        {award.title}
      </h2>
      <p className="mx-auto mt-1 max-w-xs px-4 text-center text-sm text-[#9fb6a6]">
        {award.subtitle}
      </p>

      <div className="mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
        <Chip on={team === "all"} onClick={() => setTeam("all")}>
          All {eligible.length}
        </Chip>
        {teamCodes.map((c) => (
          <Chip key={c} on={team === c} onClick={() => setTeam(c)}>
            {teamLabel(c)}
          </Chip>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-2 content-start gap-3 overflow-y-auto px-5 pb-4 pt-1">
        {visible.map((p) => {
          const selected = myVotes[award.key] === p.id;
          return (
            <button
              key={p.id}
              onClick={() => vote(p.id)}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-3 ${
                selected
                  ? "border-accent bg-accent/15"
                  : "border-white/10 bg-white/[0.04]"
              }`}
            >
              <AvatarWithFrame
                frameId={p.frameId}
                avatarId={p.avatarId}
                emoji={p.avatarEmoji}
                name={p.name}
                size={52}
              />
              <span className="text-sm font-bold text-[#f4efe2]">{p.name}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={advance}
        className="pb-6 pt-1 text-center text-sm font-semibold text-[#7e978a]"
      >
        Skip this one →
      </button>
    </Shell>
  );
}

function Shell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
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

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-none whitespace-nowrap rounded-full border px-3.5 py-1.5 font-anton text-xs tracking-wide ${
        on
          ? "border-accent bg-accent text-[#10271c]"
          : "border-white/20 bg-white/5 text-[#cfe0d6]"
      }`}
    >
      {children}
    </button>
  );
}
