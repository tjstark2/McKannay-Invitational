"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { createTrip } from "@/lib/supabase/queries";
import { AuthShell } from "@/features/auth/AuthShell";

export default function CreatePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [location, setLocation] = useState("");
  const [dates, setDates] = useState("");
  const [teamAName, setTeamAName] = useState("Team A");
  const [teamBName, setTeamBName] = useState("Team B");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/signin");
  }, [user, loading, router]);

  const canSubmit =
    name.trim() &&
    joinCode.trim() &&
    adminCode.trim() &&
    teamAName.trim() &&
    teamBName.trim() &&
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
    const result = await createTrip(supabase, {
      name,
      joinCode: joinCode.trim().toUpperCase(),
      adminCode,
      location,
      dates,
      teamAName,
      teamBName,
      ownerId: user.id,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    router.push(`/t/${joinCode.trim().toUpperCase()}`);
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
        <h1 className="text-2xl font-black text-ink">Create a tournament</h1>
        <p className="mt-1 text-sm text-slate-500">
          The essentials to get started — you can add players, rounds, and
          courses afterward in Admin.
        </p>

        <div className="mt-6 space-y-4">
          <Field label="Tournament name">
            <input
              className={inp}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="3rd Annual McKannay Invitational"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Join code" hint="players type this">
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
            <Field label="Admin code" hint="for setup">
              <input
                className={inp}
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                placeholder="secret"
              />
            </Field>
          </div>

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

          {error ? (
            <p className="text-sm font-bold text-red-600">{error}</p>
          ) : null}

          <button
            onClick={submit}
            disabled={!canSubmit}
            className="w-full rounded-2xl bg-accent px-4 py-4 font-black text-ink disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create tournament"}
          </button>
          <button
            onClick={() => router.push("/home")}
            className="w-full rounded-2xl px-4 py-2 text-sm font-bold text-slate-500"
          >
            Cancel
          </button>
        </div>
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
