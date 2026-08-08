"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  loadRoundSetups,
  saveRoundHoles,
  saveSegments,
  FORMAT_LABELS,
  type RoundSetup,
  type Segment,
  type SegmentFormat,
} from "@/lib/supabase/roundSegments";

const FORMATS: SegmentFormat[] = ["best_ball", "match_play", "net_score", "scramble", "casual"];

export function RoundsTab({ tripId }: { tripId: string }) {
  const [rounds, setRounds] = useState<RoundSetup[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [allowanceInfo, setAllowanceInfo] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    loadRoundSetups(supabase, tripId).then(setRounds);
  }, [tripId]);

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

  async function persist(r: RoundSetup) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const segs = r.teeTimes.map((t) => segFor(r, t.id));
    const res = await saveSegments(supabase, r.id, segs);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "Couldn't save.");
      return;
    }
    setToast(`${r.title} saved`);
    setTimeout(() => setToast(null), 2000);
  }

  async function setHoles(r: RoundSetup, holes: number, nine: "front" | "back" | null) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setRounds((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, holesCount: holes, nine: holes === 9 ? nine ?? "front" : null } : x))
    );
    await saveRoundHoles(supabase, r.id, holes, nine);
  }

  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-5 text-slate-600">
        Set what each tee time is playing. One round can hold more than one format, so two groups can play
        best ball while another plays singles.
      </p>

      {rounds.length === 0 ? (
        <p className="text-sm text-slate-400">No rounds yet. Add them in the tournament&apos;s Admin area.</p>
      ) : null}

      {rounds.map((r) => {
        const isOpen = open === r.id;
        const total = r.teeTimes.reduce((sum, t) => sum + Number(segFor(r, t.id).points || 0), 0);
        const zeroPoint = r.teeTimes.filter((t) => Number(segFor(r, t.id).points || 0) === 0).length;
        return (
          <div key={r.id} className="overflow-hidden rounded-2xl border border-sand-200 bg-white">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : r.id)}
              className="flex w-full items-center gap-3 p-3 text-left"
            >
              <span className="flex-1">
                <span className="block font-black text-ink">{r.title}</span>
                <span className="block text-[13px] text-slate-500">
                  {r.holesCount === 9 ? `9 holes (${r.nine === "back" ? "back" : "front"})` : "18 holes"} ·{" "}
                  {r.teeTimes.length} tee time{r.teeTimes.length === 1 ? "" : "s"} · {total} pts
                </span>
              </span>
              <span className="font-black text-slate-300">{isOpen ? "▾" : "›"}</span>
            </button>

            {isOpen ? (
              <div className="space-y-3 border-t border-slate-100 p-3">
                {/* 9 vs 18 */}
                <div>
                  <p className="mb-1 text-xs font-black uppercase tracking-wide text-slate-500">Holes played</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setHoles(r, 18, null)}
                      className={`flex-1 rounded-xl border-2 px-3 py-2 text-sm font-black ${
                        r.holesCount === 18 ? "border-fairway-900 bg-fairway-900/5 text-ink" : "border-sand-200 text-slate-500"
                      }`}
                    >
                      18 holes
                    </button>
                    <button
                      type="button"
                      onClick={() => setHoles(r, 9, r.nine ?? "front")}
                      className={`flex-1 rounded-xl border-2 px-3 py-2 text-sm font-black ${
                        r.holesCount === 9 ? "border-fairway-900 bg-fairway-900/5 text-ink" : "border-sand-200 text-slate-500"
                      }`}
                    >
                      9 holes
                    </button>
                  </div>
                  {r.holesCount === 9 ? (
                    <div className="mt-2">
                      <div className="flex gap-2">
                        {(["front", "back"] as const).map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setHoles(r, 9, n)}
                            className={`flex-1 rounded-xl border-2 px-3 py-2 text-sm font-black capitalize ${
                              (r.nine ?? "front") === n ? "border-accent bg-accent/10 text-ink" : "border-sand-200 text-slate-500"
                            }`}
                          >
                            {n} nine
                          </button>
                        ))}
                      </div>
                      <p className="mt-1 text-[12px] leading-5 text-slate-500">
                        On a 9-hole round everyone gets half their strokes, given on the hardest holes within
                        that nine.
                      </p>
                    </div>
                  ) : null}
                </div>

                {/* per tee time */}
                <div>
                  <p className="mb-1 text-xs font-black uppercase tracking-wide text-slate-500">Tee times</p>
                  {r.teeTimes.length === 0 ? (
                    <p className="text-[13px] text-slate-400">
                      No tee times on this round yet. Add them in the tournament&apos;s Admin area, then set
                      each one&apos;s format here.
                    </p>
                  ) : null}
                  <div className="space-y-2">
                    {r.teeTimes.map((t) => {
                      const s = segFor(r, t.id);
                      return (
                        <div key={t.id} className="rounded-xl bg-[#f7f6f1] p-2.5">
                          <p className="mb-1.5 text-[13px] font-black text-ink">
                            {t.time || "Tee time"}{" "}
                            <span className="font-normal text-slate-400">
                              · {t.playerCount} player{t.playerCount === 1 ? "" : "s"}
                            </span>
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {FORMATS.map((f) => (
                              <button
                                key={f}
                                type="button"
                                onClick={() => updateSeg(r.id, t.id, { format: f })}
                                className={`rounded-full px-2.5 py-1 text-[12px] font-black ${
                                  s.format === f ? "bg-fairway-900 text-white" : "bg-white text-slate-500"
                                }`}
                              >
                                {FORMAT_LABELS[f]}
                              </button>
                            ))}
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <label className="block">
                              <span className="text-[11px] font-black uppercase text-slate-500">Points</span>
                              <input
                                inputMode="decimal"
                                value={String(s.points ?? 0)}
                                onChange={(e) =>
                                  updateSeg(r.id, t.id, { points: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 })
                                }
                                className="w-full rounded-lg border-[1.5px] border-sand-200 px-2 py-1.5 font-bold outline-none"
                              />
                            </label>
                            <label className="block">
                              <span className="text-[11px] font-black uppercase text-slate-500">
                                Handicap %{" "}
                                <button
                                  type="button"
                                  onClick={() => setAllowanceInfo(true)}
                                  className="text-accent-dark underline"
                                >
                                  what?
                                </button>
                              </span>
                              <div className="flex gap-1">
                                {[0, 50, 100].map((pct) => (
                                  <button
                                    key={pct}
                                    type="button"
                                    onClick={() => updateSeg(r.id, t.id, { allowancePct: pct })}
                                    className={`flex-1 rounded-lg border-[1.5px] py-1.5 text-[12px] font-black ${
                                      s.allowancePct === pct
                                        ? "border-fairway-900 bg-fairway-900 text-white"
                                        : "border-sand-200 text-slate-500"
                                    }`}
                                  >
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
                </div>

                <div className="rounded-xl bg-[#f3efe6] px-3 py-2 text-[13px] font-bold text-ink">
                  Round total: {total} point{total === 1 ? "" : "s"}
                </div>
                {zeroPoint > 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
                    {zeroPoint} tee time{zeroPoint === 1 ? " has" : "s have"} 0 points. That group plays for
                    nothing unless you meant it.
                  </div>
                ) : null}

                <button
                  type="button"
                  disabled={busy || r.teeTimes.length === 0}
                  onClick={() => persist(r)}
                  className="w-full rounded-2xl bg-fairway-900 px-4 py-3 font-black text-white disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save this round"}
                </button>
              </div>
            ) : null}
          </div>
        );
      })}

      {error ? <p className="text-sm font-bold text-red-600">{error}</p> : null}
      {toast ? <p className="text-sm font-bold text-emerald-700">{toast}</p> : null}

      {allowanceInfo ? (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 p-5">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5">
            <h3 className="font-anton text-2xl tracking-tight text-ink">Handicap allowance</h3>
            <p className="mt-2 text-[14px] leading-6 text-slate-600">
              How much of the handicap difference actually gets given. Say a 14 plays a 10:
            </p>
            <ul className="mt-2 space-y-1 text-[14px] leading-6 text-slate-600">
              <li>
                <b>100%</b> - the 14 gets 4 strokes, on course handicap holes 1 to 4.
              </li>
              <li>
                <b>50%</b> - the 14 gets 2 strokes, on holes 1 and 2.
              </li>
              <li>
                <b>0%</b> - no strokes. Everyone plays it straight up.
              </li>
            </ul>
            <p className="mt-2 text-[13px] leading-5 text-slate-500">
              Anything left over rounds up, so half of 3 strokes gives 2.
            </p>
            <button
              type="button"
              onClick={() => setAllowanceInfo(false)}
              className="mt-4 w-full rounded-2xl bg-fairway-900 px-4 py-3 font-black text-white"
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
