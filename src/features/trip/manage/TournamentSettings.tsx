"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  loadTripSettings,
  loadRoundProgress,
  saveTripSettings,
  type TripSettings,
  type RoundProgress,
  type ScoringMode,
} from "@/lib/supabase/tripSettings";
import { CourseHolesTab } from "@/features/trip/manage/CourseHolesTab";
import { RoundsTab } from "@/features/trip/manage/RoundsTab";
import { TeamsPanel } from "@/features/trip/manage/TeamsPanel";
import { loadVotingEnabled, setVotingEnabled as persistVoting, setTournamentWrapped } from "@/lib/supabase/roundsAdmin";
import { notify, notifyEvent } from "@/lib/notify";
import { listActiveMembers } from "@/lib/supabase/memberships";
import { useAuth } from "@/features/auth/AuthContext";

export type ManageTab = "basics" | "players" | "teams" | "courses" | "rounds" | "pro";

export const MANAGE_TABS: { id: ManageTab; label: string }[] = [
  { id: "basics", label: "Basics" },
  { id: "players", label: "Players" },
  { id: "teams", label: "Teams & Captains" },
  { id: "courses", label: "Courses" },
  { id: "rounds", label: "Rounds" },
  { id: "pro", label: "Pro" },
];

type Tab = ManageTab;

const inputClass =
  "w-full rounded-xl border-[1.5px] border-sand-200 bg-white px-3 py-2 text-ink outline-none focus:border-fairway-900";
const labelClass = "block text-xs font-black uppercase tracking-wide text-slate-500";

export function TournamentSettings({
  tripId,
  canManage,
  onUpsell,
  tab: externalTab,
  joinCode,
}: {
  tripId: string;
  canManage: boolean;
  onUpsell: (topic: "hole_by_hole") => void;
  tab?: ManageTab;
  joinCode?: string;
}) {
  const [innerTab, setInnerTab] = useState<Tab>("basics");
  const tab: Tab = externalTab ?? innerTab;
  const setTab = setInnerTab;
  const [s, setS] = useState<TripSettings | null>(null);
  const [progress, setProgress] = useState<RoundProgress>({ completed: 0, inProgress: 0, total: 0 });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmMode, setConfirmMode] = useState<ScoringMode | null>(null);
  const [voting, setVoting] = useState(true);
  const [endConfirm, setEndConfirm] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let alive = true;
    (async () => {
      const [settings, prog] = await Promise.all([
        loadTripSettings(supabase, tripId),
        loadRoundProgress(supabase, tripId),
      ]);
      if (!alive) return;
      setS(settings);
      setProgress(prog);
      setVoting(await loadVotingEnabled(supabase, tripId));
    })();
    return () => {
      alive = false;
    };
  }, [tripId]);

  if (!s) return null;

  const set = <K extends keyof TripSettings>(k: K, v: TripSettings[K]) =>
    setS((prev) => (prev ? { ...prev, [k]: v } : prev));

  async function save(patch: Parameters<typeof saveTripSettings>[2], note = "Saved") {
    const supabase = getSupabaseClient();
    if (!supabase || !canManage) return;
    setBusy(true);
    setError(null);
    const res = await saveTripSettings(supabase, tripId, patch);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "Couldn't save. Try again.");
      return;
    }
    setToast(note);
    setTimeout(() => setToast(null), 2000);
  }

  // --- scoring mode -------------------------------------------------------
  function requestMode(next: ScoringMode) {
    if (!s) return;
    if (!s.isPro) {
      onUpsell("hole_by_hole");
      return;
    }
    if (next === s.scoringMode) return;
    setConfirmMode(next);
  }

  async function applyMode() {
    if (!confirmMode) return;
    set("scoringMode", confirmMode);
    await save({ scoringMode: confirmMode }, "Scoring mode updated");
    setConfirmMode(null);
  }

  const turningOff = confirmMode === "basic_918";
  const hardWarning = turningOff && progress.completed > 0;

  const tabs = MANAGE_TABS.filter((t) => t.id !== "players");

  return (
    <section className="mb-5 rounded-3xl border border-sand-200 bg-white p-4 shadow-sm">
      {externalTab ? null : (
        <h2 className="mb-3 font-anton text-2xl tracking-tight text-ink">Tournament Settings</h2>
      )}

      {externalTab ? null : (
      <div className="mb-4 flex gap-1.5 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-black ${
              tab === t.id ? "bg-fairway-900 text-white" : "bg-[#f3efe6] text-slate-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      )}

      {/* ---------------- BASICS ---------------- */}
      {tab === "basics" ? (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Tournament Name</label>
            <input
              className={inputClass}
              value={s.name}
              disabled={!canManage}
              onChange={(e) => set("name", e.target.value)}
              onBlur={() => save({ name: s.name })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>City</label>
              <input
                className={inputClass}
                value={s.location ?? ""}
                disabled={!canManage}
                onChange={(e) => set("location", e.target.value)}
                onBlur={() => save({ location: s.location })}
              />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input
                className={inputClass}
                value={s.state ?? ""}
                disabled={!canManage}
                maxLength={2}
                onChange={(e) => set("state", e.target.value.toUpperCase())}
                onBlur={() => save({ state: s.state })}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Dates</label>
            <input
              className={inputClass}
              value={s.dates ?? ""}
              disabled={!canManage}
              placeholder="Sept 9 - Sept 13, 2026"
              onChange={(e) => set("dates", e.target.value)}
              onBlur={() => save({ dates: s.dates })}
            />
          </div>

          <div>
            <label className={labelClass}>Join Code</label>
            <div className="flex items-center gap-2 rounded-xl border-[1.5px] border-dashed border-sand-200 bg-[#f7f6f1] px-3 py-2">
              <span className="font-anton text-lg tracking-wider text-ink">{s.joinCode}</span>
              <span className="ml-auto text-xs font-bold text-slate-400">Can&apos;t be changed</span>
            </div>
          </div>


          <div className="rounded-2xl bg-[#f7f6f1] p-3">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Win / Retain</p>
            <p className="mt-1 text-[13px] leading-5 text-slate-600">
              Say there are <b>{s.totalPoints ?? 15} total points</b> in play. The first team to{" "}
              <b>{s.winningNumber ?? 8}</b> wins the cup outright. If it ends level on{" "}
              <b>{s.retainNumber ?? 7.5}</b>, last year&apos;s champion keeps it. Rule of thumb: win = just
              over half, retain = exactly half.
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div>
                <label className={labelClass}>Total</label>
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={s.totalPoints ?? ""}
                  disabled={!canManage}
                  onChange={(e) => set("totalPoints", e.target.value === "" ? null : Number(e.target.value))}
                  onBlur={() => save({ totalPoints: s.totalPoints })}
                />
              </div>
              <div>
                <label className={labelClass}>Win</label>
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={s.winningNumber ?? ""}
                  disabled={!canManage}
                  onChange={(e) => set("winningNumber", e.target.value === "" ? null : Number(e.target.value))}
                  onBlur={() => save({ winningNumber: s.winningNumber })}
                />
              </div>
              <div>
                <label className={labelClass}>Retain</label>
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={s.retainNumber ?? ""}
                  disabled={!canManage}
                  onChange={(e) => set("retainNumber", e.target.value === "" ? null : Number(e.target.value))}
                  onBlur={() => save({ retainNumber: s.retainNumber })}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}


      {tab === "courses" ? <CourseHolesTab tripId={tripId} joinCode={joinCode} /> : null}

      {tab === "rounds" ? <RoundsTab tripId={tripId} joinCode={joinCode} /> : null}

      {tab === "teams" ? <TeamsPanel tripId={tripId} /> : null}

      {tab === "pro" ? (
        <div className="space-y-4">
          {/* 1. status */}
          {s.isPro ? (
            <div className="rounded-2xl border-2 border-accent bg-accent/10 p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-black uppercase text-ink">Pro</span>
                <p className="font-black text-ink">This tournament is Pro</p>
              </div>
              <p className="mt-1 text-[13px] leading-5 text-slate-600">
                Hole-by-hole scoring, the Clubhouse, matchup draws and Trip Wrapped are unlocked.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-sand-200 p-4">
              <p className="font-black text-ink">Free tournament</p>
              <p className="mt-1 text-[13px] leading-5 text-slate-500">
                Upgrade to unlock live hole-by-hole scoring, the Clubhouse, matchup draws and Trip Wrapped.
              </p>
              <button
                type="button"
                onClick={() => onUpsell("hole_by_hole")}
                className="mt-3 w-full rounded-2xl bg-accent px-4 py-3 font-black text-ink"
              >
                See what Pro unlocks
              </button>
            </div>
          )}

          {/* 2. scoring mode */}
          <div>
            <p className="mb-1.5 text-xs font-black uppercase tracking-wide text-slate-500">How scores are entered</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => requestMode("basic_918")}
                className={`w-full rounded-2xl border-2 p-3 text-left ${
                  s.scoringMode === "basic_918" ? "border-fairway-900 bg-fairway-900/5" : "border-sand-200"
                }`}
              >
                <p className="font-black text-ink">Enter at 9 &amp; 18</p>
                <p className="text-[13px] text-slate-500">
                  One score at the turn, one at the end. Net handicap off rating and slope.
                </p>
              </button>
              <button
                type="button"
                onClick={() => requestMode("hole_by_hole")}
                className={`w-full rounded-2xl border-2 p-3 text-left ${
                  s.scoringMode === "hole_by_hole" ? "border-accent bg-accent/10" : "border-sand-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <p className="font-black text-ink">Hole by hole</p>
                  <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-black uppercase text-accent-dark">
                    Pro
                  </span>
                </div>
                <p className="text-[13px] text-slate-500">
                  Live leaderboard, strokes on the right holes, callouts and a richer Trip Wrapped.
                </p>
              </button>
            </div>
            {s.scoringMode === "hole_by_hole" ? (
              <p className="mt-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[12px] leading-5 text-amber-900">
                Needs each course&apos;s par and course handicap numbers, set on the Courses tab.
              </p>
            ) : null}
          </div>

          {/* 3. features */}
          <div>
            <p className="mb-1.5 text-xs font-black uppercase tracking-wide text-slate-500">
              What Pro includes
            </p>
            <div className="mb-2 rounded-2xl border border-sand-200 bg-[#f7f6f1] p-3">
              {[
                ["Hole-by-hole live scoring", "Every score as it happens, with a live leaderboard the whole group watches."],
                ["Real stroke play", "Strokes given on the right holes off each course's handicap index, with per-round allowances."],
                ["Matchup draws", "Slot machine, hat draw, spinning wheel, captain's draft and handicap auto-balance."],
                ["Callouts", "Birdies, eagles, snowmen and blow-ups posted to the Clubhouse as they happen."],
                ["The Clubhouse", "Photos and group chat that live with the tournament."],
                ["Post-round awards", "Vote for MVP, three-putt king and the rest after every round."],
                ["Trip Wrapped", "A shareable recap card of the whole trip."],
                ["Push notifications", "Tee times, matchups and live drama, each player choosing what they get."],
              ].map(([t, d]) => (
                <div key={t} className="mt-2 flex items-start gap-2 first:mt-0">
                  <span className="mt-0.5 text-accent-dark">✓</span>
                  <span className="flex-1">
                    <span className="block text-[13px] font-black text-ink">{t}</span>
                    <span className="block text-[12px] leading-5 text-slate-500">{d}</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="mb-1.5 text-xs font-black uppercase tracking-wide text-slate-500">Settings</p>
            <div className="rounded-2xl border border-sand-200 p-3">
              <div className="flex items-start gap-3">
                <span className="flex-1">
                  <span className="block font-black text-ink">Post-round awards &amp; voting</span>
                  <span className="block text-[13px] leading-5 text-slate-500">
                    After each round players vote for MVP, three-putt king and the rest.
                  </span>
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    const supabase = getSupabaseClient();
                    if (!supabase) return;
                    const next = !voting;
                    setVoting(next);
                    await persistVoting(supabase, tripId, next);
                  }}
                  className={`h-8 w-14 shrink-0 rounded-full border-2 transition ${
                    voting ? "border-fairway-900 bg-fairway-900" : "border-sand-200 bg-white"
                  }`}
                  aria-label="Toggle voting"
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white transition ${voting ? "ml-7" : "ml-1"}`}
                    style={{ boxShadow: "0 1px 3px rgba(0,0,0,.25)" }}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* 4. coming soon */}
          <div>
            <p className="mb-1.5 text-xs font-black uppercase tracking-wide text-slate-500">Coming soon</p>
            <div className="rounded-2xl border border-sand-200 bg-[#f7f6f1] p-3">
              {[
                ["Clubhouse controls", "Turn photos or chat off for a tournament."],
                ["Round backgrounds", "Custom imagery behind each round."],
                ["Season series", "Carry results across years and keep a running cup."],
              ].map(([t, d]) => (
                <div key={t} className="mt-2 flex items-start gap-2 first:mt-0">
                  <span className="mt-0.5 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-black uppercase text-slate-400">
                    Soon
                  </span>
                  <span className="flex-1">
                    <span className="block text-[13px] font-black text-ink">{t}</span>
                    <span className="block text-[12px] leading-5 text-slate-500">{d}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------------- LOGISTICS ---------------- */}
      {tab === "basics" ? (
        <div className="space-y-3">
          <p className="text-[13px] leading-5 text-slate-600">
            Where everyone&apos;s staying and anything else the group needs. Players see this when they first
            open the tournament.
          </p>
          <div>
            <label className={labelClass}>Lodging Name</label>
            <input
              className={inputClass}
              value={s.lodgingName ?? ""}
              disabled={!canManage}
              placeholder="The Sea Pines Resort"
              onChange={(e) => set("lodgingName", e.target.value)}
              onBlur={() => save({ lodgingName: s.lodgingName })}
            />
          </div>
          <div>
            <label className={labelClass}>Address / Access</label>
            <input
              className={inputClass}
              value={s.lodgingAddress ?? ""}
              disabled={!canManage}
              placeholder="Address, door code, check-in time"
              onChange={(e) => set("lodgingAddress", e.target.value)}
              onBlur={() => save({ lodgingAddress: s.lodgingAddress })}
            />
          </div>
          <div>
            <label className={labelClass}>Trip Notes</label>
            <textarea
              className={`${inputClass} min-h-[120px]`}
              value={s.logisticsNotes ?? ""}
              disabled={!canManage}
              placeholder={"Flights, arrival and departure times, rides from the airport, dinner plans, anything else."}
              onChange={(e) => set("logisticsNotes", e.target.value)}
              onBlur={() => save({ logisticsNotes: s.logisticsNotes })}
            />
          </div>
        </div>
      ) : null}

      {tab === "basics" ? (
        <div className="mt-4 rounded-2xl border-2 border-red-200 bg-red-50/40 p-3">
          <p className="text-xs font-black uppercase tracking-wide text-red-700">Ending the tournament</p>
          {s.wrappedAt ? (
            <>
              <p className="mt-1 text-[13px] leading-5 text-slate-600">
                This tournament is finished and wrapped. Reopen it if you need to fix scores.
              </p>
              <button
                type="button"
                onClick={async () => {
                  const supabase = getSupabaseClient();
                  if (!supabase) return;
                  await setTournamentWrapped(supabase, tripId, false);
                  set("wrappedAt", null);
                }}
                className="mt-2 w-full rounded-2xl border-2 border-red-500 px-4 py-2.5 font-black text-red-600"
              >
                Reopen tournament
              </button>
            </>
          ) : (
            <>
              <p className="mt-1 text-[13px] leading-5 text-slate-600">
                Locks scoring for everyone and generates Trip Wrapped. You can reopen it afterwards.
              </p>
              <button
                type="button"
                onClick={() => setEndConfirm(true)}
                className="mt-2 w-full rounded-2xl bg-red-600 px-4 py-3 font-black text-white"
              >
                End tournament
              </button>
            </>
          )}
        </div>
      ) : null}

      {endConfirm ? (
        <div className="fixed inset-0 z-[165] flex items-center justify-center bg-black/70 p-5">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5">
            <h3 className="font-anton text-2xl tracking-tight text-ink">End the tournament?</h3>
            <p className="mt-2 text-[14px] leading-6 text-slate-600">
              Scoring locks for every player and Trip Wrapped is generated. Nobody can enter or change a score
              until you reopen it.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setEndConfirm(false)}
                className="flex-1 rounded-2xl border-[1.5px] border-slate-300 px-4 py-3 font-black text-slate-600"
              >
                Not yet
              </button>
              <button
                type="button"
                onClick={async () => {
                  const supabase = getSupabaseClient();
                  if (!supabase) return;
                  await setTournamentWrapped(supabase, tripId, true);
                  set("wrappedAt", new Date().toISOString());
                  setEndConfirm(false);
                  // Wrap up loose voting, then tell everyone the recap is up.
                  void notifyEvent("voting_concluded_sweep", tripId);
                  try {
                    const members = await listActiveMembers(supabase, tripId);
                    void notify({
                      userIds: members
                        .map((m) => m.profile.id)
                        .filter((id) => id !== user?.id),
                      title: s?.name ?? "TourneyBirdie",
                      message: "That's a wrap - your Trip Wrapped recap is ready. Come see how it all shook out.",
                      category: "awards",
                      url: joinCode ? `/t/${joinCode}` : "/home",
                    });
                  } catch {
                    /* non-blocking */
                  }
                }}
                className="flex-1 rounded-2xl bg-red-600 px-4 py-3 font-black text-white"
              >
                Yes, end it
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm font-bold text-red-600">{error}</p> : null}
      {toast ? <p className="mt-3 text-sm font-bold text-emerald-700">{toast}</p> : null}
      {busy ? <p className="mt-3 text-sm font-bold text-slate-400">Saving…</p> : null}

      {/* scoring-mode confirmation */}
      {confirmMode ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 p-5">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5">
            <h3 className="font-anton text-2xl tracking-tight text-ink">
              {turningOff ? "Switch back to 9 & 18?" : "Turn on hole by hole?"}
            </h3>
            {hardWarning ? (
              <div className="mt-3 rounded-2xl border-2 border-red-300 bg-red-50 p-3 text-[13px] leading-5 text-red-800">
                <b>Careful - {progress.completed} round{progress.completed === 1 ? " has" : "s have"} already
                finished.</b> Those rounds were scored hole by hole. Switching now changes how scores and
                handicaps are read for the rest of the tournament, and per-hole stats and callouts stop. Only do
                this if the group has agreed.
              </div>
            ) : turningOff ? (
              <div className="mt-3 rounded-2xl border-2 border-red-300 bg-red-50 p-3 text-[13px] leading-5 text-red-800">
                <b>A round is live right now.</b> Switch and everyone mid-round loses the per-hole card they are
                using, the live leaderboard stops moving, strokes stop being given hole by hole, and the callouts
                go quiet. Holes already entered stay saved but will not count the same way. Do not do this
                unless the group has agreed on the tee.
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-[13px] leading-5 text-emerald-900">
                Players will enter a score on every hole. You&apos;ll need each course&apos;s par and stroke
                index before a round can start. This unlocks the live leaderboard, per-hole strokes, and callouts.
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmMode(null)}
                className="flex-1 rounded-2xl border-[1.5px] border-slate-300 px-4 py-3 font-black text-slate-600"
              >
                Go back
              </button>
              <button
                type="button"
                onClick={applyMode}
                className={`flex-1 rounded-2xl px-4 py-3 font-black text-white ${
                  hardWarning ? "bg-red-600" : "bg-fairway-900"
                }`}
              >
                {hardWarning ? "I understand, switch" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
