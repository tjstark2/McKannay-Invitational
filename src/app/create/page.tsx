"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { createTrip, insertCourse, insertRound } from "@/lib/supabase/queries";
import { AuthShell } from "@/features/auth/AuthShell";

type FormatOption = { id: string; label: string; desc: string };
const FORMATS: FormatOption[] = [
  { id: "casual", label: "Casual", desc: "Just track scores — no points or head-to-head." },
  { id: "best_ball", label: "Best Ball", desc: "Two teams; the best score on each hole counts." },
  { id: "match_play", label: "Singles Match Play", desc: "Head-to-head pairings for points." },
  { id: "net_score", label: "Net Stroke Play", desc: "Individual net leaderboard." },
];

type CourseDraft = { name: string; par: string };
type RoundDraft = { courseIdx: number; format: string; teeTime: string };

export default function CreatePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(0); // 0 intro, 1 basics, 2 courses, 3 rounds
  // basics
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [location, setLocation] = useState("");
  const [dates, setDates] = useState("");
  const [teamAName, setTeamAName] = useState("Team A");
  const [teamBName, setTeamBName] = useState("Team B");
  const [rosterSize, setRosterSize] = useState("12");
  // courses
  const [courses, setCourses] = useState<CourseDraft[]>([{ name: "", par: "72" }]);
  // rounds
  const [setRoundsNow, setSetRoundsNow] = useState<boolean | null>(null);
  const [rounds, setRounds] = useState<RoundDraft[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  const realCourses = useMemo(
    () => courses.filter((c) => c.name.trim()),
    [courses]
  );

  const basicsValid =
    name.trim() && joinCode.trim() && teamAName.trim() && teamBName.trim();

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
        rosterSize: Number(rosterSize) || 12,
        defaultFormat: rounds[0]?.format ?? null,
        ownerId: user.id,
      });
      if (!created.ok || !created.tripId) {
        setBusy(false);
        setError(created.error ?? "Something went wrong.");
        return;
      }
      const tripId = created.tripId;

      // Create courses, remembering their new ids in order.
      const courseIds: string[] = [];
      for (const c of realCourses) {
        const id = await insertCourse(supabase, tripId, {
          name: c.name.trim(),
          par: Number(c.par) || 72,
          rating: 72,
          slope: 113,
        });
        courseIds.push(id);
      }

      // Create rounds linked to the chosen course.
      if (setRoundsNow) {
        let n = 0;
        for (const r of rounds) {
          n += 1;
          await insertRound(supabase, tripId, {
            roundNumber: n,
            title: `Round ${n}`,
            dateLabel: r.teeTime.trim() || "",
            courseId: courseIds[r.courseIdx] ?? courseIds[0] ?? "",
            format: r.format as "casual" | "best_ball" | "match_play" | "net_score",
            pointsAvailable: 1,
            arrivalTime: r.teeTime.trim() || "",
          });
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
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f1]">
        <p className="text-3xl">⛳</p>
      </div>
    );
  }

  return (
    <AuthShell>
      <div>
        <div className="mb-4 flex items-center gap-1.5">
          {[0, 1, 2, 3].map((s) => (
            <span
              key={s}
              className={`h-1.5 flex-1 rounded-full ${
                s <= step ? "bg-fairway-900" : "bg-sand-200"
              }`}
            />
          ))}
        </div>

        {step === 0 ? (
          <Intro onNext={() => setStep(1)} onCancel={() => router.push("/home")} />
        ) : null}

        {step === 1 ? (
          <div>
            <StepHead n="2" title="The basics" />
            <div className="mt-4 space-y-4">
              <Field label="Tournament name">
                <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="3rd Annual McKannay Invitational" />
              </Field>
              <Field label="Join code" hint="players type this to join">
                <input
                  className={inp}
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase());
                    setError(null);
                  }}
                  placeholder="MCK2027"
                  autoCapitalize="characters"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Location" hint="optional">
                  <input className={inp} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Hilton Head, SC" />
                </Field>
                <Field label="Dates" hint="optional">
                  <input className={inp} value={dates} onChange={(e) => setDates(e.target.value)} placeholder="Sept 10–13" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Team A name">
                  <input className={inp} value={teamAName} onChange={(e) => setTeamAName(e.target.value)} />
                </Field>
                <Field label="Team B name">
                  <input className={inp} value={teamBName} onChange={(e) => setTeamBName(e.target.value)} />
                </Field>
              </div>
              <Field label="Number of players" hint="spots on the roster">
                <input className={inp} inputMode="numeric" value={rosterSize} onChange={(e) => setRosterSize(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))} placeholder="12" />
              </Field>
            </div>
            <NavRow
              onBack={() => setStep(0)}
              onNext={() => setStep(2)}
              nextDisabled={!basicsValid}
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <StepHead n="3" title="Courses" />
            <p className="mt-1 text-sm text-slate-500">
              Add the course(s) you&apos;re playing. You only need a name and par
              now — rating, slope, and tees can be tuned later in Admin.
            </p>
            <div className="mt-4 space-y-3">
              {courses.map((c, i) => (
                <div key={i} className="rounded-2xl border-[1.5px] border-sand-200 bg-white p-3">
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 rounded-xl border-[1.5px] border-sand-200 px-3 py-2.5 outline-none focus:border-fairway-900"
                      value={c.name}
                      onChange={(e) =>
                        setCourses((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                      }
                      placeholder={`Course ${i + 1} name`}
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-500">Par</span>
                      <input
                        className="w-14 rounded-xl border-[1.5px] border-sand-200 px-2 py-2.5 text-center outline-none focus:border-fairway-900"
                        inputMode="numeric"
                        value={c.par}
                        onChange={(e) =>
                          setCourses((prev) => prev.map((x, j) => (j === i ? { ...x, par: e.target.value.replace(/[^0-9]/g, "").slice(0, 2) } : x)))
                        }
                      />
                    </div>
                    {courses.length > 1 ? (
                      <button
                        onClick={() => setCourses((prev) => prev.filter((_, j) => j !== i))}
                        className="rounded-lg px-2 py-1 text-sm font-bold text-slate-400"
                      >
                        ✕
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
              <button
                onClick={() => setCourses((prev) => [...prev, { name: "", par: "72" }])}
                className="w-full rounded-2xl border-[1.5px] border-dashed border-sand-200 py-3 text-sm font-bold text-slate-500"
              >
                + Add another course
              </button>
              {realCourses.length === 0 ? (
                <p className="text-sm text-slate-400">
                  You can skip this and add courses later in Admin, but you&apos;ll
                  need at least one course before you can set up rounds.
                </p>
              ) : null}
            </div>
            <NavRow onBack={() => setStep(1)} onNext={() => setStep(3)} nextLabel="Next" />
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <StepHead n="4" title="Rounds" />
            <p className="mt-1 text-sm text-slate-500">
              Do you know your rounds and formats yet? You can set them up now or
              do it later in Admin.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setSetRoundsNow(true);
                  if (rounds.length === 0) setRounds([{ courseIdx: 0, format: "casual", teeTime: "" }]);
                }}
                className={`rounded-2xl border-[1.5px] p-3 text-sm font-black ${setRoundsNow === true ? "border-fairway-900 bg-fairway-900/5" : "border-sand-200 bg-white"}`}
              >
                Set up now
              </button>
              <button
                onClick={() => setSetRoundsNow(false)}
                className={`rounded-2xl border-[1.5px] p-3 text-sm font-black ${setRoundsNow === false ? "border-fairway-900 bg-fairway-900/5" : "border-sand-200 bg-white"}`}
              >
                Later in Admin
              </button>
            </div>

            {setRoundsNow === false ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                No problem — you can add rounds anytime in Admin. We&apos;d still
                encourage setting up at least one now so your tournament is ready
                to play the moment everyone joins.
              </div>
            ) : null}

            {setRoundsNow === true && realCourses.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Add at least one course first (Back) — every round needs a course
                so scores can be calculated.
              </div>
            ) : null}

            {setRoundsNow === true && realCourses.length > 0 ? (
              <div className="mt-4 space-y-3">
                {rounds.map((r, i) => (
                  <div key={i} className="rounded-2xl border-[1.5px] border-sand-200 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-ink">Round {i + 1}</span>
                      {rounds.length > 1 ? (
                        <button onClick={() => setRounds((p) => p.filter((_, j) => j !== i))} className="text-sm font-bold text-slate-400">✕</button>
                      ) : null}
                    </div>
                    <div className="mt-2 space-y-2">
                      <select
                        className={inp}
                        value={r.courseIdx}
                        onChange={(e) => setRounds((p) => p.map((x, j) => (j === i ? { ...x, courseIdx: Number(e.target.value) } : x)))}
                      >
                        {realCourses.map((c, ci) => (
                          <option key={ci} value={ci}>{c.name.trim() || `Course ${ci + 1}`}</option>
                        ))}
                      </select>
                      <select
                        className={inp}
                        value={r.format}
                        onChange={(e) => setRounds((p) => p.map((x, j) => (j === i ? { ...x, format: e.target.value } : x)))}
                      >
                        {FORMATS.map((f) => (
                          <option key={f.id} value={f.id}>{f.label}</option>
                        ))}
                      </select>
                      <input
                        className={inp}
                        value={r.teeTime}
                        onChange={(e) => setRounds((p) => p.map((x, j) => (j === i ? { ...x, teeTime: e.target.value } : x)))}
                        placeholder="Tee time (optional, e.g. 9:00 AM)"
                      />
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => setRounds((p) => [...p, { courseIdx: 0, format: "casual", teeTime: "" }])}
                  className="w-full rounded-2xl border-[1.5px] border-dashed border-sand-200 py-3 text-sm font-bold text-slate-500"
                >
                  + Add another round
                </button>
                {rounds.some((r) => !r.teeTime.trim()) ? (
                  <p className="text-sm text-slate-400">
                    Tee times left blank will be defaulted for now — you can adjust
                    them anytime in Admin.
                  </p>
                ) : null}
              </div>
            ) : null}

            {error ? <p className="mt-4 text-sm font-bold text-red-600">{error}</p> : null}

            <div className="mt-6 flex items-center gap-2">
              <button onClick={() => setStep(2)} className="rounded-2xl px-4 py-3 text-sm font-bold text-slate-500">Back</button>
              <button
                onClick={finish}
                disabled={busy || setRoundsNow === null || (setRoundsNow === true && realCourses.length === 0)}
                className="flex-1 rounded-2xl bg-accent px-4 py-4 font-black text-ink disabled:opacity-50"
              >
                {busy ? "Creating…" : "Create Tournament"}
              </button>
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
        <p>
          A tournament is made up of <strong>rounds</strong>, and each round can
          have its own <strong>format</strong> — so Day 1 could be a scramble,
          Day 2 best ball, and so on.
        </p>
        <div className="rounded-2xl border-[1.5px] border-sand-200 bg-white p-4">
          <p className="font-black text-ink">You&apos;ll set up now</p>
          <p className="mt-1">
            The basics (name, teams, player count), your course(s), and
            optionally your rounds and formats.
          </p>
        </div>
        <div className="rounded-2xl border-[1.5px] border-sand-200 bg-white p-4">
          <p className="font-black text-ink">You&apos;ll handle later</p>
          <p className="mt-1">
            Players are assigned to teams <strong>after</strong> they join and
            you approve them. Tee times, courses, and rounds can be adjusted
            anytime in Admin.
          </p>
        </div>
        <p className="text-slate-500">
          Formats available now: Casual, Best Ball, Singles Match Play, and Net
          Stroke Play. (Scramble is coming next.)
        </p>
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

function NavRow({
  onBack,
  onNext,
  nextDisabled,
  nextLabel = "Next",
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="mt-6 flex items-center gap-2">
      <button onClick={onBack} className="rounded-2xl px-4 py-3 text-sm font-bold text-slate-500">Back</button>
      <button onClick={onNext} disabled={nextDisabled} className="flex-1 rounded-2xl bg-accent px-4 py-4 font-black text-ink disabled:opacity-50">{nextLabel}</button>
    </div>
  );
}

const inp =
  "w-full rounded-2xl border-[1.5px] border-sand-200 bg-white px-4 py-3.5 text-base outline-none focus:border-fairway-900";

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
