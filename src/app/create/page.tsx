"use client";

import { useEffect, useMemo, useState } from "react";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { createTrip, insertCourse, insertRound, insertTeeTime, tripExists } from "@/lib/supabase/queries";
import { AuthShell } from "@/features/auth/AuthShell";
import { ImagePlus } from "lucide-react";
import { BackgroundPicker } from "@/features/trip/components/BackgroundPicker";
import { STOCK_BACKGROUNDS } from "@/lib/backgrounds";
import { setHeaderBackground } from "@/lib/supabase/backgrounds";
import { StateSelect } from "@/features/account/identity";

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
  { id: "casual", label: "Casual", format: "casual", groupSize: null, teePer: 4, increment: 1, desc: "Just track scores - no points or head-to-head." },
  { id: "scramble_2", label: "Scramble · 2 v 2", format: "scramble", groupSize: 2, teePer: 4, increment: 4, desc: "Pairs play one ball; one combined score per pair." },
  { id: "scramble_4", label: "Scramble · 4 v 4", format: "scramble", groupSize: 4, teePer: 8, increment: 8, desc: "Foursomes play one ball; one combined score per group." },
  { id: "bestball_2", label: "Best Ball · 2 v 2", format: "best_ball", groupSize: 2, teePer: 4, increment: 4, desc: "Pairs; one combined score per pair." },
  { id: "bestball_4", label: "Best Ball · 4 v 4", format: "best_ball", groupSize: 4, teePer: 8, increment: 8, desc: "Foursomes; one combined score per group." },
  { id: "match_play", label: "Singles Match Play", format: "match_play", groupSize: null, teePer: 4, increment: 1, desc: "Head-to-head pairings for points." },
  { id: "net_score", label: "Net Stroke Play", format: "net_score", groupSize: null, teePer: 4, increment: 1, desc: "Individual net leaderboard." },
];

type CourseDraft = { name: string; par: string; bg?: string | null };
type RoundDraft = { presetId: string; courseIdx: number; arrival: string; teeTimes: string[] };

function teeCountFor(roster: number, teePer: number) {
  return Math.max(1, Math.ceil((roster || 4) / teePer));
}

// Build a friendly display string from two yyyy-mm-dd values, e.g. "Sep 10 - 13, 2026".
function formatDateRange(from: string, to: string): string {
  if (!from) return "";
  const f = new Date(from + "T00:00:00");
  const t = to ? new Date(to + "T00:00:00") : f;
  const mon = (d: Date) => d.toLocaleDateString("en-US", { month: "short" });
  const yr = t.getFullYear();
  if (f.getTime() === t.getTime()) {
    return `${mon(f)} ${f.getDate()}, ${yr}`;
  }
  if (f.getMonth() === t.getMonth() && f.getFullYear() === t.getFullYear()) {
    return `${mon(f)} ${f.getDate()} - ${t.getDate()}, ${yr}`;
  }
  return `${mon(f)} ${f.getDate()} - ${mon(t)} ${t.getDate()}, ${yr}`;
}

// "08:00" -> "8:00 AM"; "13:30" -> "1:30 PM"; "" -> "".
function to12h(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || "").trim());
  if (!m) return "";
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${min} ${ampm}`;
}

// Sensible dummy tee times when left blank: 8:00, 8:10, 8:20, ...
function staggerTee(index: number): string {
  const total = 8 * 60 + index * 10;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return to12h(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
}

export default function CreatePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [createdTripId, setCreatedTripId] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [bgPickerIdx, setBgPickerIdx] = useState<number | null>(null);
  const [headerBg, setHeaderBg] = useState<string | null>(null);
  const [headerPicking, setHeaderPicking] = useState(false);
  const [checkingCode, setCheckingCode] = useState(false);

  async function goFromBasics() {
    const supabase = getSupabaseClient();
    const code = joinCode.trim().toUpperCase();
    if (!supabase) {
      setStep(2);
      return;
    }
    setCheckingCode(true);
    setError(null);
    try {
      if (await tripExists(supabase, code)) {
        setError(`Join code "${code}" is already taken - please pick another.`);
        return;
      }
      setStep(2);
    } finally {
      setCheckingCode(false);
    }
  }
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [wantsPro, setWantsPro] = useState(true);
  const [location, setLocation] = useState("");
  const [stateAbbr, setStateAbbr] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [oddConfirm, setOddConfirm] = useState(false);
  const [postStep, setPostStep] = useState<0 | 1>(0);
  const [upgradedNow, setUpgradedNow] = useState(false);
  const [teamAName, setTeamAName] = useState("Team A");
  const [teamBName, setTeamBName] = useState("Team B");
  const [rosterSize, setRosterSize] = useState("12");
  const [courses, setCourses] = useState<CourseDraft[]>([{ name: "", par: "72", bg: null }]);
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

  const step1Valid = name.trim() && joinCode.trim();
  const step2Valid = stateAbbr.trim() && location.trim();
  const step3Valid = Boolean(startDate && endDate && endDate >= startDate);
  const step4Valid = teamAName.trim() && teamBName.trim();
  const step5Valid = roster >= 2 && (roster % 2 === 0 || oddConfirm);

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
    const displayDates = formatDateRange(startDate, endDate);
    const combinedLocation = [location.trim(), stateAbbr.trim()]
      .filter(Boolean)
      .join(", ");
    try {
      const created = await createTrip(supabase, {
        name,
        joinCode: code,
        location: combinedLocation,
        dates: displayDates,
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

      // Structured state + the up-front Pro choice (no billing yet - free preview).
      try {
        await supabase
          .from("trips")
          .update({
            state: stateAbbr.trim() || null,
            is_pro: wantsPro,
            ...(wantsPro ? { pro_since: new Date().toISOString() } : {}),
          })
          .eq("id", tripId);
      } catch {
        /* non-fatal */
      }

      if (headerBg) {
        try {
          await setHeaderBackground(supabase, tripId, headerBg);
        } catch {
          /* non-fatal */
        }
      }

      const courseIds: string[] = [];
      for (const c of realCourses) {
        const id = await insertCourse(supabase, tripId, { name: c.name.trim(), par: Number(c.par) || 72, rating: 72, slope: 113, imageUrl: c.bg ?? undefined });
        courseIds.push(id);
      }

      if (setRoundsNow) {
        let n = 0;
        for (const r of rounds) {
          n += 1;
          const p = presetById(r.presetId);
          const teeTimes = r.teeTimes.map((t, idx) => to12h(t) || staggerTee(idx));
          const arrival = to12h(r.arrival) || teeTimes[0] || staggerTee(0);
          const roundId = await insertRound(supabase, tripId, {
            roundNumber: n,
            title: `Round ${n}`,
            dateLabel: "",
            courseId: courseIds[r.courseIdx] ?? courseIds[0] ?? "",
            format: p.format,
            groupSize: p.groupSize,
            pointsAvailable: 1,
            arrivalTime: arrival,
          });
          let order = 0;
          for (const t of teeTimes) {
            order += 1;
            await insertTeeTime(supabase, roundId, t, order);
          }
        }
      }

      setCreatedTripId(tripId);
      setCreatedCode(code);
      setBusy(false);
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

  if (createdCode) {
    const isPro = wantsPro || upgradedNow;
    const joinUrl = `https://www.tourneybirdie.com/t/${createdCode}`;
    const share = async () => {
      const text = `Join my tournament "${name}" on TourneyBirdie - code ${createdCode}\n${joinUrl}`;
      try {
        if (navigator.share) await navigator.share({ title: "TourneyBirdie", text, url: joinUrl });
        else await navigator.clipboard.writeText(text);
      } catch { /* ignore */ }
    };
    const upgradeNow = async () => {
      const supabase = getSupabaseClient();
      if (supabase && createdTripId) {
        setUpgrading(true);
        await supabase.from("trips").update({ is_pro: true, pro_since: new Date().toISOString() }).eq("id", createdTripId);
        setUpgrading(false);
      }
      setUpgradedNow(true);
    };
    return (
      <AuthShell>
        {postStep === 0 ? (
          <div className="text-center">
            <img src="/create-mascot.png" alt="" className="mx-auto h-40 w-auto" />
            <h1 className="mt-1 text-3xl font-black text-fairway-900">
              {isPro ? "Pro tournament created! ✨" : "Tournament created! 🎉"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">Share this code so players can join.</p>
            <div className="mx-auto mt-4 rounded-2xl border-2 border-dashed border-accent bg-white p-4">
              <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">Join code</div>
              <div className="text-4xl font-black tracking-[4px] text-fairway-900">{createdCode}</div>
            </div>

            {isPro ? (
              <div className="mt-4 rounded-2xl border-[1.5px] border-emerald-200 bg-emerald-50 p-4 text-left">
                <p className="font-black text-emerald-900">✨ Pro is on - you unlocked:</p>
                <ul className="mt-2 space-y-1.5 text-[13.5px] text-emerald-900">
                  <li>🏅 Post-round awards &amp; voting (toggle in Admin → Scoring)</li>
                  <li>🎬 Trip Wrapped auto-generates when you End the tournament</li>
                  <li>🖼️ Custom round backgrounds + Clubhouse chat &amp; photos</li>
                </ul>
                <p className="mt-3 text-[13px] font-bold text-emerald-900">Next: invite players, assign teams, and start Round 1 on the course.</p>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border-[1.5px] border-amber-200 bg-amber-50 p-4 text-left">
                <p className="font-black text-amber-900">💡 You&apos;re on Free - Pro would add:</p>
                <ul className="mt-2 space-y-1.5 text-[13.5px] text-amber-900">
                  <li>🏅 Post-round awards &amp; voting</li>
                  <li>🎬 Trip Wrapped shareable recap</li>
                  <li>🖼️ Custom backgrounds + Clubhouse chat &amp; photos</li>
                </ul>
                <button onClick={upgradeNow} disabled={upgrading} className="mt-3 w-full rounded-2xl bg-accent px-4 py-3 font-black text-ink disabled:opacity-50">{upgrading ? "Upgrading…" : "Upgrade to Pro ✨"}</button>
              </div>
            )}

            <button onClick={() => setPostStep(1)} className="mt-6 w-full rounded-2xl bg-fairway-900 px-4 py-4 font-black text-white">Next: invite your crew →</button>
          </div>
        ) : (
          <div>
            <h1 className="text-3xl font-black text-fairway-900">Invite your crew</h1>
            <p className="mt-1 text-sm text-slate-500">Share the code now, or later - players can also enter it themselves.</p>
            <div className="mt-4 rounded-2xl border-2 border-dashed border-accent bg-white p-4 text-center">
              <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">Join code</div>
              <div className="text-4xl font-black tracking-[4px] text-fairway-900">{createdCode}</div>
              <button onClick={share} className="mt-3 w-full rounded-2xl border-[1.5px] border-fairway-900 px-4 py-2.5 font-black text-fairway-900">📋 Copy / Share</button>
            </div>
            <button onClick={() => router.push(`/t/${createdCode}`)} className="mt-6 w-full rounded-2xl bg-fairway-900 px-4 py-4 font-black text-white">Go to tournament →</button>
            <button onClick={() => router.push(`/t/${createdCode}`)} className="mt-2 w-full text-center text-sm font-bold text-slate-500">Skip - I&apos;ll invite later</button>
          </div>
        )}
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div>
        <div className="mb-4 flex items-center gap-1.5">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((s) => (
            <span key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-fairway-900" : "bg-sand-200"}`} />
          ))}
        </div>

        {step === 0 ? <Paywall wantsPro={wantsPro} setWantsPro={setWantsPro} onNext={() => setStep(1)} onCancel={() => router.push("/home")} /> : null}

        {step === 1 ? (
          <div>
            <StepHead n="1" title="Name your tournament" />
            <div className="mt-4 space-y-4">
              <Field label="Tournament name">
                <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="3rd Annual McKannay Invitational" />
              </Field>
              <Field label="Join code" hint="players type this to join">
                <input className={inp} value={joinCode} onChange={(e) => { setJoinCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()); setError(null); }} placeholder="MCK2027" autoCapitalize="characters" />
              </Field>
            </div>
            {error ? (<p className="mt-3 text-sm font-bold text-team-north">{error}</p>) : null}
            <NavRow onBack={() => setStep(0)} onNext={goFromBasics} nextDisabled={!step1Valid || checkingCode} nextLabel={checkingCode ? "Checking…" : "Next"} />
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <StepHead n="2" title="Where are you playing?" />
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="State"><StateSelect value={stateAbbr} onChange={setStateAbbr} /></Field>
                <Field label="Location"><input className={inp} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Hilton Head" /></Field>
              </div>
            </div>
            <NavRow onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!step2Valid} />
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <StepHead n="3" title="When's the trip?" />
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="From"><input className={inp} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
                <Field label="To"><input className={inp} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
              </div>
              {startDate && endDate && endDate < startDate ? (
                <p className="text-[13px] font-bold text-red-600">End date must be on or after the start date.</p>
              ) : null}
            </div>
            <NavRow onBack={() => setStep(2)} onNext={() => setStep(4)} nextDisabled={!step3Valid} />
          </div>
        ) : null}

        {step === 4 ? (
          <div>
            <StepHead n="4" title="Name your teams" />
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Team A name"><input className={inp} value={teamAName} onChange={(e) => setTeamAName(e.target.value)} /></Field>
                <Field label="Team B name"><input className={inp} value={teamBName} onChange={(e) => setTeamBName(e.target.value)} /></Field>
              </div>
            </div>
            <NavRow onBack={() => setStep(3)} onNext={() => setStep(5)} nextDisabled={!step4Valid} />
          </div>
        ) : null}

        {step === 5 ? (
          <div>
            <StepHead n="5" title="How many players?" />
            <div className="mt-4 space-y-4">
              <Field label="Number of players" hint="spots on the roster">
                <input className={inp} inputMode="numeric" value={rosterSize} onChange={(e) => { setRosterSize(e.target.value.replace(/[^0-9]/g, "").slice(0, 3)); setOddConfirm(false); }} placeholder="8" />
                {roster < 2 ? (
                  <p className="mt-1.5 text-[13px] font-bold text-red-600">You need at least 2 players to run a tournament.</p>
                ) : roster % 2 !== 0 ? (
                  <div className="mt-2 rounded-2xl border-[1.5px] border-amber-300 bg-amber-50 p-3">
                    <p className="text-sm font-black text-amber-900">⚠︎ That&apos;s an odd number of players.</p>
                    <ul className="mt-1.5 list-disc pl-5 text-[13px] text-amber-900">
                      <li>Teams won&apos;t be even - one side plays a person short.</li>
                      <li>Team scoring can get lopsided; best ball &amp; match play expect pairs.</li>
                      <li>You&apos;ll likely add a sub/&quot;ghost&quot; player or someone sits a round.</li>
                    </ul>
                    <label className="mt-2 flex items-start gap-2 text-[13px] font-bold text-amber-900">
                      <input type="checkbox" checked={oddConfirm} onChange={(e) => setOddConfirm(e.target.checked)} className="mt-0.5" />
                      <span>I understand - use an odd number anyway.</span>
                    </label>
                  </div>
                ) : (
                  <p className="mt-1.5 text-[13px] text-slate-400">
                    Two even teams. Group formats need more: 2v2 a multiple of 4, 4v4 a multiple of 8 - formats that don&apos;t fit won&apos;t be offered.
                  </p>
                )}
              </Field>
            </div>
            <NavRow onBack={() => setStep(4)} onNext={() => setStep(6)} nextDisabled={!step5Valid} />
          </div>
        ) : null}

        {step === 6 ? (
          <div>
            <StepHead n="6" title="Courses" />
            <p className="mt-1 text-sm text-slate-500">Add the course(s) you&apos;re playing - just a name and par for now. Every round links to a course.</p>

            <div className="mt-4 rounded-2xl border-[1.5px] border-sand-200 bg-white p-3">
              <p className="text-sm font-bold text-ink">Tournament banner</p>
              <p className="text-xs text-slate-500">The big image at the top of every screen.</p>
              <button
                type="button"
                onClick={() => setHeaderPicking(true)}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-fairway-900"
              >
                <ImagePlus size={13} />
                {headerBg
                  ? STOCK_BACKGROUNDS.find((b) => b.id === headerBg)?.title ??
                    "Custom banner"
                  : "Choose a banner background (optional)"}
              </button>
            </div>

            <div className="mt-3 space-y-3">
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
                  <button
                    type="button"
                    onClick={() => setBgPickerIdx(i)}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-fairway-900"
                  >
                    <ImagePlus size={13} />
                    {c.bg
                      ? STOCK_BACKGROUNDS.find((b) => b.id === c.bg)?.title ??
                        "Custom background"
                      : "Add background (optional)"}
                  </button>
                </div>
              ))}
              <button onClick={() => setCourses((p) => [...p, { name: "", par: "72", bg: null }])} className="w-full rounded-2xl border-[1.5px] border-dashed border-sand-200 py-3 text-sm font-bold text-slate-500">+ Add another course</button>
              <p className="text-xs text-slate-400">
                Pick a background per course now from our scene library. Pro
                tournaments (coming soon) will let you upload your own course
                photos.
              </p>
              {realCourses.length === 0 ? <p className="text-sm text-slate-400">You can skip this and add courses later in Admin, but you&apos;ll need at least one before setting up rounds.</p> : null}
            </div>
            <NavRow onBack={() => setStep(5)} onNext={() => setStep(7)} />
          </div>
        ) : null}

        {step === 7 ? (
          <div>
            <StepHead n="7" title="Rounds" />
            <p className="mt-1 text-sm text-slate-500">Set up your rounds now, or do it later in Admin.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => { setSetRoundsNow(true); if (rounds.length === 0) setRounds([newRound()]); }} className={`rounded-2xl border-[1.5px] p-3 text-sm font-black ${setRoundsNow === true ? "border-fairway-900 bg-fairway-900/5" : "border-sand-200 bg-white"}`}>Set up now</button>
              <button onClick={() => setSetRoundsNow(false)} className={`rounded-2xl border-[1.5px] p-3 text-sm font-black ${setRoundsNow === false ? "border-fairway-900 bg-fairway-900/5" : "border-sand-200 bg-white"}`}>Later in Admin</button>
            </div>

            {setRoundsNow === false ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">No problem - add rounds anytime in Admin. We&apos;d still encourage setting up at least one now so your tournament is ready the moment everyone joins.</div> : null}
            {setRoundsNow === true && realCourses.length === 0 ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Add at least one course first (Back) - every round needs a course so scores can be calculated.</div> : null}

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
                        <input type="time" className={inp} value={r.arrival} onChange={(e) => setRounds((pr) => pr.map((x, j) => (j === i ? { ...x, arrival: e.target.value } : x)))} />
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
                              <input key={ti} type="time" className="w-full rounded-lg border-[1.5px] border-sand-200 bg-white px-3 py-2 text-sm outline-none focus:border-fairway-900" value={t} onChange={(e) => setRounds((pr) => pr.map((x, j) => (j === i ? { ...x, teeTimes: x.teeTimes.map((v, k) => (k === ti ? e.target.value : v)) } : x)))} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <button onClick={() => setRounds((p) => [...p, newRound()])} className="w-full rounded-2xl border-[1.5px] border-dashed border-sand-200 py-3 text-sm font-bold text-slate-500">+ Add another round</button>
                {rounds.some((r) => r.teeTimes.some((t) => !t.trim()) || !r.arrival.trim()) ? <p className="text-sm text-slate-400">Blank tee/arrival times will be defaulted for now - adjust anytime in Admin.</p> : null}
              </div>
            ) : null}

            {error ? <p className="mt-4 text-sm font-bold text-red-600">{error}</p> : null}
            <div className="mt-6 flex items-center gap-2">
              <button onClick={() => setStep(6)} className="rounded-2xl px-4 py-3 text-sm font-bold text-slate-500">Back</button>
              <button onClick={finish} disabled={busy || setRoundsNow === null || (setRoundsNow === true && realCourses.length === 0)} className="flex-1 rounded-2xl bg-accent px-4 py-4 font-black text-ink disabled:opacity-50">{busy ? "Creating…" : "Create Tournament"}</button>
            </div>
          </div>
        ) : null}
      </div>

      <BackgroundPicker
        open={bgPickerIdx !== null}
        onClose={() => setBgPickerIdx(null)}
        value={bgPickerIdx !== null ? courses[bgPickerIdx]?.bg ?? null : null}
        onSelect={(v) =>
          setCourses((p) =>
            p.map((x, j) => (j === bgPickerIdx ? { ...x, bg: v } : x))
          )
        }
        title="Course background"
      />

      <BackgroundPicker
        open={headerPicking}
        onClose={() => setHeaderPicking(false)}
        value={headerBg}
        onSelect={(v) => setHeaderBg(v)}
        title="Tournament banner"
        subtitle="The big image at the top of every screen."
      />
    </AuthShell>
  );
}

function Paywall({
  wantsPro,
  setWantsPro,
  onNext,
  onCancel,
}: {
  wantsPro: boolean;
  setWantsPro: (v: boolean) => void;
  onNext: () => void;
  onCancel: () => void;
}) {
  const proFeatures = [
    { t: "Post-round awards & voting", d: "Sandman, First Beer, Three-Putt - players vote." },
    { t: "Trip Wrapped", d: "A shareable, downloadable recap at the end." },
    { t: "Custom round backgrounds", d: "Your own course photos set the vibe." },
    { t: "Clubhouse chat & photos", d: "A group feed for smack talk and shots." },
  ];
  return (
    <div className="-mx-5 -mt-2 overflow-hidden rounded-b-3xl bg-[radial-gradient(120%_65%_at_50%_0%,#16b57a_0%,#0c8a5c_45%,#075437_100%)] px-5 pb-6 pt-3 text-emerald-50">
      <img src="/create-mascot.png" alt="TourneyBirdie mascot" className="mx-auto h-52 w-auto drop-shadow-xl" />
      <h1 className="text-center text-3xl font-black text-white">Run It Like A Pro</h1>
      <p className="mt-1 text-center text-sm text-emerald-100/80">See what a Pro tournament unlocks.</p>

      <div className="relative mt-4 flex rounded-full bg-black/25 p-1">
        <span className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-accent transition-all ${wantsPro ? "left-[calc(50%)]" : "left-1"}`} />
        <button onClick={() => setWantsPro(false)} className={`relative z-10 flex-1 rounded-full py-2.5 text-sm font-black ${wantsPro ? "text-emerald-50" : "text-ink"}`}>Free</button>
        <button onClick={() => setWantsPro(true)} className={`relative z-10 flex-1 rounded-full py-2.5 text-sm font-black ${wantsPro ? "text-ink" : "text-emerald-50"}`}>Pro ✨</button>
      </div>

      <div className="mt-4 space-y-0">
        <div className="flex items-start gap-3 border-b border-white/10 py-2.5">
          <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-accent text-[11px] font-black text-ink">✓</span>
          <div><b className="text-[14.5px]">Scoring, teams & leaderboard</b><p className="mt-0.5 text-[12.5px] text-emerald-100/75">Always free - the core tournament engine.</p></div>
        </div>
        {proFeatures.map((f, i) => (
          <div key={i} className="flex items-start gap-3 border-b border-white/10 py-2.5 transition-all" style={{ opacity: wantsPro ? 1 : 0.35, transform: wantsPro ? "none" : "translateY(4px)", transitionDelay: `${i * 60}ms` }}>
            <span className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full text-[11px] font-black ${wantsPro ? "bg-accent text-ink" : "bg-white/15 text-white"}`}>✓</span>
            <div><b className="text-[14.5px]">{f.t}</b><p className="mt-0.5 text-[12.5px] text-emerald-100/75">{f.d}</p></div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-center text-xs text-emerald-100/70">{wantsPro ? "Pro • free while in beta" : "Free • upgrade anytime"}</p>
      <button onClick={onNext} className={`mt-3 w-full rounded-2xl px-4 py-4 font-black ${wantsPro ? "bg-accent text-ink" : "bg-white text-fairway-900"}`}>
        {wantsPro ? "Start with Pro ✨" : "Start Free"}
      </button>
      <button onClick={onCancel} className="mt-2 w-full text-center text-sm font-bold text-emerald-100/80">Cancel</button>
    </div>
  );
}

function StepHead({ n, title }: { n: string; title: string }) {
  return (
    <div>
      <div className="text-xs font-extrabold uppercase tracking-wide text-fairway-900">Step {n} of 7</div>
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

