"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { createTrip } from "@/lib/supabase/queries";
import { AuthShell } from "@/features/auth/AuthShell";

type Preset = {
  id: string;
  title: string;
  blurb: string;
  teamsLabel: string;
  increment: number; // roster must be a multiple of this
  defaultRoster: number;
};

const PRESETS: Preset[] = [
  {
    id: "scramble_4",
    title: "Scramble · 4 v 4",
    blurb:
      "Groups of four play one ball. Each group turns in one score; lowest wins the matchup. Players come in multiples of 8.",
    teamsLabel: "Two sides",
    increment: 8,
    defaultRoster: 8,
  },
  {
    id: "scramble_2",
    title: "Scramble · 2 v 2",
    blurb:
      "Pairs play one ball. Each pair turns in one score; lowest wins the matchup. Players come in multiples of 4.",
    teamsLabel: "Two sides",
    increment: 4,
    defaultRoster: 4,
  },
  {
    id: "casual",
    title: "Casual",
    blurb:
      "Just track everyone's scores — no head-to-head format or points. Add any number of players.",
    teamsLabel: "Two sides",
    increment: 1,
    defaultRoster: 12,
  },
];

export default function CreatePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [presetId, setPresetId] = useState<string>("scramble_4");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [location, setLocation] = useState("");
  const [dates, setDates] = useState("");
  const [teamAName, setTeamAName] = useState("Team A");
  const [teamBName, setTeamBName] = useState("Team B");
  const [rosterSize, setRosterSize] = useState("8");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  const preset = useMemo(
    () => PRESETS.find((p) => p.id === presetId) ?? PRESETS[0],
    [presetId]
  );

  // When the format changes, snap the roster to a sensible default for it.
  function choosePreset(id: string) {
    setPresetId(id);
    const next = PRESETS.find((p) => p.id === id);
    if (next) setRosterSize(String(next.defaultRoster));
    setError(null);
  }

  const rosterNumber = Number(rosterSize);
  const rosterValid =
    Number.isFinite(rosterNumber) &&
    rosterNumber > 0 &&
    (preset.increment <= 1 || rosterNumber % preset.increment === 0);

  const canSubmit =
    name.trim() &&
    joinCode.trim() &&
    teamAName.trim() &&
    teamBName.trim() &&
    rosterValid &&
    !busy;

  async function submit() {
    if (!canSubmit || !user) return;
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Can't reach the server right now.");
      return;
    }
    setBusy(true);
    setError(null);
    const code = joinCode.trim().toUpperCase();
    const result = await createTrip(supabase, {
      name,
      joinCode: code,
      location,
      dates,
      teamAName,
      teamBName,
      rosterSize: rosterNumber || preset.defaultRoster,
      defaultFormat: preset.id,
      ownerId: user.id,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    router.push(`/t/${code}`);
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
        <h1 className="text-2xl font-black text-ink">Create a Tournament</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pick a format, name it, and you&apos;re set. You can add players,
          rounds, and courses afterward in Admin.
        </p>

        {/* Step 1 — format */}
        <div className="mt-6">
          <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
            1 · Choose a format
          </div>
          <div className="space-y-2">
            {PRESETS.map((p) => {
              const active = p.id === presetId;
              return (
                <button
                  key={p.id}
                  onClick={() => choosePreset(p.id)}
                  className={`w-full rounded-2xl border-[1.5px] p-4 text-left transition ${
                    active
                      ? "border-fairway-900 bg-fairway-900/5"
                      : "border-sand-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-ink">{p.title}</span>
                    <span
                      className={`grid h-5 w-5 place-items-center rounded-full border-2 ${
                        active
                          ? "border-fairway-900 bg-fairway-900"
                          : "border-sand-200"
                      }`}
                    >
                      {active ? (
                        <span className="h-2 w-2 rounded-full bg-white" />
                      ) : null}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{p.blurb}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2 — essentials */}
        <div className="mt-6">
          <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
            2 · The essentials
          </div>
          <div className="space-y-4">
            <Field label="Tournament name">
              <input
                className={inp}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="3rd Annual McKannay Invitational"
              />
            </Field>

            <Field label="Join code" hint="players type this to join">
              <input
                className={inp}
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(
                    e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
                  );
                  setError(null);
                }}
                placeholder="MCK2027"
                autoCapitalize="characters"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Location" hint="optional">
                <input
                  className={inp}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Hilton Head, SC"
                />
              </Field>
              <Field label="Dates" hint="optional">
                <input
                  className={inp}
                  value={dates}
                  onChange={(e) => setDates(e.target.value)}
                  placeholder="Sept 10–13"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Team A name">
                <input
                  className={inp}
                  value={teamAName}
                  onChange={(e) => setTeamAName(e.target.value)}
                />
              </Field>
              <Field label="Team B name">
                <input
                  className={inp}
                  value={teamBName}
                  onChange={(e) => setTeamBName(e.target.value)}
                />
              </Field>
            </div>

            <Field
              label="Number of players"
              hint={
                preset.increment > 1
                  ? `multiples of ${preset.increment}`
                  : "spots on the roster"
              }
            >
              <input
                className={inp}
                inputMode="numeric"
                value={rosterSize}
                onChange={(e) =>
                  setRosterSize(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))
                }
                placeholder={String(preset.defaultRoster)}
              />
              {!rosterValid && rosterSize !== "" ? (
                <p className="mt-1.5 text-sm font-semibold text-amber-700">
                  {preset.title} needs players in multiples of {preset.increment}{" "}
                  (e.g. {preset.increment}, {preset.increment * 2},{" "}
                  {preset.increment * 3}).
                </p>
              ) : null}
            </Field>
          </div>
        </div>

        {error ? (
          <p className="mt-4 text-sm font-bold text-red-600">{error}</p>
        ) : null}

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="mt-6 w-full rounded-2xl bg-accent px-4 py-4 font-black text-ink disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create Tournament"}
        </button>
        <button
          onClick={() => router.push("/home")}
          className="mt-2 w-full rounded-2xl px-4 py-2 text-sm font-bold text-slate-500"
        >
          Cancel
        </button>
      </div>
    </AuthShell>
  );
}

const inp =
  "w-full rounded-2xl border-[1.5px] border-sand-200 bg-white px-4 py-3.5 text-base outline-none focus:border-fairway-900";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
          {label}
        </label>
        {hint ? <span className="text-[11px] text-slate-400">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}
