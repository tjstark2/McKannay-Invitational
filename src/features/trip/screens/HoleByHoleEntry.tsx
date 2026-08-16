"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useAuth } from "@/features/auth/AuthContext";
import { PlayerAvatar } from "@/features/avatar/PlayerAvatar";
import { loadCourseHoles, loadCourseTees, imageToBase64, type CourseHole } from "@/lib/supabase/courseHoles";
import { loadRoundSetups, type RoundSetup } from "@/lib/supabase/roundSegments";
import { RoundConfirm } from "@/features/trip/screens/RoundConfirm";
import { detectCallouts, clearsSnowman, type Callout } from "@/features/trip/scoring/callouts";
import { recordMoment, clearSnowman } from "@/lib/supabase/moments";
import { sendMessage } from "@/lib/supabase/clubhouse";
import { LiveLeaderboard } from "@/features/trip/screens/LiveLeaderboard";
import {
  allocateForMatch,
  holesInPlay,
  type MatchStrokes,
} from "@/features/trip/scoring/strokeIndex";

type HoleScore = { playerId: string; hole: number; strokes: number };

export function HoleByHoleEntry({ roundId }: { roundId: string }) {
  const { trip, players } = useTripState();
  const { user } = useAuth();

  const [round, setRound] = useState<RoundSetup | null>(null);
  const [holes, setHoles] = useState<CourseHole[]>([]);
  const [tee, setTee] = useState<{ rating: number | null; slope: number | null } | null>(null);
  const [coursePar, setCoursePar] = useState<number | null>(null);
  const [scores, setScores] = useState<HoleScore[]>([]);
  const [current, setCurrent] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [celebration, setCelebration] = useState<Callout | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoReview, setPhotoReview] = useState<
    { name: string; playerId: string; holes: { hole: number; strokes: number }[] }[] | null
  >(null);
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    const setups = await loadRoundSetups(supabase, trip.id);
    const r = setups.find((x) => x.id === roundId) ?? null;
    setRound(r);
    if (r?.courseId) {
      const [hs, tees] = await Promise.all([
        loadCourseHoles(supabase, r.courseId),
        loadCourseTees(supabase, r.courseId),
      ]);
      setHoles(hs);
      setCoursePar(hs.reduce((sum, h) => sum + h.par, 0) || null);
      const chosen = tees.find((t) => t.id === r.teeId) ?? tees[0] ?? null;
      setTee(chosen ? { rating: chosen.rating, slope: chosen.slope } : null);
    }
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
    setLoading(false);
  }, [roundId, trip.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Which tee time am I in? Anyone in the group can enter for anyone in it.
  const myPlayer = players.find((p) => p.accountId && p.accountId === user?.id);
  const myTeeTime = useMemo(() => {
    if (!round || !myPlayer) return null;
    return round.teeTimes.find((t) => t.playerIds.includes(myPlayer.id)) ?? null;
  }, [round, myPlayer]);

  const groupPlayers = useMemo(() => {
    const ids = myTeeTime?.playerIds ?? [];
    return ids.map((id) => players.find((p) => p.id === id)).filter(Boolean) as typeof players;
  }, [myTeeTime, players]);

  const playable = useMemo(
    () =>
      round
        ? holesInPlay(holes, (round.holesCount === 9 ? 9 : 18) as 9 | 18, round.nine)
        : [],
    [holes, round]
  );

  // Strokes for this group, from the tested engine.
  const allocation: MatchStrokes[] = useMemo(() => {
    if (!round || groupPlayers.length === 0 || holes.length === 0) return [];
    const seg = round.segments.find((s) => s.teeTimeId === myTeeTime?.id);
    return allocateForMatch({
      players: groupPlayers.map((p) => ({ playerId: p.id, name: p.name, index: p.handicapIndex })),
      tee: { rating: tee?.rating ?? null, slope: tee?.slope ?? null, par: coursePar },
      holes,
      holesCount: (round.holesCount === 9 ? 9 : 18) as 9 | 18,
      nine: round.nine,
      allowancePct: seg?.allowancePct ?? 100,
    });
  }, [round, groupPlayers, holes, tee, coursePar, myTeeTime]);

  const scoreFor = (pid: string, hole: number) =>
    scores.find((s) => s.playerId === pid && s.hole === hole)?.strokes ?? null;

  const holeInfo = playable.find((h) => h.hole === current) ?? null;
  const holeIdx = playable.findIndex((h) => h.hole === current);
  const allInForHole = (hole: number) => groupPlayers.every((p) => scoreFor(p.id, hole) !== null);

  // Every earlier hole must be complete before moving on.
  const firstIncomplete = playable.find((h) => !allInForHole(h.hole));
  const canAdvance = holeInfo ? allInForHole(holeInfo.hole) : false;
  const completedHoles = playable.filter((h) => allInForHole(h.hole)).length;

  async function saveScore(pid: string, hole: number, strokes: number) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setScores((prev) => {
      const rest = prev.filter((s) => !(s.playerId === pid && s.hole === hole));
      return [...rest, { playerId: pid, hole, strokes }];
    });
    setBusy(true);
    const { error: e } = await supabase.from("hole_scores").upsert(
      {
        round_id: roundId,
        player_id: pid,
        hole_number: hole,
        strokes,
        entered_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "round_id,player_id,hole_number" }
    );
    setBusy(false);
    if (e) {
      setError(e.message);
      return;
    }

    // First score of the round starts the voting clock. The is-null filter
    // makes this a no-op every time after; RLS may quietly skip it for
    // non-organizers, and that's fine - any organizer entry stamps it.
    if (scores.length === 0) {
      try {
        await supabase
          .from("rounds")
          .update({ first_score_at: new Date().toISOString() })
          .eq("id", roundId)
          .is("first_score_at", null);
      } catch {
        /* non-blocking */
      }
    }

    // Trash talk. The board sees it in the Clubhouse; the big ones take over
    // this screen too.
    const par = playable.find((h) => h.hole === hole)?.par;
    const who = players.find((p) => p.id === pid);
    if (par && who) {
      const mine = scores
        .filter((s) => s.playerId === pid && s.hole !== hole)
        .map((s) => ({ hole: s.hole, par: playable.find((h) => h.hole === s.hole)?.par ?? 4, strokes: s.strokes }));
      const events = detectCallouts({
        playerName: who.name,
        hole,
        par,
        strokes,
        roundScores: [...mine, { hole, par, strokes }],
      });
      const big = events.find((c) => c.level === "takeover") ?? events.find((c) => c.level === "celebrate");
      if (big) setCelebration(big);
      for (const c of events) {
        try {
          await sendMessage(supabase, { tripId: trip.id, userId: user?.id ?? "", body: c.text });
        } catch {
          /* a callout failing must never block scoring */
        }
        // Push it out. The category engine decides who actually gets it based
        // on their intensity setting and quiet hours.
        if (c.level === "takeover" || c.level === "celebrate" || c.snowman) {
          try {
            const others = players
              .map((p) => p.accountId)
              .filter((id): id is string => Boolean(id) && id !== user?.id);
            if (others.length > 0) {
              await fetch("/api/push/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userIds: others,
                  title: trip.name,
                  message: c.text,
                  category: "live_action",
                  kind: c.key,
                  url: `/t/${trip.joinCode}`,
                }),
              });
            }
          } catch {
            /* never block scoring on a notification */
          }
        }
        // Persist the ones worth showing later, and the sticky snowman.
        if (c.level === "takeover" || c.snowman) {
          try {
            await recordMoment(supabase, {
              tripId: trip.id,
              roundId,
              playerId: pid,
              kind: c.key,
              hole,
              body: c.text,
            });
          } catch {
            /* non-blocking */
          }
        }
      }
      // Play your way out of the snowman: tiered by handicap.
      if (events.length === 0 || !events.some((c) => c.snowman)) {
        if (clearsSnowman(who.handicapIndex, strokes, par)) {
          try {
            await clearSnowman(supabase, trip.id, pid);
          } catch {
            /* non-blocking */
          }
        }
      }
    }
  }

  async function readScorecard(file: File) {
    setPhotoBusy(true);
    setPhotoNote(null);
    setError(null);
    try {
      const { base64, mediaType } = await imageToBase64(file);
      const res = await fetch("/api/parse-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mediaType,
          names: groupPlayers.map((p) => p.name),
          holes: playable.map((h) => h.hole),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Couldn't read that scorecard.");
      const mapped = (data.players as { name: string; holes: { hole: number; strokes: number }[] }[])
        .map((row) => {
          const match = groupPlayers.find((p) => p.name.toLowerCase() === row.name.toLowerCase());
          return match ? { name: match.name, playerId: match.id, holes: row.holes } : null;
        })
        .filter(Boolean) as { name: string; playerId: string; holes: { hole: number; strokes: number }[] }[];
      if (mapped.length === 0) throw new Error("Couldn't match anyone in your group to that card.");
      if ((data.unmatched as string[])?.length) {
        setPhotoNote(`Ignored rows that are not in your group: ${(data.unmatched as string[]).join(", ")}.`);
      }
      setPhotoReview(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that scorecard.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function applyPhotoScores() {
    if (!photoReview) return;
    for (const row of photoReview) {
      for (const h of row.holes) {
        await saveScore(row.playerId, h.hole, h.strokes);
      }
    }
    setPhotoReview(null);
  }

  if (loading) return <p className="text-sm text-slate-400">Loading the card…</p>;
  if (!round) return <p className="text-sm text-slate-400">Round not found.</p>;
  if (holes.length === 0)
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-900">
        This course has no hole data yet. An admin needs to add par and course handicap numbers in Manage My
        Tournament, under Courses, before hole-by-hole scoring can run.
      </div>
    );
  if (!myTeeTime)
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-900">
        You are not in a tee time for this round yet. An admin sets those in Manage My Tournament.
      </div>
    );

  const strokesOn = (pid: string, hole: number) =>
    allocation.find((a) => a.playerId === pid)?.byHole[hole] ?? 0;

  return (
    <div className="space-y-4">
      {/* strokes explainer */}
      <div className="rounded-2xl bg-[#f7f6f1] p-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">Strokes this round</p>
        {allocation.map((a) => (
          <p key={a.playerId} className="mt-1 text-[13px] leading-5 text-slate-600">
            {a.summary}
          </p>
        ))}
      </div>

      <div className="rounded-2xl bg-[#f7f6f1] p-3">
        <LiveLeaderboard roundId={roundId} />
      </div>

      <div>
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) readScorecard(f);
          }}
        />
        <button
          type="button"
          disabled={photoBusy}
          onClick={() => photoRef.current?.click()}
          className="w-full rounded-2xl border-2 border-dashed border-sand-200 px-4 py-3 font-black text-slate-500 disabled:opacity-50"
        >
          {photoBusy ? "Reading the card…" : "📷 Fill from a scorecard photo"}
        </button>
        <p className="mt-1 text-center text-[12px] leading-5 text-slate-500">
          Works on the paper card or a screenshot from whatever app you use. You check it before it saves.
        </p>
      </div>

      {/* hole strip */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {playable.map((h) => {
          const done = allInForHole(h.hole);
          const isNow = h.hole === current;
          return (
            <button
              key={h.hole}
              type="button"
              onClick={() => setCurrent(h.hole)}
              className={`min-w-[42px] rounded-xl px-2 py-1.5 text-center text-[12px] font-black ${
                isNow
                  ? "bg-fairway-900 text-white"
                  : done
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-white text-slate-400"
              }`}
            >
              {h.hole}
            </button>
          );
        })}
      </div>

      {/* current hole */}
      {holeInfo ? (
        <div className="rounded-2xl border-2 border-sand-200 bg-white p-4">
          <div className="mb-3 text-center">
            <p className="font-anton text-3xl tracking-tight text-ink">Hole {holeInfo.hole}</p>
            <p className="text-[13px] font-bold text-slate-500">
              Par {holeInfo.par} · Course Hcp #{holeInfo.si}
            </p>
          </div>

          <div className="space-y-2">
            {groupPlayers.map((p) => {
              const val = scoreFor(p.id, holeInfo.hole);
              const gets = strokesOn(p.id, holeInfo.hole);
              return (
                <div key={p.id} className="rounded-xl bg-[#f7f6f1] p-2.5">
                  <div className="flex items-center gap-2">
                    <PlayerAvatar avatarId={p.avatarId} emoji={p.avatarEmoji} name={p.name} size={28} playerId={p.id} />
                    <span className="flex-1 text-[14px] font-black text-ink">
                      {p.name}
                      {gets > 0 ? (
                        <span className="ml-1 text-[12px] font-bold text-accent-dark">
                          {"•".repeat(gets)} {gets} stroke{gets === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </span>
                    {val !== null ? (
                      <span className="text-[12px] font-bold text-slate-500">
                        net {val - gets}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <button
                        key={n}
                        type="button"
                        disabled={busy}
                        onClick={() => saveScore(p.id, holeInfo.hole, n)}
                        className={`h-9 w-9 rounded-lg text-sm font-black ${
                          val === n ? "bg-fairway-900 text-white" : "bg-white text-slate-600"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={holeIdx <= 0}
              onClick={() => setCurrent(playable[holeIdx - 1].hole)}
              className="rounded-2xl border-[1.5px] border-slate-300 px-4 py-3 font-black text-slate-600 disabled:opacity-40"
            >
              ‹
            </button>
            <button
              type="button"
              disabled={!canAdvance || holeIdx >= playable.length - 1}
              onClick={() => setCurrent(playable[holeIdx + 1].hole)}
              className="flex-1 rounded-2xl bg-fairway-900 px-4 py-3 font-black text-white disabled:opacity-40"
            >
              {canAdvance ? "Next hole ›" : "Everyone needs a score first"}
            </button>
          </div>
        </div>
      ) : null}

      {photoReview ? (
        <div className="fixed inset-0 z-[175] flex items-end justify-center bg-black/70 sm:items-center">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl">
            <p className="font-anton text-2xl tracking-tight text-ink">Check the card</p>
            <p className="mt-1 text-[13px] text-slate-500">
              Anything wrong here goes straight into the standings, so give it a look.
            </p>
            {photoNote ? (
              <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[12px] text-amber-900">{photoNote}</p>
            ) : null}

            <div className="mt-3 space-y-3">
              {photoReview.map((row) => (
                <div key={row.playerId}>
                  <p className="text-[13px] font-black text-ink">{row.name}</p>
                  <div className="mt-1 grid grid-cols-6 gap-1">
                    {row.holes.map((h) => (
                      <div key={h.hole} className="rounded-lg bg-[#f7f6f1] p-1 text-center">
                        <p className="text-[10px] font-black uppercase text-slate-400">H{h.hole}</p>
                        <p className="text-[14px] font-black text-ink">{h.strokes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPhotoReview(null)}
                className="flex-1 rounded-2xl border-[1.5px] border-slate-300 px-4 py-3 font-black text-slate-600"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={applyPhotoScores}
                disabled={busy}
                className="flex-1 rounded-2xl bg-fairway-900 px-4 py-3 font-black text-white disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save these scores"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {celebration ? (
        <div
          className="fixed inset-0 z-[180] flex items-center justify-center bg-black/80 p-6"
          onClick={() => setCelebration(null)}
        >
          <div className="text-center">
            <p className="text-[72px] leading-none">
              {celebration.key === "ace" ? "🕳️" : celebration.key === "albatross" ? "🦅" : celebration.key === "eagle" ? "🦅" : "🐦"}
            </p>
            <p className="mt-4 font-anton text-3xl leading-tight tracking-tight text-white">
              {celebration.text}
            </p>
            <p className="mt-4 text-sm font-bold text-white/60">Tap anywhere to keep scoring</p>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm font-bold text-red-600">{error}</p> : null}

      <div className="rounded-2xl bg-[#f3efe6] px-3 py-2 text-[13px] font-bold text-ink">
        {completedHoles} of {playable.length} holes in
        {firstIncomplete ? ` · next gap: hole ${firstIncomplete.hole}` : " · card complete"}
      </div>

      {completedHoles === playable.length ? (
        <RoundConfirm
          roundId={roundId}
          groupPlayers={groupPlayers}
          holes={playable}
          scores={scores}
          strokesOn={strokesOn}
          onLocked={load}
        />
      ) : (
        <p className="text-[12px] leading-5 text-slate-500">
          Anyone in your tee time can enter scores for the group. When all {playable.length} holes are in,
          every player confirms the card before it counts.
        </p>
      )}
    </div>
  );
}
