"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useAuth } from "@/features/auth/AuthContext";
import { calculateTeamPoints } from "@/lib/scoring";
import { setOverlayOpen } from "@/features/trip/tour/overlayState";
import type { TeamId } from "@/types";

const TEAM_COLOR: Record<TeamId, string> = { A: "#e5484d", B: "#3b82f6" };

/**
 * The trophy moment. When the owner ends the tournament, everyone gets one
 * full-screen celebration for the winning side the next time they open the app,
 * then it steps aside for Wrapped. Shown once per person per tournament, kept
 * locally - a re-run celebration is a nuisance, not a data problem.
 */
export function ChampionTakeover() {
  const { trip, teams, players, matches, rounds, scores, courses, scoringSettings } =
    useTripState();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);
  const seenKey = `tb_champion_seen_${trip.id}`;

  // Read the "already celebrated" flag after mount so the server render and the
  // first client render agree.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(seenKey)) setDismissed(true);
    } catch {
      /* private mode: just show it */
    }
    setReady(true);
  }, [seenKey]);

  const points = useMemo(
    () => calculateTeamPoints(matches, players, rounds, scores, courses, scoringSettings),
    [matches, players, rounds, scores, courses, scoringSettings]
  );

  const winner: TeamId | "T" =
    points.A > points.B ? "A" : points.B > points.A ? "B" : "T";
  const show = Boolean(trip.wrappedAt) && ready && !dismissed;

  useEffect(() => {
    setOverlayOpen("championTakeover", show);
    return () => setOverlayOpen("championTakeover", false);
  }, [show]);

  if (!show) return null;

  const teamName = (code: TeamId) =>
    teams.find((t) => t.id === code)?.name ?? `Team ${code}`;
  const myPlayer = players.find((p) => p.accountId && p.accountId === user?.id);
  const iWon = winner !== "T" && myPlayer?.team === winner;
  const roster = winner === "T" ? [] : players.filter((p) => p.team === winner);

  function close() {
    try {
      window.localStorage.setItem(seenKey, "1");
    } catch {
      /* nothing to do */
    }
    setDismissed(true);
  }

  return (
    <div
      className="fixed inset-0 z-[180] flex items-center justify-center p-6"
      style={{
        background:
          winner === "T"
            ? "linear-gradient(160deg,#0b3b2e,#0b2418)"
            : `linear-gradient(160deg,${TEAM_COLOR[winner]},#0b2418)`,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Tournament champion"
    >
      <Confetti />
      <div className="relative w-full max-w-sm text-center text-white">
        <p className="text-7xl">{winner === "T" ? "🤝" : "🏆"}</p>
        <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-accent">
          {winner === "T" ? "All square" : "Champions"}
        </p>
        <h1 className="font-anton text-4xl leading-tight tracking-tight">
          {winner === "T" ? "The trip ends level" : teamName(winner)}
        </h1>
        <p className="mt-2 text-lg font-black">
          {points.A} - {points.B}
        </p>
        {winner !== "T" ? (
          <p className="mt-1 text-sm opacity-90">
            {iWon ? "You're on the winning side." : `${teamName(winner)} takes the trophy.`}
          </p>
        ) : (
          <p className="mt-1 text-sm opacity-90">
            Nobody gives it up. Settle it next year.
          </p>
        )}

        {roster.length > 0 ? (
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {roster.map((p) => (
              <span
                key={p.id}
                className="rounded-full bg-white/15 px-2.5 py-1 text-[13px] font-bold"
              >
                {p.name}
              </span>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          onClick={close}
          className="mt-6 w-full rounded-2xl bg-white px-4 py-3.5 font-black text-fairway-900"
        >
          See the Wrapped
        </button>
      </div>
    </div>
  );
}

/**
 * Confetti on a canvas - cheap, no dependency, and it stops itself after a few
 * seconds so it never sits there burning battery on a phone.
 */
function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const colors = ["#f3b50a", "#ffffff", "#5ac18e", "#e5484d", "#3b82f6"];
    const pieces = Array.from({ length: 90 }, () => ({
      x: Math.random() * w,
      y: -20 - Math.random() * h,
      size: 5 + Math.random() * 6,
      vy: 1.4 + Math.random() * 2.4,
      vx: -0.6 + Math.random() * 1.2,
      rot: Math.random() * Math.PI,
      vr: -0.08 + Math.random() * 0.16,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    let raf = 0;
    const started = Date.now();
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      pieces.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > h + 20) {
          p.y = -20;
          p.x = Math.random() * w;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });
      // Six seconds is plenty; after that it fades to a still screen.
      if (Date.now() - started < 6000) raf = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
