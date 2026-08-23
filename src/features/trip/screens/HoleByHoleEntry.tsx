"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useViewer } from "@/features/trip/state/ViewerContext";
import { useAuth } from "@/features/auth/AuthContext";
import { PlayerAvatar } from "@/features/avatar/PlayerAvatar";
import { loadCourseHoles, loadCourseTees, imageToBase64, type CourseHole } from "@/lib/supabase/courseHoles";
import { loadRoundSetups, type RoundSetup } from "@/lib/supabase/roundSegments";
import { RoundConfirm } from "@/features/trip/screens/RoundConfirm";
import { detectCallouts, clearsSnowman, type Callout } from "@/features/trip/scoring/callouts";
import { scoreOptions, TONE_CLASS } from "@/features/trip/scoring/scoreLabels";
import {
  detectCloseAtTurn,
  detectLeadChange,
  standingFromHoles,
} from "@/features/trip/scoring/matchMoments";
import { recordMoment, clearSnowman } from "@/lib/supabase/moments";
import { sendMessage } from "@/lib/supabase/clubhouse";
import { authedPost, notify } from "@/lib/notify";
import { dequeueScore, enqueueScore } from "@/lib/offlineScores";
import { useOfflineScores } from "@/features/trip/scoring/useOfflineScores";
import { LiveLeaderboard } from "@/features/trip/screens/LiveLeaderboard";
import {
  allocateForMatch,
  holesInPlay,
  type MatchStrokes,
} from "@/features/trip/scoring/strokeIndex";

type HoleScore = { playerId: string; hole: number; strokes: number };

export function HoleByHoleEntry({ roundId }: { roundId: string }) {
  const { trip, players } = useTripState();
  const { canManage } = useViewer();
  const { user } = useAuth();
  // Organizers can jump to any group to fix a card, including after signing.
  const [adminTeeTimeId, setAdminTeeTimeId] = useState<string | null>(null);
  const { online, pending, syncing, sync, refreshCount } = useOfflineScores(roundId);

  const [round, setRound] = useState<RoundSetup | null>(null);
  const [holes, setHoles] = useState<CourseHole[]>([]);
  const [tee, setTee] = useState<{ rating: number | null; slope: number | null } | null>(null);
  const [coursePar, setCoursePar] = useState<number | null>(null);
  const [scores, setScores] = useState<HoleScore[]>([]);
  // Which hole is on screen. Set to the first hole still missing a score once
  // the card loads - returning to a round used to drop you back on hole 1 even
  // with three holes already confirmed, which looked like being stuck.
  const [current, setCurrent] = useState(1);
  const resumedRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [celebration, setCelebration] = useState<Callout | null>(null);
  // Two players can both earn a takeover on the same hole. They queue up and
  // wait their turn rather than the second one replacing the first before you
  // have read it.
  const [celebrationQueue, setCelebrationQueue] = useState<Callout[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoReview, setPhotoReview] = useState<
    { name: string; playerId: string; holes: { hole: number; strokes: number }[] }[] | null
  >(null);
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const loadedOnceRef = useRef(false);
  // Scores typed for the hole on screen, held locally until confirmed.
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [confirming, setConfirming] = useState(false);
  const [confirmedHoles, setConfirmedHoles] = useState<number[]>([]);
  // On a completed card the hole entry is hidden behind a button so signing is
  // the obvious next step.
  const [showAllHoles, setShowAllHoles] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    // Only block the screen on the FIRST load. After that keep showing the card
    // we already have and refresh underneath - otherwise going offline mid-round
    // replaces a working scorecard with a spinner that never resolves.
    if (!loadedOnceRef.current) setLoading(true);
    try {
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
    } catch {
      // Offline or a flaky connection. Whatever is already on screen stays put,
      // and the offline queue keeps accepting scores.
    } finally {
      loadedOnceRef.current = true;
      setLoading(false);
    }
  }, [roundId, trip.id]);

  useEffect(() => {
    load();
  }, [load]);

  // A fresh hole starts with an empty draft; any score already saved shows
  // through because the buttons fall back to it.
  useEffect(() => {
    setDraft({});
  }, [current]);


  // Which tee time am I in? Anyone in the group can enter for anyone in it.
  const myPlayer = players.find((p) => p.accountId && p.accountId === user?.id);
  const myTeeTime = useMemo(() => {
    if (!round) return null;
    if (canManage && adminTeeTimeId) {
      return round.teeTimes.find((t) => t.id === adminTeeTimeId) ?? null;
    }
    if (!myPlayer) return null;
    return round.teeTimes.find((t) => t.playerIds.includes(myPlayer.id)) ?? null;
  }, [round, myPlayer, canManage, adminTeeTimeId]);

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
  // Resume where the card actually is, once, after the first load.
  useEffect(() => {
    if (resumedRef.current || loading || playable.length === 0) return;
    if (groupPlayers.length === 0) return;
    const next = playable.find(
      (h) => !groupPlayers.every((p) => scores.some((s) => s.playerId === p.id && s.hole === h.hole))
    );
    setCurrent(next ? next.hole : playable[playable.length - 1].hole);
    resumedRef.current = true;
  }, [loading, playable, groupPlayers, scores]);

  // Switching group as an organizer means resuming that group's card instead.
  useEffect(() => {
    resumedRef.current = false;
  }, [adminTeeTimeId]);

  const canAdvance = holeInfo ? allInForHole(holeInfo.hole) : false;
  const completedHoles = playable.filter((h) => allInForHole(h.hole)).length;

  /**
   * Write one score. Deliberately silent: no callouts, no pushes, no clubhouse
   * post. Those belong to confirmHole, which runs once the whole hole has been
   * confirmed - otherwise a mistyped 1 fires a hole-in-one notification that
   * cannot be recalled, and deleting the score leaves the leaderboard wrong.
   *
   * Returns whether the database accepted it, so the caller can tell the
   * difference between "saved" and "queued because we are offline".
   */
  async function saveScore(pid: string, hole: number, strokes: number): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    // Was there already a score here? Distinguishes a fix from a first entry.
    const wasScored = scores.some((s) => s.playerId === pid && s.hole === hole);
    setScores((prev) => {
      const rest = prev.filter((s) => !(s.playerId === pid && s.hole === hole));
      return [...rest, { playerId: pid, hole, strokes }];
    });
    setBusy(true);
    // Write it down locally first. If the network is gone - and on a golf
    // course it will be - the score is still safe and syncs on reconnect.
    enqueueScore({
      roundId,
      playerId: pid,
      hole,
      strokes,
      enteredBy: user?.id ?? null,
    });
    refreshCount();

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
      // Still queued, so don't alarm anyone - just say what's happening.
      setError(null);
      refreshCount();
      return false;
    }
    dequeueScore({ roundId, playerId: pid, hole });
    refreshCount();

    return true;
  }

  /**
   * Everything that should happen ONCE, after a hole has been confirmed and
   * written: callouts, pushes, the clubhouse post, the snowman, match-state
   * moments and the published total.
   *
   * Keeping this out of saveScore is the whole point. Previously each keystroke
   * fired its own notifications, so a mistyped 1 sent a hole-in-one push that
   * could not be taken back, and correcting the score left the leaderboard
   * showing the old one.
   */
  /**
   * Everything that should happen ONCE, after a hole has been confirmed and
   * written: callouts, pushes, the clubhouse post, the snowman, match-state
   * moments and the published totals.
   *
   * Keeping this out of saveScore is the whole point. Previously every
   * keystroke fired its own notifications, so a mistyped 1 sent a hole-in-one
   * push that could not be taken back, and correcting the score left the
   * leaderboard showing the old one.
   */
  async function runHoleEffects(
    hole: number,
    entered: { pid: string; strokes: number; wasScored: boolean }[],
    listAfter: HoleScore[]
  ) {
    const bigMoments: Callout[] = [];
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const par = playable.find((h) => h.hole === hole)?.par;

    // The first score of the round starts the voting clock.
    try {
      await supabase
        .from("rounds")
        .update({ first_score_at: new Date().toISOString() })
        .eq("id", roundId)
        .is("first_score_at", null);
    } catch {
      /* non-blocking */
    }

    const others = players
      .map((p) => p.accountId)
      .filter((id): id is string => Boolean(id) && id !== user?.id);

    for (const { pid, strokes, wasScored } of entered) {
      const who = players.find((p) => p.id === pid);
      if (!who || !par) continue;

      // Publish the total once this player's card is complete, so the
      // standings and the awards vote see it.
      const mineAll = listAfter.filter(
        (x) => x.playerId === pid && playable.some((h) => h.hole === x.hole)
      );
      if (mineAll.length === playable.length && playable.length > 0) {
        const gross = mineAll.reduce((sum, x) => sum + x.strokes, 0);
        const frontHoles = mineAll.filter((x) => x.hole <= 9);
        const front = frontHoles.length > 0
          ? frontHoles.reduce((sum, x) => sum + x.strokes, 0)
          : null;
        try {
          await supabase.from("score_entries").upsert(
            {
              round_id: roundId,
              player_id: pid,
              gross_score: gross,
              front_nine_score: front,
              entered_by: user?.id ?? null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "round_id,player_id" }
          );
        } catch {
          /* the hole scores are safe either way */
        }
      }

      // An organizer changing someone else's existing score should say so.
      if (canManage && user?.id && who.accountId && who.accountId !== user.id && wasScored) {
        void notify({
          userIds: [who.accountId],
          title: trip.name,
          message: `An organizer updated your hole ${hole} score to ${strokes}.`,
          category: "essential",
          url: `/t/${trip.joinCode}`,
        });
      }

      // Callouts for this player on this hole.
      const mine = listAfter
        .filter((x) => x.playerId === pid && x.hole !== hole)
        .map((x) => ({
          hole: x.hole,
          par: playable.find((h) => h.hole === x.hole)?.par ?? 4,
          strokes: x.strokes,
        }));
      const events = detectCallouts({
        playerName: who.name,
        hole,
        par,
        strokes,
        roundScores: [...mine, { hole, par, strokes }],
      });
      const big =
        events.find((c) => c.level === "takeover") ??
        events.find((c) => c.level === "celebrate");
      if (big) bigMoments.push(big);

      for (const c of events) {
        try {
          await sendMessage(supabase, { tripId: trip.id, userId: user?.id ?? "", body: c.text });
        } catch {
          /* a callout failing must never block scoring */
        }
        if (c.level === "takeover" || c.level === "celebrate" || c.snowman) {
          try {
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
      if (!events.some((c) => c.snowman) && clearsSnowman(who.handicapIndex, strokes, par)) {
        try {
          await clearSnowman(supabase, trip.id, pid);
        } catch {
          /* non-blocking */
        }
      }
    }

    if (bigMoments.length > 0) {
      setCelebration(bigMoments[0]);
      setCelebrationQueue(bigMoments.slice(1));
    }

    // Match state, computed once for the hole rather than per keystroke.
    if (groupPlayers.length >= 2) {
      const teamOf = (id: string) => players.find((x) => x.id === id)?.team ?? "A";
      const aSide = groupPlayers.filter((p) => teamOf(p.id) === "A");
      const bSide = groupPlayers.filter((p) => teamOf(p.id) === "B");
      if (aSide.length > 0 && bSide.length > 0) {
        const bestNet = (side: typeof groupPlayers, list: HoleScore[]) => {
          const out: Record<number, number> = {};
          for (const h of playable) {
            const nets = side
              .map((p) => {
                const sc = list.find((x) => x.playerId === p.id && x.hole === h.hole);
                if (!sc) return null;
                return (
                  sc.strokes -
                  (allocation.find((a) => a.playerId === p.id)?.byHole[h.hole] ?? 0)
                );
              })
              .filter((n): n is number => n != null);
            if (nets.length === side.length && nets.length > 0) out[h.hole] = Math.min(...nets);
          }
          return out;
        };
        const listBefore = listAfter.filter((x) => x.hole !== hole);
        const before = standingFromHoles(bestNet(aSide, listBefore), bestNet(bSide, listBefore));
        const after = standingFromHoles(bestNet(aSide, listAfter), bestNet(bSide, listAfter));
        if (after.holesComplete > before.holesComplete) {
          const teamAName = aSide.map((p) => p.name).join(" & ");
          const teamBName = bSide.map((p) => p.name).join(" & ");
          const moments = [
            detectLeadChange(before.standing, after.standing, teamAName, teamBName, hole),
            detectCloseAtTurn(after.holesComplete, after.standing, teamAName, teamBName),
          ].filter((m): m is NonNullable<typeof m> => Boolean(m));
          for (const m of moments) {
            try {
              await sendMessage(supabase, {
                tripId: trip.id,
                userId: user?.id ?? "",
                body: m.text,
              });
            } catch {
              /* non-blocking */
            }
            try {
              if (others.length > 0) {
                await fetch("/api/push/send", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    userIds: others,
                    title: trip.name,
                    message: m.text,
                    category: "live_action",
                    kind: m.key,
                    url: `/t/${trip.joinCode}`,
                  }),
                });
              }
            } catch {
              /* non-blocking */
            }
          }
        }
      }
    }
  }

  /**
   * Confirm the hole: write all four scores, then run the effects once.
   * Nothing leaves this device until the person has said the hole is right.
   */
  async function confirmHole(hole: number) {
    if (confirming) return;
    const ids = groupPlayers.map((p) => p.id);
    // Fall back to what is already saved. Re-confirming a hole you scored
    // earlier means the draft only holds the values you just changed, and
    // requiring a draft entry for everyone made the button silently do nothing.
    const resolved = ids.map((pid) => ({
      pid,
      strokes: draft[pid] ?? scoreFor(pid, hole),
      wasScored: scores.some((x) => x.playerId === pid && x.hole === hole),
    }));
    if (resolved.some((r) => r.strokes == null)) return;
    setConfirming(true);
    setError(null);

    const entered = resolved as { pid: string; strokes: number; wasScored: boolean }[];

    for (const e of entered) {
      await saveScore(e.pid, hole, e.strokes);
    }

    const listAfter: HoleScore[] = [
      ...scores.filter((x) => x.hole !== hole),
      ...entered.map((e) => ({ playerId: e.pid, hole, strokes: e.strokes })),
    ];

    await runHoleEffects(hole, entered, listAfter);
    setConfirming(false);
    setConfirmedHoles((prev) => (prev.includes(hole) ? prev : [...prev, hole]));

    // Straight on to the next hole - that is what you want standing on a tee.
    const idx = playable.findIndex((h) => h.hole === hole);
    if (idx >= 0 && idx < playable.length - 1) setCurrent(playable[idx + 1].hole);
  }

  async function readScorecard(file: File) {
    setPhotoBusy(true);
    setPhotoNote(null);
    setError(null);
    try {
      const { base64, mediaType } = await imageToBase64(file);
      const res = await authedPost("/api/parse-scores", {
        imageBase64: base64,
        mediaType,
        names: groupPlayers.map((p) => p.name),
        holes: playable.map((h) => h.hole),
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

  if (!round) {
    return (
      <div className="rounded-2xl border-[1.5px] border-amber-200 bg-amber-50 p-4">
        <p className="font-black text-amber-900">Can&apos;t load this round</p>
        <p className="mt-1 text-[13px] leading-5 text-amber-900">
          {online
            ? "Something went wrong fetching the card. Pull down to try again."
            : "You are offline and this round has not been opened on this phone yet. Get a signal once and it will work offline from then on."}
        </p>
      </div>
    );
  }
  if (!round) return <p className="text-sm text-slate-400">Round not found.</p>;
  if (holes.length === 0)
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-900">
        This course has no hole data yet. An admin needs to add par and course handicap numbers in Manage My
        Tournament, under Courses, before hole-by-hole scoring can run.
      </div>
    );
  if (!myTeeTime)
    return canManage && (round?.teeTimes.length ?? 0) > 0 ? (
      <div className="rounded-2xl border border-sand-200 bg-white p-4">
        <p className="font-black text-ink">Pick a group to score</p>
        <p className="mt-1 text-[13px] leading-5 text-slate-600">
          You are not playing in this round, but as an organizer you can enter or
          fix any group&apos;s card.
        </p>
        <div className="mt-3 space-y-1.5">
          {(round?.teeTimes ?? []).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setAdminTeeTimeId(t.id)}
              className="flex w-full items-center justify-between rounded-xl border-[1.5px] border-sand-200 bg-[#f7f6f1] px-3 py-2 text-left"
            >
              <span className="text-[13px] font-black text-ink">{t.time || "No time set"}</span>
              <span className="text-[13px] text-slate-500">
                {t.playerIds
                  .map((id) => players.find((p) => p.id === id)?.name)
                  .filter(Boolean)
                  .join(", ") || "Empty"}
              </span>
            </button>
          ))}
        </div>
      </div>
    ) : (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-900">
        You are not in a tee time for this round yet. An admin sets those in Manage My Tournament.
      </div>
    );

  const draftedCount = groupPlayers.filter(
    (p) => (draft[p.id] ?? scoreFor(p.id, current)) != null
  ).length;
  const allDrafted = groupPlayers.length > 0 && draftedCount === groupPlayers.length;

  const strokesOn = (pid: string, hole: number) =>
    allocation.find((a) => a.playerId === pid)?.byHole[hole] ?? 0;

  return (
    <div className="space-y-4">
      {!online || pending > 0 ? (
        <div
          className={`rounded-2xl border-[1.5px] p-3 ${
            online ? "border-amber-200 bg-amber-50" : "border-slate-300 bg-slate-100"
          }`}
          role="status"
          aria-live="polite"
        >
          <p className="text-[13px] font-black text-ink">
            {!online
              ? "No signal - scores are saving on your phone"
              : syncing
              ? "Catching up…"
              : `${pending} score${pending === 1 ? "" : "s"} waiting to sync`}
          </p>
          <p className="mt-0.5 text-[12px] leading-5 text-slate-600">
            Keep scoring. Everything sends itself as soon as you have a bar
            again.
          </p>
          {online && !syncing ? (
            <button
              type="button"
              onClick={() => void sync()}
              className="mt-2 rounded-xl border-[1.5px] border-fairway-900 px-3 py-1.5 text-[13px] font-black text-fairway-900"
            >
              Try now
            </button>
          ) : null}
        </div>
      ) : null}

      {canManage && (round?.teeTimes.length ?? 0) > 0 ? (
        <div className="rounded-2xl border-[1.5px] border-sand-200 bg-white p-3">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Scoring group
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(round?.teeTimes ?? []).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setAdminTeeTimeId(t.id === myTeeTime?.id ? null : t.id)}
                className={`rounded-full border-[1.5px] px-3 py-1.5 text-[13px] font-black ${
                  t.id === myTeeTime?.id
                    ? "border-fairway-900 bg-fairway-900 text-white"
                    : "border-sand-200 bg-white text-slate-600"
                }`}
              >
                {t.time || "No time"}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12px] leading-4 text-slate-500">
            As an organizer you can fix any group&apos;s card, even after it is signed.
          </p>
        </div>
      ) : null}

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

      {/* Progress, not navigation. You play a round one hole at a time, and
          letting people jump around was producing holes scored out of order. */}
      <div className="flex gap-1 overflow-x-auto pb-1" aria-label="Holes completed">
        {playable.map((h) => {
          const done = allInForHole(h.hole);
          const isNow = h.hole === current;
          return (
            <span
              key={h.hole}
              className={`h-1.5 min-w-[14px] flex-1 rounded-full ${
                isNow ? "bg-fairway-900" : done ? "bg-emerald-400" : "bg-sand-200"
              }`}
            />
          );
        })}
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
      ) : null}

      {/* Once every hole is in, signing is the only thing left. Showing the
          hole card above it left "Confirm hole 18" as the most prominent
          button on a finished card. */}
      {completedHoles === playable.length && !showAllHoles ? (
        <button
          type="button"
          onClick={() => setShowAllHoles(true)}
          className="w-full rounded-2xl border-[1.5px] border-sand-200 bg-white px-4 py-3 text-[13px] font-black text-slate-500"
        >
          Need to fix a hole? Reopen the scorecard
        </button>
      ) : null}

      {/* current hole */}
      {holeInfo && (completedHoles < playable.length || showAllHoles) ? (
        <div className="rounded-2xl border-2 border-sand-200 bg-white p-4">
          <div className="mb-3 text-center">
            <p className="font-anton text-3xl tracking-tight text-ink">Hole {holeInfo.hole}</p>
            <p className="text-[13px] font-bold text-slate-500">
              Par {holeInfo.par} · Course Hcp #{holeInfo.si}
            </p>
          </div>

          <div className="space-y-2">
            {groupPlayers.map((p) => {
              const saved = scoreFor(p.id, holeInfo.hole);
              const val = draft[p.id] ?? saved;
              const gets = strokesOn(p.id, holeInfo.hole);
              const opts = scoreOptions(holeInfo.par);
              return (
                <div key={p.id} className="rounded-xl bg-[#f7f6f1] p-2.5">
                  <div className="flex items-center gap-2">
                    <PlayerAvatar avatarId={p.avatarId} emoji={p.avatarEmoji} name={p.name} size={28} playerId={p.id} />
                    <span className="flex-1 text-[14px] font-black text-ink">
                      {p.name}
                      {gets > 0 ? (
                        <span className="ml-1 text-[12px] font-bold text-accent-dark">
                          {gets} stroke{gets === 1 ? "" : "s"} here
                        </span>
                      ) : null}
                    </span>
                    {val != null ? (
                      <span className="text-[12px] font-bold text-slate-500">
                        net {val - gets}
                      </span>
                    ) : (
                      <span className="text-[12px] font-bold text-slate-400">tap a score</span>
                    )}
                  </div>

                  {/* Buttons are built from the par of THIS hole, so the same
                      tap means Par on a 3 and on a 5. The number is what gets
                      saved; the word underneath is just how golfers say it. */}
                  <div className="mt-2 grid grid-cols-5 gap-1.5">
                    {opts.map((o) => {
                      const on = val === o.strokes;
                      return (
                        <button
                          key={o.strokes}
                          type="button"
                          disabled={confirming}
                          aria-label={`${p.name}: ${o.strokes}, ${o.spoken}`}
                          onClick={() =>
                            setDraft((d) => ({ ...d, [p.id]: o.strokes }))
                          }
                          className={`flex flex-col items-center rounded-lg border-[1.5px] py-1.5 ${
                            on ? "border-fairway-900 bg-fairway-900 text-white" : TONE_CLASS[o.tone]
                          }`}
                        >
                          <span className="text-[17px] font-black leading-none">{o.strokes}</span>
                          <span className="mt-0.5 text-[9px] font-black uppercase leading-none">
                            {o.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const raw = window.prompt(`${p.name} - how many shots on hole ${holeInfo.hole}?`);
                      const n = Number((raw ?? "").trim());
                      if (Number.isFinite(n) && n >= 1 && n <= 20) {
                        setDraft((d) => ({ ...d, [p.id]: n }));
                      }
                    }}
                    className="mt-1 w-full text-[11px] font-bold text-slate-400"
                  >
                    Something worse? Enter it by hand
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={holeIdx <= 0 || confirming}
              onClick={() => {
                setDraft({});
                setCurrent(playable[holeIdx - 1].hole);
              }}
              className="rounded-2xl border-[1.5px] border-slate-300 px-3 py-3 text-[13px] font-black text-slate-600 disabled:opacity-40"
            >
              ‹ Hole {holeIdx > 0 ? playable[holeIdx - 1].hole : ""}
            </button>
            <button
              type="button"
              disabled={!allDrafted || confirming}
              onClick={() => void confirmHole(holeInfo.hole)}
              className="flex-1 rounded-2xl bg-fairway-900 px-4 py-3.5 font-black text-white disabled:opacity-40"
            >
              {confirming
                ? "Saving…"
                : !allDrafted
                ? `${groupPlayers.length - draftedCount} still to score`
                : allInForHole(holeInfo.hole)
                ? `Save changes to hole ${holeInfo.hole}`
                : `Confirm hole ${holeInfo.hole}`}
            </button>
          </div>

          <p className="mt-2 text-center text-[12px] leading-5 text-slate-500">
            Nothing is saved or announced until you confirm. Check the numbers
            first - a confirmed hole sends the callouts.
          </p>
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
          onClick={() => {
            setCelebrationQueue((q) => {
              setCelebration(q[0] ?? null);
              return q.slice(1);
            });
          }}
        >
          <div className="text-center">
            <p className="text-[72px] leading-none">
              {celebration.key === "ace" ? "🕳️" : celebration.key === "albatross" ? "🦅" : celebration.key === "eagle" ? "🦅" : "🐦"}
            </p>
            <p className="mt-4 font-anton text-3xl leading-tight tracking-tight text-white">
              {celebration.text}
            </p>
            <p className="mt-4 text-sm font-bold text-white/60">
              {celebrationQueue.length > 0
                ? `Tap for the next one (${celebrationQueue.length} more)`
                : "Tap anywhere to keep scoring"}
            </p>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm font-bold text-red-600">{error}</p> : null}

      <div className="rounded-2xl bg-[#f3efe6] px-3 py-2 text-[13px] font-bold text-ink">
        {completedHoles} of {playable.length} holes in
        {firstIncomplete ? ` · next gap: hole ${firstIncomplete.hole}` : " · card complete"}
      </div>

      {completedHoles < playable.length ? (
        <p className="text-[12px] leading-5 text-slate-500">
          Anyone in your tee time can enter scores for the group. When all {playable.length} holes are in,
          every player confirms the card before it counts.
        </p>
      ) : null}
    </div>
  );
}
