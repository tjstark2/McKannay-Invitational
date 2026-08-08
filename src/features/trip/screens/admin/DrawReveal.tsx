"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PlayerAvatar } from "@/features/avatar/PlayerAvatar";
import type { Player, Team, TeamId } from "@/types";
import type { DrawMatch, DrawMethod, DraftLogEntry } from "@/features/trip/draw/drawCompute";

const MASCOT_EMOJI: Record<string, string> = {
  slot: "🎰",
  hat: "🎩",
  wheel: "🎡",
  draft: "🪙",
};

// Mascot art drops in at /public/draw/img_<method>.png; falls back to emoji.
function Mascot({ method, size = 84 }: { method: DrawMethod; size?: number }) {
  const [failed, setFailed] = useState(false);
  const emoji = MASCOT_EMOJI[method] ?? "🎲";
  if (failed) return <div style={{ fontSize: size * 0.7, lineHeight: 1 }}>{emoji}</div>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/draw/img_${method}.png`}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}

function teamColor(t: TeamId) {
  return t === "A" ? "#e5484d" : "#3b82f6";
}

function Chip({ p, size = 30 }: { p?: Player; size?: number }) {
  if (!p) return <span className="text-slate-300">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <PlayerAvatar avatarId={p.avatarId} emoji={p.avatarEmoji} name={p.name} size={size} ring={teamColor(p.team)} />
      <span className="font-bold">{p.name}</span>
    </span>
  );
}

export function DrawReveal({
  method,
  board,
  players,
  teams,
  coinWinner,
  draftLog,
  onDone,
}: {
  method: DrawMethod;
  board: DrawMatch[];
  players: Player[];
  teams: Team[];
  coinWinner?: TeamId | null;
  draftLog?: DraftLogEntry[];
  onDone: () => void;
}) {
  const byId = useMemo(() => {
    const m = new Map<string, Player>();
    players.forEach((p) => m.set(p.id, p));
    return m;
  }, [players]);
  const P = (id: string) => byId.get(id);
  const teamAName = teams.find((t) => t.id === "A")?.name ?? "Team A";
  const teamBName = teams.find((t) => t.id === "B")?.name ?? "Team B";

  return (
    <div className="text-center">
      <style>{`
        @keyframes tb-pop { 0%{transform:scale(.4);opacity:0} 60%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
        @keyframes tb-shake { 0%,100%{transform:rotate(-6deg)} 50%{transform:rotate(6deg)} }
        @keyframes tb-coin { 0%{transform:rotateX(0)} 100%{transform:rotateX(1800deg)} }
        .tb-pop{animation:tb-pop .5s ease both}
        .tb-shake{animation:tb-shake .5s ease-in-out infinite}
      `}</style>

      <div className="mb-2 flex flex-col items-center">
        <div className={method === "hat" ? "tb-shake" : ""}>
          <Mascot method={method} />
        </div>
      </div>

      {method === "slot" ? (
        <SlotReveal board={board} P={P} onDone={onDone} />
      ) : method === "hat" ? (
        <HatReveal board={board} P={P} onDone={onDone} />
      ) : method === "wheel" ? (
        <WheelReveal board={board} P={P} onDone={onDone} />
      ) : method === "draft" ? (
        <DraftReveal
          board={board}
          P={P}
          coinWinner={coinWinner ?? "A"}
          draftLog={draftLog ?? []}
          teamAName={teamAName}
          teamBName={teamBName}
          onDone={onDone}
        />
      ) : null}
    </div>
  );
}

// --------------------------------------------------------------------------
// SLOT — each match's opponent flickers through names, then locks (staggered).
// --------------------------------------------------------------------------
function SlotReveal({ board, P, onDone }: { board: DrawMatch[]; P: (id: string) => Player | undefined; onDone: () => void }) {
  const [locked, setLocked] = useState<boolean[]>(() => board.map(() => false));
  const [tick, setTick] = useState(0);
  const allBUnits = board.map((m) => m.b);

  useEffect(() => {
    const flicker = setInterval(() => setTick((t) => t + 1), 80);
    const timers = board.map((_, i) =>
      setTimeout(() => {
        setLocked((prev) => {
          const next = prev.slice();
          next[i] = true;
          return next;
        });
      }, 900 + i * 750)
    );
    const doneAt = setTimeout(() => clearInterval(flicker), 900 + board.length * 750);
    return () => {
      clearInterval(flicker);
      timers.forEach(clearTimeout);
      clearTimeout(doneAt);
    };
  }, [board.length]);

  const allLocked = locked.every(Boolean);

  return (
    <div>
      <div className="space-y-2">
        {board.map((m, i) => {
          const spin = allBUnits[(i + tick) % allBUnits.length];
          const show = locked[i] ? m.b : spin;
          return (
            <div key={i} className={`rounded-2xl border-2 p-3 ${locked[i] ? "border-accent bg-accent/10" : "border-sand-200 bg-white"}`}>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="flex flex-col items-end gap-0.5 text-team-north">
                  {m.a.map((id) => <Chip key={id} p={P(id)} />)}
                </div>
                <span className="font-anton text-sm text-slate-400">VS</span>
                <div className={`flex flex-col items-start gap-0.5 text-team-south ${locked[i] ? "" : "blur-[1px] opacity-70"}`}>
                  {show.map((id, k) => <Chip key={`${id}-${k}`} p={P(id)} />)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {allLocked ? (
        <button onClick={onDone} className="mt-5 w-full rounded-2xl bg-fairway-900 px-4 py-3.5 font-black text-white">
          See the board ▸
        </button>
      ) : null}
    </div>
  );
}

// --------------------------------------------------------------------------
// HAT — matches pop out of the hat one at a time.
// --------------------------------------------------------------------------
function HatReveal({ board, P, onDone }: { board: DrawMatch[]; P: (id: string) => Player | undefined; onDone: () => void }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const timers = board.map((_, i) => setTimeout(() => setShown((s) => Math.max(s, i + 1)), 600 + i * 750));
    return () => timers.forEach(clearTimeout);
  }, [board.length]);
  const done = shown >= board.length;
  return (
    <div>
      <div className="space-y-2">
        {board.map((m, i) =>
          i < shown ? (
            <div key={i} className="tb-pop rounded-2xl border-2 border-sand-200 bg-white p-3">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="flex flex-col items-end gap-0.5">{m.a.map((id) => <Chip key={id} p={P(id)} />)}</div>
                <span className="font-anton text-sm text-slate-400">VS</span>
                <div className="flex flex-col items-start gap-0.5">{m.b.map((id) => <Chip key={id} p={P(id)} />)}</div>
              </div>
            </div>
          ) : (
            <div key={i} className="rounded-2xl border-2 border-dashed border-sand-200 p-3 text-sm text-slate-300">
              …
            </div>
          )
        )}
      </div>
      {done ? (
        <button onClick={onDone} className="mt-5 w-full rounded-2xl bg-fairway-900 px-4 py-3.5 font-black text-white">
          See the board ▸
        </button>
      ) : null}
    </div>
  );
}

// --------------------------------------------------------------------------
// WHEEL — a wheel of opponents spins and lands, filling one match at a time.
// --------------------------------------------------------------------------
function WheelReveal({ board, P, onDone }: { board: DrawMatch[]; P: (id: string) => Player | undefined; onDone: () => void }) {
  const [rotation, setRotation] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const spinning = useRef(false);
  const n = board.length;
  const seg = 360 / Math.max(1, n);

  useEffect(() => {
    if (spinning.current) return;
    spinning.current = true;
    let i = 0;
    const spinNext = () => {
      if (i >= n) return;
      // Land segment i at the top pointer (0deg), plus a few full turns.
      const target = 360 * 4 * (i + 1) - (i * seg + seg / 2);
      setRotation(target);
      setTimeout(() => {
        setRevealed(i + 1);
        i += 1;
        if (i < n) setTimeout(spinNext, 500);
      }, 1900);
    };
    const start = setTimeout(spinNext, 400);
    return () => clearTimeout(start);
  }, [n, seg]);

  const done = revealed >= n;
  const label = (unit: string[]) => unit.map((id) => P(id)?.name?.split(" ")[0] ?? "?").join(" & ");

  return (
    <div>
      <div className="relative mx-auto mb-4 h-56 w-56">
        <div className="absolute left-1/2 top-[-6px] z-10 -translate-x-1/2 text-2xl">▼</div>
        <div
          className="h-56 w-56 rounded-full border-4 border-fairway-900 shadow-inner"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: "transform 1.8s cubic-bezier(.15,.85,.25,1)",
            background: `conic-gradient(${board
              .map((m, i) => `${i % 2 ? "#dff3ea" : "#c9e9db"} ${i * seg}deg ${(i + 1) * seg}deg`)
              .join(",")})`,
          }}
        >
          {board.map((m, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 origin-left text-[11px] font-black text-fairway-900"
              style={{ transform: `rotate(${i * seg + seg / 2}deg) translateX(28px)` }}
            >
              {label(m.b)}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {board.map((m, i) => (
          <div key={i} className={`rounded-2xl border-2 p-3 ${i < revealed ? "border-accent bg-accent/10 tb-pop" : "border-dashed border-sand-200 opacity-50"}`}>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="flex flex-col items-end gap-0.5">{m.a.map((id) => <Chip key={id} p={P(id)} />)}</div>
              <span className="font-anton text-sm text-slate-400">VS</span>
              <div className="flex flex-col items-start gap-0.5">
                {i < revealed ? m.b.map((id) => <Chip key={id} p={P(id)} />) : <span className="text-slate-300">spinning…</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {done ? (
        <button onClick={onDone} className="mt-5 w-full rounded-2xl bg-fairway-900 px-4 py-3.5 font-black text-white">
          See the board ▸
        </button>
      ) : null}
    </div>
  );
}

// --------------------------------------------------------------------------
// DRAFT — coin toss, then the pick timeline reveals one entry at a time.
// --------------------------------------------------------------------------
function DraftReveal({
  board,
  P,
  coinWinner,
  draftLog,
  teamAName,
  teamBName,
  onDone,
}: {
  board: DrawMatch[];
  P: (id: string) => Player | undefined;
  coinWinner: TeamId;
  draftLog: DraftLogEntry[];
  teamAName: string;
  teamBName: string;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<"coin" | "picks">("coin");
  const [shown, setShown] = useState(0);
  const winnerName = coinWinner === "A" ? teamAName : teamBName;

  useEffect(() => {
    const toPicks = setTimeout(() => setPhase("picks"), 2200);
    return () => clearTimeout(toPicks);
  }, []);

  useEffect(() => {
    if (phase !== "picks") return;
    const timers = draftLog.map((_, i) => setTimeout(() => setShown((s) => Math.max(s, i + 1)), 500 + i * 650));
    return () => timers.forEach(clearTimeout);
  }, [phase, draftLog.length]);

  const done = phase === "picks" && shown >= draftLog.length;
  void board;

  return (
    <div>
      {phase === "coin" ? (
        <div className="py-6">
          <div
            className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-accent text-3xl font-black text-ink shadow-lg"
            style={{ animation: "tb-coin 2s cubic-bezier(.2,.7,.2,1) both" }}
          >
            🪙
          </div>
          <p className="mt-3 font-black text-fairway-900">Flipping for first pick…</p>
        </div>
      ) : (
        <div>
          <p className="mb-3 rounded-full bg-fairway-900 px-3 py-1.5 text-sm font-black text-white">
            {winnerName} won the toss - picks first
          </p>
          <div className="space-y-1.5 text-left">
            {draftLog.slice(0, shown).map((e, i) => (
              <div key={i} className="tb-pop flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm">
                <span className="text-[11px] font-black uppercase" style={{ color: teamColor(e.captainTeamId) }}>
                  {e.captainTeamId === "A" ? teamAName : teamBName}
                </span>
                <span className="text-slate-400">{e.verb}</span>
                <Chip p={P(e.playerId)} size={24} />
                {e.locks ? <span className="ml-auto text-xs font-black text-accent-dark">Match {e.matchNo} set</span> : null}
              </div>
            ))}
          </div>
          {done ? (
            <button onClick={onDone} className="mt-5 w-full rounded-2xl bg-fairway-900 px-4 py-3.5 font-black text-white">
              See the board ▸
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
