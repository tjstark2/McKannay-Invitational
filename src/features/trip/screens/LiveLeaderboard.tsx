"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { PlayerAvatar } from "@/features/avatar/PlayerAvatar";
import { loadCourseHoles, loadCourseTees, type CourseHole } from "@/lib/supabase/courseHoles";
import { loadRoundSetups, type RoundSetup } from "@/lib/supabase/roundSegments";
import { allocateForMatch, holesInPlay } from "@/features/trip/scoring/strokeIndex";

type Row = {
  playerId: string;
  name: string;
  avatarId?: string;
  emoji?: string;
  team: "A" | "B";
  thru: number;
  netToPar: number;
};

/**
 * Live board for a hole-by-hole round. Subscribes to hole_scores so the group
 * watches the race move while they play.
 */
export function LiveLeaderboard({ roundId }: { roundId: string }) {
  const { trip, players } = useTripState();
  const [round, setRound] = useState<RoundSetup | null>(null);
  const [holes, setHoles] = useState<CourseHole[]>([]);
  const [tee, setTee] = useState<{ rating: number | null; slope: number | null } | null>(null);
  const [scores, setScores] = useState<{ playerId: string; hole: number; strokes: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStatic = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const setups = await loadRoundSetups(supabase, trip.id);
    const r = setups.find((x) => x.id === roundId) ?? null;
    setRound(r);
    if (r?.courseId) {
      const [hs, tees] = await Promise.all([
        loadCourseHoles(supabase, r.courseId),
        loadCourseTees(supabase, r.courseId),
      ]);
      setHoles(hs);
      const chosen = tees.find((t) => t.id === r.teeId) ?? tees[0] ?? null;
      setTee(chosen ? { rating: chosen.rating, slope: chosen.slope } : null);
    }
    setLoading(false);
  }, [roundId, trip.id]);

  const loadScores = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase
      .from("hole_scores")
      .select("player_id,hole_number,strokes")
      .eq("round_id", roundId);
    setScores(
      ((data ?? []) as Record<string, unknown>[]).map((s) => ({
        playerId: s.player_id as string,
        hole: s.hole_number as number,
        strokes: s.strokes as number,
      }))
    );
  }, [roundId]);

  useEffect(() => {
    loadStatic();
    loadScores();
  }, [loadStatic, loadScores]);

  // Realtime: any score change on this round refreshes the board.
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`hole_scores:${roundId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hole_scores", filter: `round_id=eq.${roundId}` },
        () => loadScores()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roundId, loadScores]);

  const coursePar = useMemo(() => holes.reduce((sum, h) => sum + h.par, 0) || null, [holes]);

  const rows: Row[] = useMemo(() => {
    if (!round || holes.length === 0) return [];
    const playable = holesInPlay(holes, (round.holesCount === 9 ? 9 : 18) as 9 | 18, round.nine);
    const parOf = new Map(playable.map((h) => [h.hole, h.par]));

    // Allocate per tee time so each group's allowance applies.
    const strokesByPlayer = new Map<string, Record<number, number>>();
    round.teeTimes.forEach((tt) => {
      const group = tt.playerIds
        .map((id) => players.find((p) => p.id === id))
        .filter(Boolean) as typeof players;
      if (group.length === 0) return;
      const seg = round.segments.find((s) => s.teeTimeId === tt.id);
      allocateForMatch({
        players: group.map((p) => ({ playerId: p.id, name: p.name, index: p.handicapIndex })),
        tee: { rating: tee?.rating ?? null, slope: tee?.slope ?? null, par: coursePar },
        holes,
        holesCount: (round.holesCount === 9 ? 9 : 18) as 9 | 18,
        nine: round.nine,
        allowancePct: seg?.allowancePct ?? 100,
      }).forEach((a) => strokesByPlayer.set(a.playerId, a.byHole));
    });

    const out: Row[] = [];
    players.forEach((p) => {
      const mine = scores.filter((s) => s.playerId === p.id && parOf.has(s.hole));
      if (mine.length === 0) return;
      const byHole = strokesByPlayer.get(p.id) ?? {};
      const netToPar = mine.reduce((sum, s) => {
        const par = parOf.get(s.hole) ?? 4;
        return sum + (s.strokes - (byHole[s.hole] ?? 0) - par);
      }, 0);
      out.push({
        playerId: p.id,
        name: p.name,
        avatarId: p.avatarId,
        emoji: p.avatarEmoji,
        team: p.team,
        thru: mine.length,
        netToPar,
      });
    });
    return out.sort((a, b) => a.netToPar - b.netToPar || b.thru - a.thru);
  }, [round, holes, scores, players, tee, coursePar]);

  if (loading) return null;
  if (rows.length === 0)
    return (
      <p className="text-[13px] text-slate-400">
        No scores yet. The board fills in as the groups play.
      </p>
    );

  const fmt = (n: number) => (n === 0 ? "E" : n > 0 ? `+${n}` : `${n}`);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">Live · net to par</p>
      </div>
      {rows.map((r, i) => (
        <div key={r.playerId} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
          <span className="w-5 text-[13px] font-black text-slate-400">{i + 1}</span>
          <PlayerAvatar
            avatarId={r.avatarId}
            emoji={r.emoji}
            name={r.name}
            size={26}
            playerId={r.playerId}
            ring={r.team === "A" ? "#e5484d" : "#3b82f6"}
          />
          <span className="flex-1 text-[14px] font-black text-ink">{r.name}</span>
          <span className="text-[12px] font-bold text-slate-400">thru {r.thru}</span>
          <span
            className={`w-10 text-right text-[14px] font-black ${
              r.netToPar < 0 ? "text-emerald-600" : r.netToPar === 0 ? "text-ink" : "text-slate-500"
            }`}
          >
            {fmt(r.netToPar)}
          </span>
        </div>
      ))}
    </div>
  );
}
