"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { AuthShell } from "@/features/auth/AuthShell";
import {
  StateSelect,
  useUsernameCheck,
  UsernameHint,
} from "@/features/account/identity";

export default function CompleteProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState("");
  const [city, setCity] = useState("");
  const [stateAbbr, setStateAbbr] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usernameStatus = useUsernameCheck(username);

  // If not signed in -> landing. If already has a username -> straight to home.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let active = true;
    (async () => {
      const p = await supabase
        .from("profiles")
        .select("username,city,state")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      if (p.data?.username) {
        router.replace("/home");
        return;
      }
      if (p.data?.city) setCity(p.data.city as string);
      if (p.data?.state) setStateAbbr(p.data.state as string);
      setChecking(false);
    })();
    return () => {
      active = false;
    };
  }, [user, loading, router]);

  const canSubmit =
    usernameStatus === "available" && city.trim() && stateAbbr.trim() && !busy;

  async function save() {
    if (!canSubmit || !user) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: upErr } = await supabase
      .from("profiles")
      .update({
        username: username.trim().toLowerCase(),
        city: city.trim(),
        state: stateAbbr.trim().toUpperCase(),
      })
      .eq("id", user.id);
    setBusy(false);
    if (upErr) {
      setError(
        upErr.message.includes("duplicate")
          ? "That username was just taken — try another."
          : upErr.message
      );
      return;
    }
    router.replace("/home");
  }

  if (loading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f1]">
        <p className="text-3xl">⛳</p>
      </div>
    );
  }

  return (
    <AuthShell>
      <div>
        <h1 className="text-2xl font-black text-ink">Finish your profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pick a username and add your location so friends can find you and
          you&apos;re easy to identify in tournaments.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
              Username
            </label>
            <input
              className="mt-1.5 w-full rounded-2xl border-[1.5px] border-sand-200 bg-white px-4 py-3.5 text-base outline-none focus:border-fairway-900"
              value={username}
              onChange={(e) =>
                setUsername(
                  e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()
                )
              }
              placeholder="tjstark2"
              autoCapitalize="none"
            />
            <UsernameHint status={usernameStatus} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                City
              </label>
              <input
                className="mt-1.5 w-full rounded-2xl border-[1.5px] border-sand-200 bg-white px-4 py-3.5 text-base outline-none focus:border-fairway-900"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="San Diego"
              />
            </div>
            <div>
              <label className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                State
              </label>
              <div className="mt-1.5">
                <StateSelect value={stateAbbr} onChange={setStateAbbr} />
              </div>
            </div>
          </div>

          {error ? (
            <p className="text-sm font-bold text-red-600">{error}</p>
          ) : null}

          <button
            onClick={save}
            disabled={!canSubmit}
            className="w-full rounded-2xl bg-fairway-900 px-4 py-4 font-black text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save and continue"}
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
