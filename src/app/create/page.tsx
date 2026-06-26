"use client";

import { useEffect, useMemo, useState } from "react";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { createTrip, insertCourse, insertRound, insertTeeTime } from "@/lib/supabase/queries";
import { AuthShell } from "@/features/auth/AuthShell";

type FmtOpt = {
  id: string;
  label: string;
  format: "casual" | "scramble" | "best_ball" | "match_play" | "net_score";
  groupSize: number | null;
  teePer: number; // players per tee-time group
  increment: number; // roster must be a multiple of this (1 = any)
  desc: string;
};

const FORMATS: FmtOpt[] = [
  { id: "casual", label: "Casual", format: "casual", groupSize: null, teePer: 4, increment: 1, desc: "Just track scores — no points or head-to-head." },
  { id: "scramble_2", label: "Scramble · 2 v 2", format: "scramble", groupSize: 2, teePer: 4, increment: 4, desc: "Pairs play one ball; one combined score per pair." },
  { id: "scramble_4", label: "Scramble · 4 v 4", format: "scramble", groupSize: 4, teePer: 8, increment: 8, desc: "Foursomes play one ball; one combined score per group." },
  { id: "bestball_2", label: "Best Ball · 2 v 2", format: "best_ball", groupSize: 2, teePer: 4, increment: 4, desc: "Pairs; one combined score per pair." },
  { id: "bestball_4", label: "Best Ball · 4 v 4", format: "best_ball", groupSize: 4, teePer: 8, increment: 8, desc: "Foursomes; one combined score per group." },
  { id: "match_play", label: "Singles Match Play", format: "match_play", groupSize: null, teePer: 4, increment: 1, desc: "Head-to-head pairings for points." },
  { id: "net_score", label: "Net Stroke Play", format: "net_score", groupSize: null, teePer: 4, increment: 1, desc: "Individual net leaderboard." },
];

type CourseDraft = { name: string; par: string };
type RoundDraft = { presetId: string; courseIdx: number; arrival: string; teeTimes: string[] };

function teeCountFor(roster: number, teePer: number) {
  return Math.max(1, Math.ceil((roster || 4) / teePer));
}

export default function CreatePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [location, setLocation] = useState("");
  const [dates, setDates] = useState("");
  const [teamAName, setTeamAName] = useState("Team A");
  const [teamBName, setTeamBName] = useState("Team B");
  const [rosterSize, setRosterSize] = useState("12");
  const [courses, setCourses] = useState<CourseDraft[]>([{ name: "", par: "72" }]);
  const [setRoundsNow, setSetRoundsNow] = useState<boolean | null>(null);
  const [rounds, setRounds] = useState<RoundDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  const roster = Number(rosterSize) || 12;
  const realCourses = useMemo(() => courses.filter((c) => c.name.trim()), [courses]);
  const availableFormats = useMemo(
    () => FORMATS.filter((f) => f.increment <= 1 || roster % f.increment === 0),
    [roster]
  );

  function presetById(id: string): FmtOpt {
    return FORMATS.find((f) => f.id === id) ?? FORMATS[0];
  }
  function newRound(): RoundDraft {
    const p = availableFormats[0] ?? FORMATS[0];
    return { presetId: p.id, courseIdx: 0, arrival: "", teeTimes: Array(teeCountFor(roster, p.teePer)).fill("") };
  }
  function changeFormat(i: number, presetId: string) {
    const p = presetById(presetId);
    const count = teeCountFor(roster, p.teePer);
    setRounds((prev) =>
      prev.map((x, j) => {
        if (j !== i) return x;
        const tt = x.teeTimes.slice(0, count);
        while (tt.length < count) tt.push("");
        return { ...x, presetId, teeTimes: tt };
      })
    );
  }

  const basicsValid = name.trim() && joinCode.trim() && teamAName.trim() && teamBName.trim();

  async function finish() {
    if (!user) return;
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Can't reach the server right now.");
      return;
    }
    setBusy(true);
    setError(null);
    const code = joinCode.trim().toUpperCase();
    try {
      const created = await createTrip(supabase, {
        name,
        joinCode: code,
        location,
        dates,
        teamAName,
        teamBName,
        rosterSize: roster,
        defaultFormat: rounds[0] ? presetById(rounds[0].presetId).id : undefined,
        ownerId: user.id,
      });
      if (!created.ok || !created.tripId) {
        setBusy(false);
        setError(created.error ?? "Something went wrong.");
        return;
      }
      const tripId = created.tripId;

      const courseIds: string[] = [];
      for (const c of realCourses) {
        const id = await insertCourse(supabase, tripId, { name: c.name.trim(), par: Number(c.par) || 72, rating: 72, slope: 113 });
        courseIds.push(id);
      }

      if (setRoundsNow) {
        let n = 0;
        for (const r of rounds) {
          n += 1;
          const p = presetById(r.presetId);
          const roundId = await insertRound(supabase, tripId, {
            roundNumber: n,
            title: `Round ${n}`,
            dateLabel: "",
            courseId: courseIds[r.courseIdx] ?? courseIds[0] ?? "",
            format: p.format,
            groupSize: p.groupSize,
            pointsAvailable: 1,
            arrivalTime: r.arrival.trim(),
          });
          let order = 0;
          for (const t of r.teeTimes) {
            order += 1;
            await insertTeeTime(supabase, roundId, t.trim() || "TBD", order);
          }
        }
      }

      router.push(`/t/${code}`);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  if (loading || !user) {
    return (
      <LoadingScreen />
    );
  }

  return (
    <AuthShell>
      <div>
        <div className="mb-4 flex items-center gap-1.5">
          {[0, 1, 2, 3].map((s) => (
            <span key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-fairway-900" : "bg-sand-200"}`} />
          ))}
        </div>

        {step === 0 ? <Intro onNext={() => setStep(1)} onCancel={() => router.push("/home")} /> : null}

        {step === 1 ? (
          <div>
            <StepHead n="2" title="The basics" />
            <div className="mt-4 space-y-4">
              <Field label="Tournament name">
                <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="3rd Annual McKannay Invitational" />
              </Field>
              <Field label="Join code" hint="players type this to join">
                <input className={inp} value={joinCode} onChange={(e) => { setJoinCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()); setError(null); }} placeholder="MCK2027" autoCapitalize="characters" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Location" hint="optional"><input className={inp} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Hilton Head, SC" /></Field>
                <Field label="Dates" hint="optional"><input className={inp} value={dates} onChange={(e) => setDates(e.target.value)} placeholder="Sept 10–13" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Team A name"><input className={inp} value={teamAName} onChange={(e) => setTeamAName(e.target.value)} /></Field>
                <Field label="Team B name"><input className={inp} value={teamBName} onChange={(e) => setTeamBName(e.target.value)} /></Field>
              </div>
              <Field label="Number of players" hint="spots on the roster">
                <input className={inp} inputMode="numeric" value={rosterSize} onChange={(e) => setRosterSize(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))} placeholder="12" />
                <p className="mt-1.5 text-[13px] text-slate-400">
                  Group formats need even teams: 2v2 needs a multiple of 4, 4v4 a multiple of 8. Formats that don&apos;t fit won&apos;t be offered.
                </p>
              </Field>
            </div>
            <NavRow onBack={() => setStep(0)} onNext={() => setStep(2)} nextDisabled={!basicsValid} />
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <StepHead n="3" title="Courses" />
            <p className="mt-1 text-sm text-slate-500">Add the course(s) you&apos;re playing — just a name and par for now. Every round links to a course.</p>
            <div className="mt-4 space-y-3">
              {courses.map((c, i) => (
                <div key={i} className="rounded-2xl border-[1.5px] border-sand-200 bg-white p-3">
                  <div className="flex items-center gap-2">
                    <input className="flex-1 rounded-xl border-[1.5px] border-sand-200 px-3 py-2.5 outline-none focus:border-fairway-900" value={c.name} onChange={(e) => setCourses((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder={`Course ${i + 1} name`} />
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-500">Par</span>
                      <input className="w-14 rounded-xl border-[1.5px] border-sand-200 px-2 py-2.5 text-center outline-none focus:border-fairway-900" inputMode="numeric" value={c.par} onChange={(e) => setCourses((p) => p.map((x, j) => (j === i ? { ...x, par: e.target.value.replace(/[^0-9]/g, "").slice(0, 2) } : x)))} />
                    </div>
                    {courses.length > 1 ? <button onClick={() => setCourses((p) => p.filter((_, j) => j !== i))} className="rounded-lg px-2 py-1 text-sm font-bold text-slate-400">✕</button> : null}
                  </div>
                </div>
              ))}
              <button onClick={() => setCourses((p) => [...p, { name: "", par: "72" }])} className="w-full rounded-2xl border-[1.5px] border-dashed border-sand-200 py-3 text-sm font-bold text-slate-500">+ Add another course</button>
              {realCourses.length === 0 ? <p className="text-sm text-slate-400">You can skip this and add courses later in Admin, but you&apos;ll need at least one before setting up rounds.</p> : null}
            </div>
            <NavRow onBack={() => setStep(1)} onNext={() => setStep(3)} />
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <StepHead n="4" title="Rounds" />
            <p className="mt-1 text-sm text-slate-500">Set up your rounds now, or do it later in Admin.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => { setSetRoundsNow(true); if (rounds.length === 0) setRounds([newRound()]); }} className={`rounded-2xl border-[1.5px] p-3 text-sm font-black ${setRoundsNow === true ? "border-fairway-900 bg-fairway-900/5" : "border-sand-200 bg-white"}`}>Set up now</button>
              <button onClick={() => setSetRoundsNow(false)} className={`rounded-2xl border-[1.5px] p-3 text-sm font-black ${setRoundsNow === false ? "border-fairway-900 bg-fairway-900/5" : "border-sand-200 bg-white"}`}>Later in Admin</button>
            </div>

            {setRoundsNow === false ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">No problem — add rounds anytime in Admin. We&apos;d still encourage setting up at least one now so your tournament is ready the moment everyone joins.</div> : null}
            {setRoundsNow === true && realCourses.length === 0 ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Add at least one course first (Back) — every round needs a course so scores can be calculated.</div> : null}

            {setRoundsNow === true && realCourses.length > 0 ? (
              <div className="mt-4 space-y-3">
                {rounds.map((r, i) => {
                  const p = presetById(r.presetId);
                  return (
                    <div key={i} className="rounded-2xl border-[1.5px] border-sand-200 bg-white p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-ink">Round {i + 1}</span>
                        {rounds.length > 1 ? <button onClick={() => setRounds((pr) => pr.filter((_, j) => j !== i))} className="text-sm font-bold text-slate-400">✕</button> : null}
                      </div>
                      <div className="mt-2 space-y-2">
                        <select className={inp} value={r.courseIdx} onChange={(e) => setRounds((pr) => pr.map((x, j) => (j === i ? { ...x, courseIdx: Number(e.target.value) } : x)))}>
                          {realCourses.map((c, ci) => <option key={ci} value={ci}>{c.name.trim() || `Course ${ci + 1}`}</option>)}
                        </select>
                        <select className={inp} value={availableFormats.some((f) => f.id === r.presetId) ? r.presetId : availableFormats[0]?.id} onChange={(e) => changeFormat(i, e.target.value)}>
                          {availableFormats.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                        </select>
                        <p className="text-[12px] text-slate-400">{p.desc}</p>
                        <input className={inp} value={r.arrival} onChange={(e) => setRounds((pr) => pr.map((x, j) => (j === i ? { ...x, arrival: e.target.value } : x)))} placeholder="Arrival time (optional, e.g. 8:15 AM)" />
                        <div className="rounded-xl bg-slate-50 p-2.5">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500">Tee times ({r.teeTimes.length})</span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setRounds((pr) => pr.map((x, j) => (j === i && x.teeTimes.length > 1 ? { ...x, teeTimes: x.teeTimes.slice(0, -1) } : x)))} className="h-7 w-7 rounded-lg bg-white text-sm font-black text-slate-500">−</button>
                              <button onClick={() => setRounds((pr) => pr.map((x, j) => (j === i ? { ...x, teeTimes: [...x.teeTimes, ""] } : x)))} className="h-7 w-7 rounded-lg bg-white text-sm font-black text-slate-500">+</button>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            {r.teeTimes.map((t, ti) => (
                              <input key={ti} className="w-full rounded-lg border-[1.5px] border-sand-200 bg-white px-3 py-2 text-sm outline-none focus:border-fairway-900" value={t} onChange={(e) => setRounds((pr) => pr.map((x, j) => (j === i ? { ...x, teeTimes: x.teeTimes.map((v, k) => (k === ti ? e.target.value : v)) } : x)))} placeholder={`Tee time ${ti + 1} (optional)`} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <button onClick={() => setRounds((p) => [...p, newRound()])} className="w-full rounded-2xl border-[1.5px] border-dashed border-sand-200 py-3 text-sm font-bold text-slate-500">+ Add another round</button>
                {rounds.some((r) => r.teeTimes.some((t) => !t.trim()) || !r.arrival.trim()) ? <p className="text-sm text-slate-400">Blank tee/arrival times will be defaulted for now — adjust anytime in Admin.</p> : null}
              </div>
            ) : null}

            {error ? <p className="mt-4 text-sm font-bold text-red-600">{error}</p> : null}
            <div className="mt-6 flex items-center gap-2">
              <button onClick={() => setStep(2)} className="rounded-2xl px-4 py-3 text-sm font-bold text-slate-500">Back</button>
              <button onClick={finish} disabled={busy || setRoundsNow === null || (setRoundsNow === true && realCourses.length === 0)} className="flex-1 rounded-2xl bg-accent px-4 py-4 font-black text-ink disabled:opacity-50">{busy ? "Creating…" : "Create Tournament"}</button>
            </div>
          </div>
        ) : null}
      </div>
    </AuthShell>
  );
}

function Intro({ onNext, onCancel }: { onNext: () => void; onCancel: () => void }) {
  return (
    <div>
      <StepHead n="1" title="How this works" />
      <div className="mt-4 space-y-3 text-sm text-slate-600">
        <p>A tournament is made up of <strong>rounds</strong>, and each round can have its own <strong>format</strong> — so Day 1 could be a scramble, Day 2 best ball, and so on.</p>
        <div className="rounded-2xl border-[1.5px] border-sand-200 bg-white p-4"><p className="font-black text-ink">You&apos;ll set up now</p><p className="mt-1">The basics (name, teams, player count), your course(s), and optionally your rounds, formats, and tee times.</p></div>
        <div className="rounded-2xl border-[1.5px] border-sand-200 bg-white p-4"><p className="font-black text-ink">You&apos;ll handle later</p><p className="mt-1">Players are assigned to teams <strong>after</strong> they join and you approve them. Tee times, courses, and rounds can be adjusted anytime in Admin.</p></div>
        <p className="text-slate-500">Formats: Casual, Scramble (2v2 / 4v4), and Best Ball (2v2 / 4v4). Group formats turn in one combined score per group and award points to the winning team.</p>
      </div>
      <div className="mt-6 flex items-center gap-2">
        <button onClick={onCancel} className="rounded-2xl px-4 py-3 text-sm font-bold text-slate-500">Cancel</button>
        <button onClick={onNext} className="flex-1 rounded-2xl bg-accent px-4 py-4 font-black text-ink">Get started</button>
      </div>
    </div>
  );
}

function StepHead({ n, title }: { n: string; title: string }) {
  return (
    <div>
      <div className="text-xs font-extrabold uppercase tracking-wide text-fairway-900">Step {n} of 4</div>
      <h1 className="mt-0.5 text-2xl font-black text-ink">{title}</h1>
    </div>
  );
}

function NavRow({ onBack, onNext, nextDisabled, nextLabel = "Next" }: { onBack: () => void; onNext: () => void; nextDisabled?: boolean; nextLabel?: string }) {
  return (
    <div className="mt-6 flex items-center gap-2">
      <button onClick={onBack} className="rounded-2xl px-4 py-3 text-sm font-bold text-slate-500">Back</button>
      <button onClick={onNext} disabled={nextDisabled} className="flex-1 rounded-2xl bg-accent px-4 py-4 font-black text-ink disabled:opacity-50">{nextLabel}</button>
    </div>
  );
}

const inp = "w-full rounded-2xl border-[1.5px] border-sand-200 bg-white px-4 py-3.5 text-base outline-none focus:border-fairway-900";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{label}</label>
        {hint ? <span className="text-[11px] text-slate-400">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}
