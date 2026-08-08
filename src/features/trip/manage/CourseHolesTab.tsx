"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  loadCoursesWithHoleStatus,
  loadCourseHoles,
  saveCourseHoles,
  parseHoleText,
  imageToBase64,
  type CourseLite,
  type CourseHole,
} from "@/lib/supabase/courseHoles";

const inputClass =
  "w-full rounded-xl border-[1.5px] border-sand-200 bg-white px-3 py-2 text-ink outline-none focus:border-fairway-900";
const labelClass = "block text-xs font-black uppercase tracking-wide text-slate-500";

const HELPER = "(hole1,par4,hc1),(hole2,par3,hc9),(hole3,par5,hc4), ... all 18";

export function CourseHolesTab({ tripId }: { tripId: string }) {
  const [courses, setCourses] = useState<CourseLite[]>([]);
  const [active, setActive] = useState<CourseLite | null>(null);
  const [mode, setMode] = useState<"text" | "photo">("text");
  const [text, setText] = useState("");
  const [tee, setTee] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<{ holes: CourseHole[]; issues: string[] } | null>(null);
  const [finalConfirm, setFinalConfirm] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
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

  const missing = courses.filter((c) => c.holeCount < 18);

  async function openCourse(c: CourseLite) {
    setActive(c);
    setError(null);
    setReview(null);
    setSaved(null);
    setTee(c.teeName ?? "");
    const supabase = getSupabaseClient();
    if (supabase && c.holeCount > 0) {
      const existing = await loadCourseHoles(supabase, c.id);
      setText(existing.map((h) => `(hole${h.hole},par${h.par},hc${h.si})`).join(","));
    } else {
      setText("");
    }
  }

  function reviewText() {
    setError(null);
    const res = parseHoleText(text);
    if (res.holes.length === 0) {
      setError("Couldn't read any holes from that. Check the format in the hint below.");
      return;
    }
    setReview(res);
  }

  async function reviewPhoto(file: File) {
    setBusy(true);
    setError(null);
    try {
      const { base64, mediaType } = await imageToBase64(file);
      const res = await fetch("/api/parse-scorecard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Couldn't read that scorecard.");
      if (data.tee && !tee) setTee(String(data.tee));
      setReview({ holes: data.holes as CourseHole[], issues: (data.issues as string[]) ?? [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that scorecard.");
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!active || !review) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setBusy(true);
    const res = await saveCourseHoles(supabase, active.id, review.holes);
    setBusy(false);
    setFinalConfirm(false);
    if (!res.ok) {
      setError(res.error || "Couldn't save.");
      return;
    }
    setSaved(`${active.name} is set - all 18 holes saved.`);
    setReview(null);
    setActive(null);
    refresh();
  }

  // ---------------- course list ----------------
  if (!active) {
    return (
      <div className="space-y-3">
        <p className="text-[13px] leading-5 text-slate-600">
          Hole-by-hole scoring needs each course&apos;s <b>par</b> and <b>stroke index</b> for all 18 holes.
          That&apos;s what decides who gets strokes on which holes.
        </p>

        {saved ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
            ✓ {saved}
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
                <span className="text-xl">{done ? "✓" : "!"}</span>
                <span className="flex-1">
                  <span className="block font-black text-ink">{c.name}</span>
                  <span className="block text-[13px] text-slate-500">
                    {done ? "All 18 holes set" : c.holeCount > 0 ? `${c.holeCount} of 18 holes` : "Needs par + stroke index"}
                    {c.rating && c.slope ? ` · ${c.rating}/${c.slope}` : " · rating/slope missing"}
                  </span>
                </span>
                <span className="font-black text-slate-300">›</span>
              </button>
            );
          })}
        </div>

        {missing.length > 0 && courses.length > 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900">
            <b>{missing.length} course{missing.length === 1 ? "" : "s"} still need hole data.</b> Rounds on those
            courses can&apos;t start in hole-by-hole mode until it&apos;s added.
          </div>
        ) : null}
      </div>
    );
  }

  // ---------------- single course editor ----------------
  return (
    <div className="space-y-3">
      <button type="button" onClick={() => setActive(null)} className="text-sm font-bold text-slate-500">
        ‹ All courses
      </button>
      <h3 className="font-anton text-2xl tracking-tight text-ink">{active.name}</h3>

      <div>
        <label className={labelClass}>Tees being played</label>
        <input className={inputClass} value={tee} onChange={(e) => setTee(e.target.value)} placeholder="Blue" />
      </div>

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setMode("text")}
          className={`rounded-full px-3.5 py-1.5 text-sm font-black ${mode === "text" ? "bg-fairway-900 text-white" : "bg-[#f3efe6] text-slate-600"}`}
        >
          Type it
        </button>
        <button
          type="button"
          onClick={() => setMode("photo")}
          className={`rounded-full px-3.5 py-1.5 text-sm font-black ${mode === "photo" ? "bg-fairway-900 text-white" : "bg-[#f3efe6] text-slate-600"}`}
        >
          📷 Scorecard photo
        </button>
      </div>

      {mode === "text" ? (
        <div>
          <textarea
            className={`${inputClass} min-h-[130px] font-mono text-[13px]`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={HELPER}
          />
          <p className="mt-1 text-[12px] leading-5 text-slate-500">
            Format: <span className="font-mono">{HELPER}</span>
            <br />
            par is 3, 4 or 5. hc is the hole&apos;s stroke index, 1-18, each used once.
          </p>
          <button
            type="button"
            onClick={reviewText}
            className="mt-2 w-full rounded-2xl bg-fairway-900 px-4 py-3 font-black text-white"
          >
            Review
          </button>
        </div>
      ) : (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) reviewPhoto(f);
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-2xl border-2 border-dashed border-sand-200 px-4 py-8 text-center font-black text-slate-500 disabled:opacity-50"
          >
            {busy ? "Reading the scorecard…" : "Take or choose a scorecard photo"}
          </button>
          <p className="mt-1 text-[12px] leading-5 text-slate-500">
            Get the whole card in frame, especially the handicap/stroke-index row. You&apos;ll check what it
            read before anything saves.
          </p>
        </div>
      )}

      {error ? <p className="text-sm font-bold text-red-600">{error}</p> : null}

      {/* ---- popup 1: recap of what was read ---- */}
      {review ? (
        <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-5">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl">
            <h3 className="font-anton text-2xl tracking-tight text-ink">Check this over</h3>
            <p className="mt-1 text-[13px] text-slate-500">
              {active.name}
              {tee ? ` · ${tee} tees` : ""} · {review.holes.length} holes read
            </p>

            {review.issues.length > 0 ? (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900">
                {review.issues.map((i) => (
                  <p key={i}>• {i}</p>
                ))}
              </div>
            ) : null}

            <div className="mt-3 grid grid-cols-6 gap-1.5 text-center">
              {review.holes.map((h) => (
                <div key={h.hole} className="rounded-lg bg-[#f7f6f1] p-1.5">
                  <p className="text-[10px] font-black uppercase text-slate-400">H{h.hole}</p>
                  <p className="text-[13px] font-black text-ink">P{h.par}</p>
                  <p className="text-[11px] font-bold text-slate-500">SI {h.si}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setReview(null)}
                className="flex-1 rounded-2xl border-[1.5px] border-slate-300 px-4 py-3 font-black text-slate-600"
              >
                Go back
              </button>
              <button
                type="button"
                onClick={() => setFinalConfirm(true)}
                className="flex-1 rounded-2xl bg-fairway-900 px-4 py-3 font-black text-white"
              >
                Looks right
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---- popup 2: the "this drives everything" gut check ---- */}
      {finalConfirm ? (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 p-5">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5">
            <h3 className="font-anton text-2xl tracking-tight text-ink">Are you sure it&apos;s right?</h3>
            <p className="mt-2 text-[14px] leading-6 text-slate-600">
              This drives <b>every stat in the tournament</b> - who gets strokes on which holes, net scores,
              match results, awards and the final standings. A wrong stroke index quietly changes who wins.
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
                {busy ? "Saving…" : "Yes, save it"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
