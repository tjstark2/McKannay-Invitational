"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { TripStateProvider } from "@/features/trip/state/TripStateContext";
import { SetMatchupsScreen } from "@/features/trip/screens/admin/SetMatchupsScreen";
import {
  loadRoundSetups,
  saveRoundHoles,
  saveSegments,
  FORMAT_LABELS,
  type RoundSetup,
  type Segment,
  type SegmentFormat,
} from "@/lib/supabase/roundSegments";
import {
  loadRoster,
  createRound,
  updateRoundFields,
  deleteRound,
  setRoundFormatAndRebuild,
  addTeeTime,
  updateTeeTime,
  deleteTeeTime,
  setTeeTimePlayers,
  startRound,
  finishRound,
  reopenRound,
  setCurrentRound,
  type RosterPlayerLite,
} from "@/lib/supabase/roundsAdmin";
import { loadCoursesWithHoleStatus, loadCourseTees, type CourseLite, type CourseTee } from "@/lib/supabase/courseHoles";
import { loadTripSettings } from "@/lib/supabase/tripSettings";
import { fromTimeInput, isValidClock, toTimeInput } from "@/lib/teeTime";
import { notify, notifyEvent } from "@/lib/notify";
import { useAuth } from "@/features/auth/AuthContext";

const FORMATS: SegmentFormat[] = ["best_ball", "match_play", "net_score", "scramble", "casual"];
const inputClass =
  "w-full rounded-xl border-[1.5px] border-sand-200 bg-white px-3 py-2 text-ink outline-none focus:border-fairway-900";
const labelClass = "block text-xs font-black uppercase tracking-wide text-slate-500";

export function RoundsTab({ tripId, joinCode }: { tripId: string; joinCode?: string }) {
  const { user } = useAuth();
  const [rounds, setRounds] = useState<RoundSetup[]>([]);
  const [roster, setRoster] = useState<RosterPlayerLite[]>([]);
  const [courses, setCourses] = useState<CourseLite[]>([]);
  const [teesByCourse, setTeesByCourse] = useState<Record<string, CourseTee[]>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [allowanceInfo, setAllowanceInfo] = useState(false);
  const [rebuild, setRebuild] = useState<{ round: RoundSetup; format: string; gs: number | null } | null>(null);
  const [matchupRound, setMatchupRound] = useState<string | null>(null);
  const [newTime, setNewTime] = useState<Record<string, string>>({});
  // Hole-by-hole rounds can't score without a full card, so the start gate is
  // stricter for those trips.
  const [holeByHole, setHoleByHole] = useState(false);
  // Starting or finishing a round tells all ten players, so both ask first.
  const [confirmStart, setConfirmStart] = useState<string | null>(null);
  const [confirmFinish, setConfirmFinish] = useState<string | null>(null);
  // Tee-time lists get long with ten players; keep them foldable.
  const [teeOpen, setTeeOpen] = useState<Record<string, boolean>>({});

  const refresh = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const [rs, ros, cs, settings] = await Promise.all([
      loadRoundSetups(supabase, tripId),
      loadRoster(supabase, tripId),
      loadCoursesWithHoleStatus(supabase, tripId),
      loadTripSettings(supabase, tripId),
    ]);
    setRounds(rs);
    setRoster(ros);
    setCourses(cs);
    setHoleByHole(settings?.scoringMode === "hole_by_hole");
    const tees: Record<string, CourseTee[]> = {};
    for (const c of cs) tees[c.id] = await loadCourseTees(supabase, c.id);
    setTeesByCourse(tees);
  }, [tripId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function doStartRound(roundId: string, title: string) {
    const sb = getSupabaseClient();
    if (!sb) { setError("No connection to the database."); return; }
    note("Starting…");
    const st = await startRound(sb, roundId);
    if (!st.ok) { setError(`Couldn't start the round: ${st.error}`); return; }
    const cr = await setCurrentRound(sb, tripId, roundId);
    if (!cr.ok) setError(`Round started, but couldn't set it as current: ${cr.error}`);
    await notify({
      userIds: roster.map((x) => x.accountId).filter((id) => id !== user?.id),
      title,
      message: `${title} is live. Enter your scores as you play.`,
      category: "round_day",
      url: joinCode ? `/t/${joinCode}` : "/home",
    });
    void notifyEvent("voting_concluded_sweep", tripId);
    note("Round started");
    refresh();
  }

  async function doFinishRound(roundId: string, title: string) {
    const sb = getSupabaseClient();
    if (!sb) { setError("No connection to the database."); return; }
    note("Finishing…");
    const fi = await finishRound(sb, roundId);
    if (!fi.ok) { setError(`Couldn't finish the round: ${fi.error}`); return; }
    await notify({
      userIds: roster.map((x) => x.accountId).filter((id) => id !== user?.id),
      title,
      message: `${title} is in the books. Have a look at where things stand.`,
      category: "round_day",
      url: joinCode ? `/t/${joinCode}` : "/home",
    });
    void notifyEvent("voting_concluded_sweep", tripId);
    note("Round finished");
    refresh();
  }

  const note = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  function segFor(r: RoundSetup, teeTimeId: string): Segment {
    return (
      r.segments.find((s) => s.teeTimeId === teeTimeId) ?? {
        teeTimeId,
        format: "best_ball",
        points: 0,
        allowancePct: 100,
      }
    );
  }

  function updateSeg(roundId: string, teeTimeId: string, patch: Partial<Segment>) {
    setRounds((prev) =>
      prev.map((r) => {
        if (r.id !== roundId) return r;
        const existing = r.segments.find((s) => s.teeTimeId === teeTimeId);
        const next = existing
          ? r.segments.map((s) => (s.teeTimeId === teeTimeId ? { ...s, ...patch } : s))
          : [...r.segments, { ...segFor(r, teeTimeId), ...patch }];
        return { ...r, segments: next };
      })
    );
  }

  async function persistSegments(r: RoundSetup) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setBusy(true);
    const res = await saveSegments(supabase, r.id, r.teeTimes.map((t) => segFor(r, t.id)));
    setBusy(false);
    if (!res.ok) return setError(res.error || "Couldn't save.");
    note(`${r.title} saved`);
  }

  async function patchRound(roundId: string, patch: Record<string, unknown>, msg?: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const res = await updateRoundFields(supabase, roundId, patch);
    if (!res.ok) return setError(res.error || "Couldn't save.");
    if (msg) note(msg);
    refresh();
  }

  async function doRebuild() {
    if (!rebuild) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setBusy(true);
    const res = await setRoundFormatAndRebuild(
      supabase,
      { id: rebuild.round.id, title: rebuild.round.title },
      rebuild.format,
      rebuild.gs,
      roster
    );
    setBusy(false);
    setRebuild(null);
    if (!res.ok) return setError(res.error || "Couldn't rebuild matches.");
    note(`Format set - ${res.built} match${res.built === 1 ? "" : "es"} built`);
    refresh();
  }

  const teamOf = (pid: string) => roster.find((p) => p.id === pid)?.team;

  const startTarget = rounds.find((x) => x.id === confirmStart);
  const finishTarget = rounds.find((x) => x.id === confirmFinish);

  return (
    <div className="space-y-3">
      {startTarget ? (
        <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5">
            <p className="font-black text-ink">Start {startTarget.title}?</p>
            <p className="mt-1 text-[13px] leading-5 text-slate-600">
              This tells everyone the round is live and opens scoring. You can
              still change tee times and matchups afterwards.
            </p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setConfirmStart(null)}
                className="flex-1 rounded-2xl border-[1.5px] border-slate-300 px-4 py-3 font-black text-slate-600">
                Not yet
              </button>
              <button type="button" onClick={async () => {
                const t = startTarget;
                setConfirmStart(null);
                await doStartRound(t.id, t.title);
              }} className="flex-1 rounded-2xl bg-fairway-900 px-4 py-3 font-black text-white">
                Start it
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {finishTarget ? (
        <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5">
            <p className="font-black text-ink">Finish {finishTarget.title}?</p>
            <p className="mt-1 text-[13px] leading-5 text-slate-600">
              Scoring closes for everyone and the awards vote for this round
              ends. You can reopen it afterwards if you need to.
            </p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setConfirmFinish(null)}
                className="flex-1 rounded-2xl border-[1.5px] border-slate-300 px-4 py-3 font-black text-slate-600">
                Not yet
              </button>
              <button type="button" onClick={async () => {
                const t = finishTarget;
                setConfirmFinish(null);
                await doFinishRound(t.id, t.title);
              }} className="flex-1 rounded-2xl bg-fairway-900 px-4 py-3 font-black text-white">
                Finish it
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <p className="text-[13px] leading-5 text-slate-600">
        Everything about each round: the course and tees, how many holes, who is out at what time, what each
        group is playing, and starting or finishing the round on the day.
      </p>

      {rounds.map((r) => {
        const isOpen = open === r.id;
        const total = r.teeTimes.reduce((sum, t) => sum + Number(segFor(r, t.id).points || 0), 0);
        const zeroPoint = r.teeTimes.filter((t) => Number(segFor(r, t.id).points || 0) === 0).length;
        const course = courses.find((c) => c.id === r.courseId);
        const tees = r.courseId ? teesByCourse[r.courseId] ?? [] : [];
        const status = r.finishedAt ? "Finished" : r.startedAt ? "In progress" : "Not started";
        // A group holds at most 4, so 10 players needs 3 tee times, 8 needs 2.
        const neededTeeTimes = Math.ceil(roster.length / 4);
        const assigned = new Set(r.teeTimes.flatMap((t) => t.playerIds));
        const unassigned = roster.filter((p) => !assigned.has(p.id));
        const missingTimes = r.teeTimes.filter((t) => !isValidClock(t.time)).length;
        // A field round's whole job is to CREATE the tee times, so it must not
        // be blocked for not having them yet. Only head-to-head rounds need a
        // finished tee sheet before matchups can be drawn.
        const isField = r.format === "net_score" || r.format === "casual";
        const matchupBlockers: string[] = [];
        if (roster.length === 0) matchupBlockers.push("Add players first.");
        else if (isField) {
          // nothing else to check - the draw builds the groups and the times
        } else {
          if (r.teeTimes.length < neededTeeTimes)
            matchupBlockers.push(
              `${roster.length} players needs at least ${neededTeeTimes} tee times - you have ${r.teeTimes.length}.`
            );
          if (missingTimes > 0) matchupBlockers.push(`${missingTimes} tee time${missingTimes === 1 ? "" : "s"} still need a valid time.`);
          if (unassigned.length > 0)
            matchupBlockers.push(
              `${unassigned.length} player${unassigned.length === 1 ? " is" : "s are"} not in a tee time: ${unassigned
                .map((p) => p.name)
                .join(", ")}.`
            );
        }
        const matchupsReady = matchupBlockers.length === 0;

        // Starting a round it can't score leaves everyone stuck on the day, so
        // check the course data is actually there first.
        const startBlockers: string[] = [];
        const badTimes = r.teeTimes.filter((t) => !isValidClock(t.time)).length;
        if (badTimes > 0)
          startBlockers.push(
            `${badTimes} tee time${badTimes === 1 ? " has" : "s have"} no valid time set`
          );
        if (!r.courseId) startBlockers.push("this round has no course picked");
        else if (!course) startBlockers.push("the course for this round is missing");
        else {
          if (!course.rating || !course.slope)
            startBlockers.push(`${course.name} is missing its rating or slope`);
          if (holeByHole && course.holeCount < 18)
            startBlockers.push(
              `${course.name} only has ${course.holeCount} of 18 holes entered`
            );
        }
        const canStart = startBlockers.length === 0;
        return (
          <div key={r.id} className="overflow-hidden rounded-2xl border border-sand-200 bg-white">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : r.id)}
              className="flex w-full items-center gap-3 p-3 text-left"
            >
              <span className="flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-black text-ink">{r.title}</span>
                  {r.startedAt && !r.finishedAt ? (
                    <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-950">
                      In progress
                    </span>
                  ) : null}
                  {r.finishedAt ? (
                    <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-900">
                      Finished
                    </span>
                  ) : null}
                </span>
                <span className="block text-[13px] text-slate-500">
                  {course?.name ?? "No course"} ·{" "}
                  {r.holesCount === 9 ? `9 holes (${r.nine === "back" ? "back" : "front"})` : "18 holes"} ·{" "}
                  {total} pts · {status}
                </span>
              </span>
              <span className="font-black text-slate-300">{isOpen ? "▾" : "›"}</span>
            </button>

            {isOpen ? (
              <div className="space-y-4 border-t border-slate-100 p-3">
                {/* --- day of --- */}
                <div className="rounded-2xl bg-[#f3efe6] p-3">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">On the day</p>
                  {!r.startedAt && !canStart ? (
                    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                      <p className="text-[13px] font-black text-amber-900">
                        Can&apos;t start this round yet
                      </p>
                      <p className="mt-0.5 text-[13px] leading-5 text-amber-900">
                        {startBlockers.join("; ")}. Fix it on the Courses tab and this
                        will unlock.
                      </p>
                    </div>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {!r.startedAt ? (
                      <button type="button" disabled={!canStart} onClick={() => {
                        if (!canStart) return;
                        setConfirmStart(r.id);
                      }} className="rounded-xl bg-fairway-900 px-3 py-2 text-sm font-black text-white disabled:opacity-50">
                        Start round
                      </button>
                    ) : !r.finishedAt ? (
                      <button type="button" onClick={() => setConfirmFinish(r.id)}
                        className="rounded-xl bg-fairway-900 px-3 py-2 text-sm font-black text-white">
                        Finish round
                      </button>
                    ) : null}
                    {r.finishedAt ? (
                      <button type="button" onClick={async () => {
                        const sb = getSupabaseClient(); if (!sb) return;
                        await reopenRound(sb, r.id); note("Round reopened"); refresh();
                      }} className="rounded-xl border-[1.5px] border-fairway-900 px-3 py-2 text-sm font-black text-fairway-900">
                        Reopen round
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={!matchupsReady}
                      onClick={() => setMatchupRound(r.id)}
                      className="rounded-xl border-[1.5px] border-accent bg-accent/10 px-3 py-2 text-sm font-black text-accent-dark disabled:border-sand-200 disabled:bg-white disabled:text-slate-400"
                    >
                      🎲 Set the Matchups
                    </button>
                  </div>
                  {!matchupsReady ? (
                    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-5 text-amber-900">
                      <b>Finish the tee times before drawing matchups.</b>
                      {matchupBlockers.map((b) => (
                        <span key={b} className="mt-0.5 block">
                          • {b}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* --- rebuild matches --- */}
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
                  <p className="text-xs font-black uppercase tracking-wide text-amber-900">Rebuild matches from one format</p>
                  <p className="mt-1 text-[12px] leading-5 text-amber-900">
                    Use this to reset the whole round to one format. It replaces every match in the round and
                    any scores already entered. To set different formats per tee time, use the tee time cards
                    above instead.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      { label: "2v2 Best Ball", f: "best_ball", gs: 2 },
                      { label: "1v1 Singles", f: "match_play", gs: null },
                      { label: "4v4 Scramble", f: "scramble", gs: 4 },
                    ].map((o) => (
                      <button key={o.label} type="button"
                        onClick={() => setRebuild({ round: r, format: o.f, gs: o.gs })}
                        className="rounded-full bg-white px-2.5 py-1 text-[12px] font-black text-slate-600">
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* --- details --- */}
                <div className="grid grid-cols-2 gap-2">
                  <label className="col-span-2">
                    <span className={labelClass}>Round title</span>
                    <input className={inputClass} defaultValue={r.title}
                      onBlur={(e) => patchRound(r.id, { title: e.target.value })} />
                  </label>
                  <label>
                    <span className={labelClass}>Date</span>
                    <input className={inputClass} defaultValue={r.dateLabel} placeholder="Sept 14"
                      onBlur={(e) => patchRound(r.id, { date_label: e.target.value })} />
                  </label>
                  <label>
                    <span className={labelClass}>Arrival time</span>
                    <input className={inputClass} defaultValue={r.arrivalTime} placeholder="7:30 AM"
                      onBlur={(e) => patchRound(r.id, { arrival_time: e.target.value })} />
                  </label>
                  <label className="col-span-2">
                    <span className={labelClass}>Course</span>
                    <select className={inputClass} value={r.courseId ?? ""}
                      onChange={(e) => patchRound(r.id, { course_id: e.target.value || null, tee_id: null }, "Course set")}>
                      <option value="">Pick a course</option>
                      {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </label>
                  <label className="col-span-2">
                    <span className={labelClass}>Tees for this round</span>
                    <select className={inputClass} value={r.teeId ?? ""}
                      onChange={(e) => patchRound(r.id, { tee_id: e.target.value || null }, "Tees set")}>
                      <option value="">
                        {tees.length ? "Pick a tee set" : "Add tee sets on the Courses tab"}
                      </option>
                      {tees.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} {t.rating ?? "?"}/{t.slope ?? "?"}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* --- holes --- */}
                <div>
                  <p className="mb-1 text-xs font-black uppercase tracking-wide text-slate-500">Holes played</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={async () => {
                      const sb = getSupabaseClient(); if (!sb) return;
                      await saveRoundHoles(sb, r.id, 18, null); refresh();
                    }} className={`flex-1 rounded-xl border-2 px-3 py-2 text-sm font-black ${r.holesCount === 18 ? "border-fairway-900 bg-fairway-900/5 text-ink" : "border-sand-200 text-slate-500"}`}>
                      18 holes
                    </button>
                    <button type="button" onClick={async () => {
                      const sb = getSupabaseClient(); if (!sb) return;
                      await saveRoundHoles(sb, r.id, 9, r.nine ?? "front"); refresh();
                    }} className={`flex-1 rounded-xl border-2 px-3 py-2 text-sm font-black ${r.holesCount === 9 ? "border-fairway-900 bg-fairway-900/5 text-ink" : "border-sand-200 text-slate-500"}`}>
                      9 holes
                    </button>
                  </div>
                  {r.holesCount === 9 ? (
                    <>
                      <div className="mt-2 flex gap-2">
                        {(["front", "back"] as const).map((n) => (
                          <button key={n} type="button" onClick={async () => {
                            const sb = getSupabaseClient(); if (!sb) return;
                            await saveRoundHoles(sb, r.id, 9, n); refresh();
                          }} className={`flex-1 rounded-xl border-2 px-3 py-2 text-sm font-black capitalize ${(r.nine ?? "front") === n ? "border-accent bg-accent/10 text-ink" : "border-sand-200 text-slate-500"}`}>
                            {n} nine
                          </button>
                        ))}
                      </div>
                      <p className="mt-1 text-[12px] leading-5 text-slate-500">
                        On a 9-hole round everyone gets half their strokes, on the hardest holes within that nine.
                      </p>
                    </>
                  ) : null}
                </div>

                {/* --- tee times --- */}
                <div>
                  <button
                    type="button"
                    onClick={() => setTeeOpen((prev) => ({ ...prev, [r.id]: prev[r.id] === false }))}
                    className="mb-1 flex w-full items-center justify-between text-left"
                  >
                    <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                      Tee times ({r.teeTimes.length})
                    </span>
                    <span className="text-xs font-black text-slate-400">
                      {teeOpen[r.id] === false ? "Show" : "Hide"}
                    </span>
                  </button>
                  <div className={`space-y-2 ${teeOpen[r.id] === false ? "hidden" : ""}`}>
                    {r.teeTimes.map((t) => {
                      const s = segFor(r, t.id);
                      return (
                        <div key={t.id} className="rounded-xl bg-[#f7f6f1] p-2.5">
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              aria-label="Tee time"
                              className="w-32 rounded-lg border-[1.5px] border-sand-200 px-2 py-1.5 text-sm font-black"
                              defaultValue={toTimeInput(t.time)}
                              onChange={async (e) => {
                                const next = fromTimeInput(e.target.value);
                                if (!next) return; // cleared box: keep the old time
                                const sb = getSupabaseClient(); if (!sb) return;
                                await updateTeeTime(sb, t.id, next); refresh();
                              }}
                            />
                            <span className="text-[12px] text-slate-500">{t.playerCount} players</span>
                            <button type="button" aria-label="Remove tee time" className="ml-auto text-slate-400"
                              onClick={async () => {
                                const sb = getSupabaseClient(); if (!sb) return;
                                await deleteTeeTime(sb, t.id); refresh();
                              }}>
                              ✕
                            </button>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1">
                            {roster.map((p) => {
                              const inGroup = t.playerIds.includes(p.id);
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={async () => {
                                    const sb = getSupabaseClient(); if (!sb) return;
                                    const next = inGroup ? t.playerIds.filter((x) => x !== p.id) : [...t.playerIds, p.id];
                                    await setTeeTimePlayers(sb, t.id, next); refresh();
                                  }}
                                  className={`rounded-full px-2 py-1 text-[12px] font-black ${
                                    inGroup
                                      ? teamOf(p.id) === "A" ? "bg-team-north text-white" : "bg-team-south text-white"
                                      : "bg-white text-slate-500"
                                  }`}
                                >
                                  {p.name}
                                </button>
                              );
                            })}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {FORMATS.map((f) => (
                              <button key={f} type="button" onClick={() => updateSeg(r.id, t.id, { format: f })}
                                className={`rounded-full px-2.5 py-1 text-[12px] font-black ${s.format === f ? "bg-fairway-900 text-white" : "bg-white text-slate-500"}`}>
                                {FORMAT_LABELS[f]}
                              </button>
                            ))}
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <label className="block">
                              <span className="text-[11px] font-black uppercase text-slate-500">Points</span>
                              <input inputMode="decimal" value={String(s.points ?? 0)}
                                onChange={(e) => updateSeg(r.id, t.id, { points: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 })}
                                className="w-full rounded-lg border-[1.5px] border-sand-200 px-2 py-1.5 font-bold outline-none" />
                            </label>
                            <label className="block">
                              <span className="text-[11px] font-black uppercase text-slate-500">
                                Handicap %{" "}
                                <button type="button" onClick={() => setAllowanceInfo(true)} className="text-accent-dark underline">
                                  what?
                                </button>
                              </span>
                              <div className="flex gap-1">
                                {[0, 50, 100].map((pct) => (
                                  <button key={pct} type="button" onClick={() => updateSeg(r.id, t.id, { allowancePct: pct })}
                                    className={`flex-1 rounded-lg border-[1.5px] py-1.5 text-[12px] font-black ${s.allowancePct === pct ? "border-fairway-900 bg-fairway-900 text-white" : "border-sand-200 text-slate-500"}`}>
                                    {pct}%
                                  </button>
                                ))}
                              </div>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-2 flex gap-2">
                    <input
                      type="time"
                      aria-label="New tee time"
                      className={inputClass}
                      value={newTime[r.id] ?? ""}
                      onChange={(e) => setNewTime({ ...newTime, [r.id]: e.target.value })}
                    />
                    <button type="button" disabled={!isValidClock(newTime[r.id] ?? "")}
                      onClick={async () => {
                        const time = fromTimeInput(newTime[r.id] ?? "");
                        if (!time) return;
                        const sb = getSupabaseClient(); if (!sb) return;
                        await addTeeTime(sb, r.id, time, r.teeTimes.length + 1);
                        setNewTime({ ...newTime, [r.id]: "" }); refresh();
                      }}
                      className="whitespace-nowrap rounded-xl bg-fairway-900 px-3 py-2 text-sm font-black text-white disabled:opacity-50">
                      Add tee time
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-[#f3efe6] px-3 py-2 text-[13px] font-bold text-ink">
                  Round total: {total} point{total === 1 ? "" : "s"}
                </div>
                {zeroPoint > 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
                    {zeroPoint} tee time{zeroPoint === 1 ? " has" : "s have"} 0 points.
                  </div>
                ) : null}

                <button type="button" disabled={busy || r.teeTimes.length === 0} onClick={() => persistSegments(r)}
                  className="w-full rounded-2xl bg-fairway-900 px-4 py-3 font-black text-white disabled:opacity-50">
                  {busy ? "Saving…" : "Save tee time formats"}
                </button>


                <button type="button"
                  onClick={async () => {
                    const sb = getSupabaseClient(); if (!sb) return;
                    if (!confirm(`Delete ${r.title}? This removes its matches and scores.`)) return;
                    await deleteRound(sb, r.id); note("Round deleted"); setOpen(null); refresh();
                  }}
                  className="w-full rounded-2xl border-[1.5px] border-red-300 px-4 py-2.5 text-sm font-black text-red-600">
                  Delete this round
                </button>
              </div>
            ) : null}
          </div>
        );
      })}

      <button type="button"
        onClick={async () => {
          const sb = getSupabaseClient(); if (!sb) return;
          const res = await createRound(sb, tripId, {
            title: `Round ${rounds.length + 1}`,
            roundNumber: rounds.length + 1,
            courseId: courses[0]?.id ?? null,
            dateLabel: "",
            arrivalTime: "",
          });
          if (!res.ok) return setError(res.error || "Couldn't add a round.");
          note("Round added"); refresh();
        }}
        className="w-full rounded-2xl border-2 border-dashed border-sand-200 px-4 py-3 font-black text-slate-500">
        + Add a round
      </button>

      {error ? (
        <div className="fixed inset-x-4 bottom-6 z-[200] rounded-2xl border-2 border-red-300 bg-white p-3 shadow-xl">
          <p className="text-[13px] font-bold leading-5 text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="mt-2 w-full rounded-xl bg-red-600 px-3 py-2 text-sm font-black text-white"
          >
            Close
          </button>
        </div>
      ) : null}
      {toast ? (
        <div className="fixed inset-x-0 bottom-8 z-[200] flex justify-center">
          <span className="rounded-full bg-fairway-900 px-5 py-2 text-sm font-black text-white shadow-lg">
            {toast}
          </span>
        </div>
      ) : null}

      {/* rebuild confirm */}
      {rebuild ? (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 p-5">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5">
            <h3 className="font-anton text-2xl tracking-tight text-ink">This deletes scores</h3>
            <p className="mt-2 text-[14px] leading-6 text-slate-600">
              Rebuilding <b>{rebuild.round.title}</b> replaces every match in the round with fresh ones built
              from the roster order. Any scores already entered for this round go with them.
            </p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setRebuild(null)}
                className="flex-1 rounded-2xl border-[1.5px] border-slate-300 px-4 py-3 font-black text-slate-600">
                Go back
              </button>
              <button type="button" onClick={doRebuild} disabled={busy}
                className="flex-1 rounded-2xl bg-red-600 px-4 py-3 font-black text-white disabled:opacity-50">
                {busy ? "Working…" : "Rebuild"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* matchups - reuses the in-tournament screen inside its own data provider */}
      {matchupRound && joinCode ? (
        <TripStateProvider initialJoinCode={joinCode}>
          <SetMatchupsScreen
            initialRoundId={matchupRound}
            onClose={() => {
              setMatchupRound(null);
              refresh();
            }}
          />
        </TripStateProvider>
      ) : null}

      {allowanceInfo ? (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 p-5">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5">
            <h3 className="font-anton text-2xl tracking-tight text-ink">Handicap allowance</h3>
            <p className="mt-2 text-[14px] leading-6 text-slate-600">
              How much of the handicap difference gets given. Say a 14 plays a 10:
            </p>
            <ul className="mt-2 space-y-1 text-[14px] leading-6 text-slate-600">
              <li><b>100%</b> - the 14 gets 4 strokes, on course handicap holes 1 to 4.</li>
              <li><b>50%</b> - the 14 gets 2 strokes, on holes 1 and 2.</li>
              <li><b>0%</b> - no strokes, straight up.</li>
            </ul>
            <p className="mt-2 text-[13px] leading-5 text-slate-500">Anything left over rounds up.</p>
            <button type="button" onClick={() => setAllowanceInfo(false)}
              className="mt-4 w-full rounded-2xl bg-fairway-900 px-4 py-3 font-black text-white">
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
