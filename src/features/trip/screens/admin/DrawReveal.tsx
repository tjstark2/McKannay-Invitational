"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlayerAvatar } from "@/features/avatar/PlayerAvatar";
import type { Player, Team, TeamId } from "@/types";
import type { DrawMatch, DrawMethod, DraftLogEntry } from "@/features/trip/draw/drawCompute";

/* ------------------------------------------------------------------ shared */

const RED = "#e5484d";
const BLUE = "#3b82f6";
const teamColor = (t: TeamId) => (t === "A" ? RED : BLUE);

const MASCOT_EMOJI: Record<string, string> = { slot: "🎰", hat: "🎩", wheel: "🎡", draft: "🪙" };

function Mascot({ method, size = 64 }: { method: DrawMethod; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return <div style={{ fontSize: size * 0.7, lineHeight: 1 }}>{MASCOT_EMOJI[method] ?? "🎲"}</div>;
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

const STYLES = `
@keyframes tb-pop{0%{transform:scale(.3);opacity:0}60%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
@keyframes tb-shake{0%,100%{transform:rotate(-7deg) translateY(0)}50%{transform:rotate(7deg) translateY(-4px)}}
@keyframes tb-rise{0%{transform:translateY(34px) scale(.7);opacity:0}100%{transform:translateY(0) scale(1);opacity:1}}
@keyframes tb-flip{0%{transform:rotateX(0)}100%{transform:rotateX(2160deg)}}
@keyframes tb-glow{0%,100%{box-shadow:0 0 0 0 rgba(243,181,10,0)}50%{box-shadow:0 0 26px 6px rgba(243,181,10,.75)}}
@keyframes tb-bulb{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes tb-flash{0%,100%{opacity:0}50%{opacity:.85}}
.tb-pop{animation:tb-pop .45s cubic-bezier(.2,1.5,.4,1) both}
.tb-shake{animation:tb-shake .38s ease-in-out infinite}
.tb-rise{animation:tb-rise .5s cubic-bezier(.2,1.3,.4,1) both}
.tb-glow{animation:tb-glow 1.1s ease-in-out infinite}
`;

function Chip({ p, size = 26 }: { p?: Player; size?: number }) {
  if (!p) return <span className="text-white/40">-</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <PlayerAvatar avatarId={p.avatarId} emoji={p.avatarEmoji} name={p.name} size={size} ring={teamColor(p.team)} />
      <span className="font-black">{p.name}</span>
    </span>
  );
}

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-3xl p-4"
      style={{ background: "linear-gradient(165deg,#0b3b2e,#071a13)", color: "#fff" }}
    >
      <style>{STYLES}</style>
      {children}
    </div>
  );
}

function DoneButton({ onDone, label = "See the board" }: { onDone: () => void; label?: string }) {
  return (
    <button
      onClick={onDone}
      className="mt-4 w-full rounded-2xl bg-accent px-4 py-3.5 font-black text-ink tb-glow"
    >
      {label} ▸
    </button>
  );
}


/** Seat order used by slot, hat and wheel: alternate teams, one player at a
 *  time, match by match. For a 2v2 that reads A, B, A, B - so each pull swaps
 *  which team is on the hook. */
type Seat = { matchIndex: number; side: "a" | "b"; slot: number; playerId: string };

function seatOrder(board: DrawMatch[]): Seat[] {
  const seq: Seat[] = [];
  board.forEach((m, i) => {
    const depth = Math.max(m.a.length, m.b.length);
    for (let k = 0; k < depth; k++) {
      if (m.a[k]) seq.push({ matchIndex: i, side: "a", slot: k, playerId: m.a[k] });
      if (m.b[k]) seq.push({ matchIndex: i, side: "b", slot: k, playerId: m.b[k] });
    }
  });
  return seq;
}

/** The board as filled so far, for the running scoreboard under each draw. */
function FillingBoard({
  board,
  seats,
  placed,
  P,
}: {
  board: DrawMatch[];
  seats: Seat[];
  placed: number;
  P: (id: string) => Player | undefined;
}) {
  return (
    <div className="mt-2 space-y-1.5 text-left">
      {board.map((_, i) => {
        const got = (side: "a" | "b") =>
          seats.slice(0, placed).filter((s) => s.matchIndex === i && s.side === side).map((s) => s.playerId);
        const A = got("a");
        const B = got("b");
        const live = seats[placed]?.matchIndex === i;
        return (
          <div
            key={i}
            className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl px-3 py-2 text-[13px]"
            style={{
              background: A.length + B.length > 0 ? "rgba(243,181,10,.12)" : "rgba(255,255,255,.04)",
              border: live ? "1.5px solid #f3b50a" : "1.5px solid transparent",
            }}
          >
            <div className="flex flex-col items-end gap-0.5">
              {A.length ? A.map((id) => <Chip key={id} p={P(id)} size={22} />) : <span className="text-white/25">-</span>}
            </div>
            <span className="font-anton text-[11px] text-white/40">VS</span>
            <div className="flex flex-col items-start gap-0.5">
              {B.length ? B.map((id) => <Chip key={id} p={P(id)} size={22} />) : <span className="text-white/25">-</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ export */

export function DrawReveal({
  method,
  board,
  players,
  teams,
  coinWinner,
  draftLog,
  onDone,
  onDraftResult,
}: {
  method: DrawMethod;
  board: DrawMatch[];
  players: Player[];
  teams: Team[];
  coinWinner?: TeamId | null;
  draftLog?: DraftLogEntry[];
  onDone: () => void;
  /** Captain's Draft is interactive, so it hands back the board the room built. */
  onDraftResult?: (b: DrawMatch[]) => void;
}) {
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const P = useCallback((id: string) => byId.get(id), [byId]);
  const teamAName = teams.find((t) => t.id === "A")?.name ?? "Team A";
  const teamBName = teams.find((t) => t.id === "B")?.name ?? "Team B";

  return (
    <div>
      {method === "slot" ? <SlotReveal board={board} P={P} onDone={onDone} /> : null}
      {method === "hat" ? <HatReveal board={board} P={P} onDone={onDone} /> : null}
      {method === "wheel" ? <WheelReveal board={board} P={P} onDone={onDone} /> : null}
      {method === "draft" ? (
        <DraftReveal
          board={board}
          players={players}
          P={P}
          coinWinner={coinWinner ?? "A"}
          draftLog={draftLog ?? []}
          teamAName={teamAName}
          teamBName={teamBName}
          onDone={onDone}
          onDraftResult={onDraftResult}
        />
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------- SLOT MACHINE
   One name per pull. The reel spins through everyone still to be drawn, the
   lever slams it to a stop, and that player drops into the next open seat -
   which alternates teams as it goes. */

function SlotReveal({
  board,
  P,
  onDone,
}: {
  board: DrawMatch[];
  P: (id: string) => Player | undefined;
  onDone: () => void;
}) {
  const seats = useMemo(() => seatOrder(board), [board]);
  const [placed, setPlaced] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [face, setFace] = useState<string | null>(null);
  const [landed, setLanded] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const remaining = useMemo(() => seats.slice(placed).map((s) => s.playerId), [seats, placed]);
  const next = seats[placed];
  const done = placed >= seats.length;

  function pull() {
    if (spinning || done) return;
    setSpinning(true);
    setLanded(null);
    let i = 0;
    timer.current = setInterval(() => {
      i += 1;
      setFace(remaining[i % remaining.length]);
    }, 60);
    setTimeout(() => {
      if (timer.current) clearInterval(timer.current);
      setFace(next.playerId);
      setLanded(next.playerId);
      if (navigator.vibrate) navigator.vibrate(40);
      setTimeout(() => {
        setPlaced((p) => p + 1);
        setSpinning(false);
        setLanded(null);
      }, 750);
    }, 1500);
  }

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const shown = face ?? remaining[0];
  const shownPlayer = shown ? P(shown) : undefined;

  return (
    <Stage>
      <div className="mb-2 flex items-center justify-center gap-2">
        <Mascot method="slot" size={46} />
        <p className="font-anton text-xl tracking-widest text-accent">
          {remaining.length} left to draw
        </p>
      </div>

      <div className="flex items-stretch gap-2">
        <div
          className="flex-1 rounded-2xl p-3"
          style={{
            background: "linear-gradient(180deg,#2a2a2e,#141416)",
            border: "3px solid #b9bcc4",
            boxShadow: "inset 0 2px 12px rgba(0,0,0,.75)",
          }}
        >
          <p className="mb-1 text-center text-[10px] font-black uppercase tracking-widest text-white/35">
            {next ? `${next.side === "a" ? "Team A" : "Team B"} - match ${next.matchIndex + 1}` : "complete"}
          </p>
          <div
            className="flex h-16 items-center justify-center rounded-xl"
            style={{
              background: landed ? "rgba(243,181,10,.2)" : "rgba(255,255,255,.05)",
              border: landed ? "2px solid #f3b50a" : "2px solid rgba(255,255,255,.08)",
              filter: spinning && !landed ? "blur(1.4px)" : "none",
              transition: "filter .15s",
            }}
          >
            {shownPlayer ? (
              <span className="font-anton text-2xl tracking-wide" style={{ color: teamColor(shownPlayer.team) }}>
                {shownPlayer.name}
              </span>
            ) : (
              <span className="text-white/30">-</span>
            )}
          </div>
        </div>

        <button onClick={pull} disabled={spinning || done} className="relative w-9 shrink-0" aria-label="Pull the lever">
          <div className="absolute left-1/2 top-3 h-20 w-1.5 -translate-x-1/2 rounded-full bg-[#b9bcc4]" />
          <div
            className="absolute left-1/2 h-7 w-7 -translate-x-1/2 rounded-full"
            style={{
              top: spinning ? 78 : 4,
              background: "radial-gradient(circle at 35% 30%, #ff6b6b, #b3261e)",
              boxShadow: "0 3px 8px rgba(0,0,0,.5)",
              transition: "top .35s cubic-bezier(.3,1.4,.5,1)",
            }}
          />
        </button>
      </div>

      <FillingBoard board={board} seats={seats} placed={placed} P={P} />

      {!done ? (
        <button
          onClick={pull}
          disabled={spinning}
          className="mt-4 w-full rounded-2xl bg-accent px-4 py-3.5 font-black text-ink disabled:opacity-60"
        >
          {spinning ? "Spinning…" : "Pull the lever 🎰"}
        </button>
      ) : (
        <DoneButton onDone={onDone} />
      )}
    </Stage>
  );
}

/* ------------------------------------------------------------------ THE HAT
   One folded slip per pull. The hat shakes, the bird dips in, the slip rises
   and unfolds into a single name, and that name takes the next seat. */

function HatReveal({
  board,
  P,
  onDone,
}: {
  board: DrawMatch[];
  P: (id: string) => Player | undefined;
  onDone: () => void;
}) {
  const seats = useMemo(() => seatOrder(board), [board]);
  const [placed, setPlaced] = useState(0);
  const [dipping, setDipping] = useState(false);
  const [slip, setSlip] = useState<string | null>(null);

  const next = seats[placed];
  const done = placed >= seats.length;

  function pull() {
    if (dipping || done) return;
    setDipping(true);
    setSlip(null);
    if (navigator.vibrate) navigator.vibrate(25);
    setTimeout(() => {
      setSlip(next.playerId);
      setDipping(false);
      setTimeout(() => {
        setPlaced((p) => p + 1);
        setSlip(null);
      }, 900);
    }, 700);
  }

  const slipPlayer = slip ? P(slip) : undefined;

  return (
    <Stage>
      <div className="text-center">
        <div className="relative mx-auto h-[128px] w-[190px]">
          <div className={dipping ? "tb-shake" : ""} style={{ transformOrigin: "50% 80%" }}>
            <div className="absolute left-1/2 top-5 h-[70px] w-[108px] -translate-x-1/2 rounded-t-[14px] bg-[#15151a]" />
            <div className="absolute left-1/2 top-[70px] h-4 w-[108px] -translate-x-1/2 bg-[#f3b50a]" />
            <div className="absolute left-1/2 top-[82px] h-5 w-[180px] -translate-x-1/2 rounded-[50%] bg-[#0f0f13]" />
            <div className="absolute left-1/2 top-[20px] h-4 w-[108px] -translate-x-1/2 rounded-[50%] bg-[#06060a]" />
          </div>
          <div
            className="absolute right-0 top-0"
            style={{
              transform: dipping ? "translateY(18px) rotate(-14deg)" : "none",
              transition: "transform .35s cubic-bezier(.3,1.3,.5,1)",
            }}
          >
            <Mascot method="hat" size={58} />
          </div>
          {slipPlayer ? (
            <div
              className="tb-rise absolute left-1/2 top-0 -translate-x-1/2 rounded-lg px-4 py-2"
              style={{ background: "#faf6e8", color: "#0b2418", boxShadow: "0 6px 18px rgba(0,0,0,.45)" }}
            >
              <span className="font-anton text-xl" style={{ color: teamColor(slipPlayer.team) }}>
                {slipPlayer.name}
              </span>
            </div>
          ) : null}
        </div>

        <p className="text-[11px] font-black uppercase tracking-widest text-white/45">
          {next ? `Next out: ${next.side === "a" ? "Team A" : "Team B"}` : "Hat is empty"} · {seats.length - placed} left
        </p>

        <FillingBoard board={board} seats={seats} placed={placed} P={P} />

        {!done ? (
          <button
            onClick={pull}
            disabled={dipping}
            className="mt-4 w-full rounded-2xl bg-accent px-4 py-3.5 font-black text-ink disabled:opacity-60"
          >
            {dipping ? "Reaching in…" : "Pull a name out 🎩"}
          </button>
        ) : (
          <DoneButton onDone={onDone} />
        )}
      </div>
    </Stage>
  );
}

/* ---------------------------------------------------------------- THE WHEEL
   Every player starts on the wheel. Each spin lands on someone, they leave the
   wheel and drop into the next open slot, and the wheel is redrawn smaller. In
   a 2v2 round the first two off the wheel are partners. */

function WheelReveal({
  board,
  P,
  onDone,
}: {
  board: DrawMatch[];
  P: (id: string) => Player | undefined;
  onDone: () => void;
}) {
  // The order every seat gets filled: match 1 side A, side B, match 2 ...
  const order = useMemo(() => seatOrder(board), [board]);

  const [placed, setPlaced] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);

  const remaining = useMemo(() => order.slice(placed).map((o) => o.playerId), [order, placed]);
  const pairSize = board[0]?.a.length ?? 1;

  function spin() {
    if (spinning || placed >= order.length) return;
    setSpinning(true);
    setHighlight(null);
    const n = remaining.length;
    const seg = 360 / n;
    // Land segment 0 (the next player) under the pointer, after several turns.
    const target = rotation + 360 * 4 + (360 - (seg / 2)) - (rotation % 360);
    setRotation(target);
    setTimeout(() => {
      setHighlight(order[placed].playerId);
      if (navigator.vibrate) navigator.vibrate(40);
      setTimeout(() => {
        setPlaced((p) => p + 1);
        setSpinning(false);
      }, 650);
    }, 2000);
  }

  const done = placed >= order.length;
  const seg = 360 / Math.max(1, remaining.length);
  const short = (id: string) => P(id)?.name?.split(" ")[0] ?? "?";

  return (
    <Stage>
      <div className="text-center">
        <div className="mb-1 flex items-center justify-center gap-2">
          <Mascot method="wheel" size={46} />
          <p className="font-anton text-xl tracking-wide text-accent">
            {remaining.length} still on the wheel
          </p>
        </div>
        {pairSize > 1 ? (
          <p className="mb-2 text-[12px] text-white/50">
            First two off the wheel are partners, next two are their opponents.
          </p>
        ) : null}

        <div className="relative mx-auto h-60 w-60">
          <div className="absolute left-1/2 top-[-8px] z-20 -translate-x-1/2 text-2xl">▼</div>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? "transform 2s cubic-bezier(.12,.85,.2,1)" : "none",
              background:
                remaining.length > 0
                  ? `conic-gradient(${remaining
                      .map((id, i) => {
                        const p = P(id);
                        const c = p ? (p.team === "A" ? "#e5484d" : "#3b82f6") : "#888";
                        const shade = i % 2 ? "cc" : "ff";
                        return `${c}${shade} ${i * seg}deg ${(i + 1) * seg}deg`;
                      })
                      .join(",")})`
                  : "#222",
              border: "5px solid #f3b50a",
              boxShadow: "0 0 30px rgba(0,0,0,.6) inset",
            }}
          >
            {remaining.map((id, i) => (
              <div
                key={id}
                className="absolute left-1/2 top-1/2 origin-left text-[10px] font-black text-white"
                style={{
                  transform: `rotate(${i * seg + seg / 2}deg) translateX(34px)`,
                  textShadow: "0 1px 2px rgba(0,0,0,.8)",
                }}
              >
                {short(id)}
              </div>
            ))}
          </div>
          <div className="absolute left-1/2 top-1/2 z-10 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-[#f3b50a] bg-[#0b2418]" />
        </div>

        {highlight ? (
          <p className="mt-2 font-anton text-2xl text-accent tb-pop">{P(highlight)?.name}</p>
        ) : (
          <p className="mt-2 h-8" />
        )}

        <FillingBoard board={board} seats={order} placed={placed} P={P} />

        {!done ? (
          <button
            onClick={spin}
            disabled={spinning}
            className="mt-4 w-full rounded-2xl bg-accent px-4 py-3.5 font-black text-ink disabled:opacity-60"
          >
            {spinning ? "Spinning…" : "Spin 🎡"}
          </button>
        ) : (
          <DoneButton onDone={onDone} />
        )}
      </div>
    </Stage>
  );
}

/* -------------------------------------------------------- CAPTAIN'S DRAFT
   The room actually drafts. Coin toss picks who throws first, then the captain
   on the clock taps a player from their own remaining pool. The opponent
   counters. Whatever they build IS the board. */

function DraftReveal({
  board,
  players,
  P,
  coinWinner,
  teamAName,
  teamBName,
  onDone,
  onDraftResult,
}: {
  board: DrawMatch[];
  players: Player[];
  P: (id: string) => Player | undefined;
  coinWinner: TeamId;
  draftLog: DraftLogEntry[];
  teamAName: string;
  teamBName: string;
  onDone: () => void;
  onDraftResult?: (b: DrawMatch[]) => void;
}) {
  const perSide = board[0]?.a.length ?? 1;
  const matchCount = board.length;

  const poolA = useMemo(
    () => board.flatMap((m) => m.a).filter(Boolean),
    [board]
  );
  const poolB = useMemo(
    () => board.flatMap((m) => m.b).filter(Boolean),
    [board]
  );

  const [phase, setPhase] = useState<"coin" | "draft">("coin");
  const [picksA, setPicksA] = useState<string[]>([]);
  const [picksB, setPicksB] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setPhase("draft"), 2400);
    return () => clearTimeout(t);
  }, []);

  // Whose turn: alternate the thrower each match; within a match the thrower
  // fills their side, then the opponent answers.
  const totalSeats = matchCount * perSide * 2;
  const seatsDone = picksA.length + picksB.length;
  const matchIndex = Math.floor(seatsDone / (perSide * 2));
  const withinMatch = seatsDone % (perSide * 2);
  const throwerIsA = coinWinner === "A" ? matchIndex % 2 === 0 : matchIndex % 2 === 1;
  const onClock: TeamId = withinMatch < perSide ? (throwerIsA ? "A" : "B") : throwerIsA ? "B" : "A";
  const done = seatsDone >= totalSeats;

  const availableA = poolA.filter((id) => !picksA.includes(id));
  const availableB = poolB.filter((id) => !picksB.includes(id));
  const available = onClock === "A" ? availableA : availableB;

  function pick(id: string) {
    if (onClock === "A") setPicksA((p) => [...p, id]);
    else setPicksB((p) => [...p, id]);
    if (navigator.vibrate) navigator.vibrate(20);
  }

  function undo() {
    const lastWasA = onClock === "B";
    if (lastWasA) setPicksA((p) => p.slice(0, -1));
    else setPicksB((p) => p.slice(0, -1));
  }

  // Build the board from what the captains chose.
  const built: DrawMatch[] = useMemo(() => {
    const out: DrawMatch[] = [];
    for (let i = 0; i < matchCount; i++) {
      out.push({
        a: picksA.slice(i * perSide, i * perSide + perSide),
        b: picksB.slice(i * perSide, i * perSide + perSide),
      });
    }
    return out;
  }, [picksA, picksB, matchCount, perSide]);

  useEffect(() => {
    if (done) onDraftResult?.(built);
  }, [done, built, onDraftResult]);

  if (phase === "coin") {
    return (
      <Stage>
        <div className="py-8 text-center">
          <div
            className="mx-auto flex h-24 w-24 items-center justify-center rounded-full text-4xl"
            style={{
              background: `linear-gradient(90deg, ${RED} 0 50%, ${BLUE} 50% 100%)`,
              animation: "tb-flip 2.2s cubic-bezier(.2,.7,.2,1) both",
              boxShadow: "0 10px 26px rgba(0,0,0,.5)",
              border: "3px solid #f3b50a",
              fontSize: 13,
              fontWeight: 900,
              color: "#fff",
              textShadow: "0 1px 3px rgba(0,0,0,.6)",
            }}
          >
            {teamAName.slice(0, 1)} / {teamBName.slice(0, 1)}
          </div>
          <p className="mt-4 font-anton text-xl tracking-wide text-white/80">Flipping for first pick…</p>
        </div>
      </Stage>
    );
  }

  return (
    <Stage>
      <div className="mb-2 flex items-center justify-center gap-2">
        <Mascot method="draft" size={44} />
        <p className="font-anton text-lg tracking-wide text-accent">
          {(coinWinner === "A" ? teamAName : teamBName)} won the toss
        </p>
      </div>

      {/* the board being built */}
      <div className="space-y-1.5">
        {Array.from({ length: matchCount }).map((_, i) => {
          const a = picksA.slice(i * perSide, i * perSide + perSide);
          const b = picksB.slice(i * perSide, i * perSide + perSide);
          const live = i === matchIndex && !done;
          return (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl px-3 py-2 text-[13px]"
              style={{
                background: live ? "rgba(243,181,10,.16)" : "rgba(255,255,255,.05)",
                border: live ? "1.5px solid #f3b50a" : "1.5px solid transparent",
              }}
            >
              <div className="flex flex-col items-end gap-0.5">
                {a.length ? a.map((id) => <Chip key={id} p={P(id)} size={22} />) : <span className="text-white/25">-</span>}
              </div>
              <span className="font-anton text-[11px] text-white/40">VS</span>
              <div className="flex flex-col items-start gap-0.5">
                {b.length ? b.map((id) => <Chip key={id} p={P(id)} size={22} />) : <span className="text-white/25">-</span>}
              </div>
            </div>
          );
        })}
      </div>

      {!done ? (
        <div className="mt-3">
          <p className="text-center text-sm font-black" style={{ color: teamColor(onClock) }}>
            {(() => {
              const cap = players.find((p) => p.team === onClock && p.isCaptain);
              return cap ? `${cap.name} (${onClock === "A" ? teamAName : teamBName})` : onClock === "A" ? teamAName : teamBName;
            })()}{" "}
            {" is on the clock"}
            <span className="ml-1 font-bold text-white/50">
              {withinMatch < perSide ? "- send someone out" : "- counter them"}
            </span>
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {available.map((id) => {
              const p = P(id);
              return (
                <button
                  key={id}
                  onClick={() => pick(id)}
                  className="rounded-full px-3 py-2 text-[13px] font-black tb-pop"
                  style={{ background: teamColor(onClock), color: "#fff" }}
                >
                  {p?.name ?? "Player"}
                </button>
              );
            })}
          </div>
          {seatsDone > 0 ? (
            <button onClick={undo} className="mt-3 w-full py-2 text-[13px] font-bold text-white/50">
              Undo last pick
            </button>
          ) : null}
        </div>
      ) : (
        <DoneButton onDone={onDone} label="Lock this draft" />
      )}
      {void players}
    </Stage>
  );
}
