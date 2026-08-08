"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  loadCoursesWithHoleStatus,
  loadCourseHoles,
  saveCourseHoles,
  imageToBase64,
  createCourse,
  updateCourse,
  type CourseLite,
  type CourseHole,
} from "@/lib/supabase/courseHoles";

const inputClass =
  "w-full rounded-xl border-[1.5px] border-sand-200 bg-white px-3 py-2 text-ink outline-none focus:border-fairway-900";
const labelClass = "block text-xs font-black uppercase tracking-wide text-slate-500";

type Row = { hole: number; par: string; si: string };

const blankRows = (): Row[] =>
  Array.from({ length: 18 }, (_, i) => ({ hole: i + 1, par: "", si: "" }));

export function CourseHolesTab({ tripId }: { tripId: string }) {
  const [courses, setCourses] = useState<CourseLite[]>([]);
  const [active, setActive] = useState<CourseLite | null>(null);
  const [rows, setRows] = useState<Row[]>(blankRows());
  const [tee, setTee] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalConfirm, setFinalConfirm] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [parsedNote, setParsedNote] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [nc, setNc] = useState({ name: "", par: "72", teeName: "Blue", yardage: "", rating: "", slope: "" });
  const [details, setDetails] = useState({ name: "", par: "", teeName: "", yardage: "", rating: "", slope: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setCourses(await loadCoursesWithHoleStatus(supabase, tripId));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  // ---- live validation --------------------------------------------------
  const check = useMemo(() => {
    const parErr = new Set<number>();
    const siErr = new Set<number>();
    const siCount = new Map<number, number>();
    rows.forEach((r) => {
      const p = Number(r.par);
      const s = Number(r.si);
      if (r.par === "" || !(p >= 2 && p <= 8)) parErr.add(r.hole);
      if (r.si === "" || !(s >= 1 && s <= 18)) siErr.add(r.hole);
      else siCount.set(s, (siCount.get(s) ?? 0) + 1);
    });
    const dupes = new Set<number>();
    rows.forEach((r) => {
      const s = Number(r.si);
      if (r.si !== "" && (siCount.get(s) ?? 0) > 1) dupes.add(r.hole);
    });
    const missingSi = [...Array(18)].map((_, i) => i + 1).filter((n) => !siCount.has(n));
    const ok = parErr.size === 0 && siErr.size === 0 && dupes.size === 0;
    return { parErr, siErr, dupes, missingSi, ok };
  }, [rows]);

  async function openCourse(c: CourseLite) {
    setActive(c);
    setError(null);
    setSaved(null);
    setParsedNote(null);
    setTee(c.teeName ?? "");
    setDetails({
      name: c.name ?? "",
      par: c.par != null ? String(c.par) : "",
      teeName: c.teeName ?? "",
      yardage: c.yardage != null ? String(c.yardage) : "",
      rating: c.rating != null ? String(c.rating) : "",
      slope: c.slope != null ? String(c.slope) : "",
    });
    const supabase = getSupabaseClient();
    if (supabase && c.holeCount > 0) {
      const existing = await loadCourseHoles(supabase, c.id);
      const map = new Map(existing.map((h) => [h.hole, h]));
      setRows(
        blankRows().map((r) => {
          const e = map.get(r.hole);
          return e ? { hole: r.hole, par: String(e.par), si: String(e.si) } : r;
        })
      );
    } else {
      setRows(blankRows());
    }
  }

  const cellId = (hole: number, key: "par" | "si") => `ch-${key}-${hole}`;

  // Move focus AFTER React has committed the new value, otherwise the re-render
  // steals focus back and the jump looks like it did nothing.
  function focusCell(hole: number, key: "par" | "si") {
    if (hole < 1 || hole > 18) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(cellId(hole, key)) as HTMLInputElement | null;
      if (!el) return;
      el.focus();
      el.select();
    });
  }

  function advanceFrom(hole: number, key: "par" | "si") {
    if (key === "par") focusCell(hole, "si");
    else focusCell(hole + 1, "par");
  }

  function setCell(hole: number, key: "par" | "si", value: string) {
    const clean = value.replace(/[^0-9]/g, "").slice(0, 2);
    setRows((prev) => prev.map((r) => (r.hole === hole ? { ...r, [key]: clean } : r)));
    // Par is always one digit, so jump straight on. Course handicap can be two
    // digits, so only jump when it can't grow (2-9, or already two digits).
    if (key === "par" && clean.length >= 1) advanceFrom(hole, "par");
    if (key === "si" && (clean.length === 2 || (clean.length === 1 && Number(clean) >= 2))) {
      advanceFrom(hole, "si");
    }
  }

  async function readPhoto(file: File) {
    setBusy(true);
    setError(null);
    setParsedNote(null);
    try {
      const { base64, mediaType } = await imageToBase64(file);
      const res = await fetch("/api/parse-scorecard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Couldn't read that scorecard.");
      const map = new Map(
        ((data.holes as CourseHole[]) ?? []).map((h) => [Number(h.hole), h])
      );
      setRows(
        blankRows().map((r) => {
          const h = map.get(r.hole);
          return h
            ? {
                hole: r.hole,
                par: Number.isFinite(h.par) ? String(h.par) : "",
                si: Number.isFinite(h.si) ? String(h.si) : "",
              }
            : { ...r, par: "", si: "" };
        })
      );
      if (data.tee && !tee) setTee(String(data.tee));
      setParsedNote("Filled in from the photo. Check every hole before you save.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that scorecard.");
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!active) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setBusy(true);
    const holes: CourseHole[] = rows.map((r) => ({
      hole: r.hole,
      par: Number(r.par),
      si: Number(r.si),
    }));
    const res = await saveCourseHoles(supabase, active.id, holes);
    setBusy(false);
    setFinalConfirm(false);
    if (!res.ok) {
      setError(res.error || "Couldn't save.");
      return;
    }
    setSaved(`${active.name} is set - all 18 holes saved.`);
    setActive(null);
    refresh();
  }

  // ---------------- course list ----------------
  if (!active) {
    const missing = courses.filter((c) => c.holeCount < 18);
    return (
      <div className="space-y-3">
        <p className="text-[13px] leading-5 text-slate-600">
          Hole-by-hole scoring needs the par and course handicap number for all 18 holes of each course. The
          course handicap number is the hole ranking from 1 to 18, and it decides who gets strokes where.
        </p>

        {saved ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
            {saved}
          </div>
        ) : null}

        {courses.length === 0 ? (
          <p className="text-sm text-slate-400">No courses yet. Add them in the tournament&apos;s Admin area.</p>
        ) : null}

        <div className="space-y-2">
          {courses.map((c) => {
            const done = c.holeCount >= 18;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => openCourse(c)}
                className={`flex w-full items-center gap-3 rounded-2xl border-[1.5px] p-3 text-left ${
                  done ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/60"
                }`}
              >
                <span className="text-xl">{done ? "\u2713" : "!"}</span>
                <span className="flex-1">
                  <span className="block font-black text-ink">{c.name}</span>
                  <span className="block text-[13px] text-slate-500">
                    {done
                      ? "All 18 holes set"
                      : c.holeCount > 0
                      ? `${c.holeCount} of 18 holes`
                      : "Needs par and course handicap numbers"}
                    {c.rating && c.slope ? ` \u00b7 ${c.rating}/${c.slope}` : " \u00b7 rating/slope missing"}
                  </span>
                </span>
                <span className="font-black text-slate-300">&rsaquo;</span>
              </button>
            );
          })}
        </div>

        {adding ? (
          <div className="rounded-2xl border-[1.5px] border-sand-200 p-3">
            <p className="mb-2 font-black text-ink">New course</p>
            <div className="space-y-2">
              <input className={inputClass} placeholder="Course name" value={nc.name}
                onChange={(e) => setNc({ ...nc, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <input className={inputClass} placeholder="Par (72)" inputMode="numeric" value={nc.par}
                  onChange={(e) => setNc({ ...nc, par: e.target.value })} />
                <input className={inputClass} placeholder="Tees (Blue)" value={nc.teeName}
                  onChange={(e) => setNc({ ...nc, teeName: e.target.value })} />
                <input className={inputClass} placeholder="Yardage" inputMode="numeric" value={nc.yardage}
                  onChange={(e) => setNc({ ...nc, yardage: e.target.value })} />
                <input className={inputClass} placeholder="Course rating" inputMode="decimal" value={nc.rating}
                  onChange={(e) => setNc({ ...nc, rating: e.target.value })} />
                <input className={inputClass} placeholder="Slope" inputMode="numeric" value={nc.slope}
                  onChange={(e) => setNc({ ...nc, slope: e.target.value })} />
              </div>
              <p className="text-[12px] leading-5 text-slate-500">
                Course rating and slope are what make net scoring work. Get them from the scorecard for the
                tees you are playing.
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setAdding(false)}
                  className="flex-1 rounded-2xl border-[1.5px] border-slate-300 px-4 py-2.5 font-black text-slate-600">
                  Cancel
                </button>
                <button type="button" disabled={!nc.name.trim() || busy}
                  onClick={async () => {
                    const supabase = getSupabaseClient();
                    if (!supabase) return;
                    setBusy(true);
                    const res = await createCourse(supabase, tripId, {
                      name: nc.name.trim(),
                      par: Number(nc.par) || 72,
                      teeName: nc.teeName.trim(),
                      yardage: nc.yardage ? Number(nc.yardage) : null,
                      rating: nc.rating ? Number(nc.rating) : null,
                      slope: nc.slope ? Number(nc.slope) : null,
                    });
                    setBusy(false);
                    if (!res.ok) { setError(res.error || "Couldn't add that course."); return; }
                    setNc({ name: "", par: "72", teeName: "Blue", yardage: "", rating: "", slope: "" });
                    setAdding(false);
                    refresh();
                  }}
                  className="flex-1 rounded-2xl bg-fairway-900 px-4 py-2.5 font-black text-white disabled:opacity-50">
                  Add course
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)}
            className="w-full rounded-2xl border-2 border-dashed border-sand-200 px-4 py-3 font-black text-slate-500">
            + Add a course
          </button>
        )}

        {missing.length > 0 && courses.length > 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900">
            {missing.length} course{missing.length === 1 ? "" : "s"} still need hole data. Rounds on those
            courses cannot start in hole-by-hole mode until it is added.
          </div>
        ) : null}
      </div>
    );
  }

  // ---------------- grid editor ----------------
  const nine = (from: number, to: number) => rows.filter((r) => r.hole >= from && r.hole <= to);

  const Grid = ({ title, list }: { title: string; list: Row[] }) => (
    <div>
      <p className="mb-1 text-xs font-black uppercase tracking-wide text-slate-500">{title}</p>
      <div className="overflow-hidden rounded-2xl border border-sand-200">
        <div className="grid grid-cols-[44px_1fr_1fr] bg-[#f3efe6] px-2 py-1.5 text-[11px] font-black uppercase tracking-wide text-slate-500">
          <span>Hole</span>
          <span className="text-center">Par</span>
          <span className="text-center">Course Hcp #</span>
        </div>
        {list.map((r) => {
          const badPar = check.parErr.has(r.hole);
          const badSi = check.siErr.has(r.hole) || check.dupes.has(r.hole);
          return (
            <div key={r.hole} className="grid grid-cols-[44px_1fr_1fr] items-center gap-1 border-t border-sand-200 px-2 py-1">
              <span className="text-[13px] font-black text-slate-500">{r.hole}</span>
              <input
                id={cellId(r.hole, "par")}
                inputMode="numeric"
                value={r.par}
                enterKeyHint="next"
                onFocus={(e) => e.currentTarget.select()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") advanceFrom(r.hole, "par");
                }}
                onChange={(e) => setCell(r.hole, "par", e.target.value)}
                className={`mx-auto w-14 rounded-lg border-2 px-2 py-1.5 text-center font-bold outline-none ${
                  badPar ? "border-red-400 bg-red-50" : "border-sand-200"
                }`}
              />
              <input
                id={cellId(r.hole, "si")}
                inputMode="numeric"
                value={r.si}
                enterKeyHint="next"
                onFocus={(e) => e.currentTarget.select()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") advanceFrom(r.hole, "si");
                }}
                onChange={(e) => setCell(r.hole, "si", e.target.value)}
                className={`mx-auto w-14 rounded-lg border-2 px-2 py-1.5 text-center font-bold outline-none ${
                  badSi ? "border-red-400 bg-red-50" : "border-sand-200"
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <button type="button" onClick={() => setActive(null)} className="text-sm font-bold text-slate-500">
        &lsaquo; All courses
      </button>
      <h3 className="font-anton text-2xl tracking-tight text-ink">{active.name}</h3>

      <div className="rounded-2xl bg-[#f7f6f1] p-3">
        <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Course details</p>
        <div className="grid grid-cols-2 gap-2">
          <input className={inputClass} placeholder="Name" value={details.name}
            onChange={(e) => setDetails({ ...details, name: e.target.value })} />
          <input className={inputClass} placeholder="Par" inputMode="numeric" value={details.par}
            onChange={(e) => setDetails({ ...details, par: e.target.value })} />
          <input className={inputClass} placeholder="Tees" value={details.teeName}
            onChange={(e) => setDetails({ ...details, teeName: e.target.value })} />
          <input className={inputClass} placeholder="Yardage" inputMode="numeric" value={details.yardage}
            onChange={(e) => setDetails({ ...details, yardage: e.target.value })} />
          <input className={inputClass} placeholder="Course rating" inputMode="decimal" value={details.rating}
            onChange={(e) => setDetails({ ...details, rating: e.target.value })} />
          <input className={inputClass} placeholder="Slope" inputMode="numeric" value={details.slope}
            onChange={(e) => setDetails({ ...details, slope: e.target.value })} />
        </div>
        <button type="button" disabled={busy}
          onClick={async () => {
            const supabase = getSupabaseClient();
            if (!supabase || !active) return;
            setBusy(true);
            const res = await updateCourse(supabase, active.id, {
              name: details.name.trim(),
              par: Number(details.par) || 72,
              teeName: details.teeName.trim(),
              yardage: details.yardage ? Number(details.yardage) : null,
              rating: details.rating ? Number(details.rating) : null,
              slope: details.slope ? Number(details.slope) : null,
            });
            setBusy(false);
            if (!res.ok) { setError(res.error || "Couldn't save course details."); return; }
            setParsedNote("Course details saved.");
            refresh();
          }}
          className="mt-2 w-full rounded-xl bg-fairway-900 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
          Save course details
        </button>
      </div>

      <div>
        <label className={labelClass}>Tees being played</label>
        <input className={inputClass} value={tee} onChange={(e) => setTee(e.target.value)} placeholder="Blue" />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) readPhoto(f);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className="w-full rounded-2xl border-2 border-dashed border-sand-200 px-4 py-3 text-center font-black text-slate-500 disabled:opacity-50"
      >
        {busy ? "Reading the scorecard\u2026" : "\ud83d\udcf7 Fill from a scorecard photo"}
      </button>
      {parsedNote ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-[13px] font-bold text-amber-900">{parsedNote}</p>
      ) : null}

      <div className="rounded-2xl bg-[#f7f6f1] p-3">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
          Course handicap numbers left to use
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {check.missingSi.length === 0 ? (
            <span className="text-[13px] font-bold text-emerald-700">All 18 used.</span>
          ) : (
            check.missingSi.map((n) => (
              <span key={n} className="rounded-md bg-white px-2 py-0.5 text-[13px] font-black text-slate-600">
                {n}
              </span>
            ))
          )}
        </div>
      </div>

      <Grid title="Front 9" list={nine(1, 9)} />
      <Grid title="Back 9" list={nine(10, 18)} />

      {!check.ok ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900">
          {check.parErr.size > 0 ? <p>Par must be between 2 and 8. Check the red boxes.</p> : null}
          {check.dupes.size > 0 ? <p>Two holes share a course handicap number. Each number 1-18 is used exactly once.</p> : null}
          {check.missingSi.length > 0 && check.missingSi.length < 18 ? (
            <p>Still unused: {check.missingSi.join(", ")}</p>
          ) : null}
          {check.siErr.size > 0 && check.missingSi.length === 18 ? <p>Add a course handicap number for every hole.</p> : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-[13px] font-bold text-emerald-800">
          All 18 holes look good.
        </div>
      )}

      {error ? <p className="text-sm font-bold text-red-600">{error}</p> : null}

      <button
        type="button"
        disabled={!check.ok || busy}
        onClick={() => setFinalConfirm(true)}
        className="w-full rounded-2xl bg-fairway-900 px-4 py-3.5 font-black text-white disabled:opacity-50"
      >
        Save these 18 holes
      </button>

      {finalConfirm ? (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 p-5">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5">
            <h3 className="font-anton text-2xl tracking-tight text-ink">Are you sure it is right?</h3>
            <p className="mt-2 text-[14px] leading-6 text-slate-600">
              This drives every stat in the tournament: who gets strokes on which holes, net scores, match
              results, awards and the final standings. A wrong course handicap number quietly changes who wins.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setFinalConfirm(false)}
                className="flex-1 rounded-2xl border-[1.5px] border-slate-300 px-4 py-3 font-black text-slate-600"
              >
                Let me check
              </button>
              <button
                type="button"
                onClick={commit}
                disabled={busy}
                className="flex-1 rounded-2xl bg-fairway-900 px-4 py-3 font-black text-white disabled:opacity-50"
              >
                {busy ? "Saving\u2026" : "Yes, save it"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
