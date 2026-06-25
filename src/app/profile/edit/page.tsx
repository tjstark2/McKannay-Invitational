"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { BrandHeaderMark } from "@/features/trip/components/Brand";
import { AccountMenu } from "@/features/account/AccountMenu";
import {
  StateSelect,
  useUsernameCheck,
  UsernameHint,
  type UsernameStatus,
} from "@/features/account/identity";

const inp =
  "mt-1.5 w-full rounded-2xl border-[1.5px] border-sand-200 bg-white px-4 py-3.5 text-base outline-none focus:border-fairway-900";
const lbl =
  "text-xs font-extrabold uppercase tracking-wide text-slate-500";

export default function EditProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [original, setOriginal] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [city, setCity] = useState("");
  const [stateAbbr, setStateAbbr] = useState("");
  const [phone, setPhone] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [sms, setSms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rawStatus = useUsernameCheck(username);
  const unchanged =
    username.trim().toLowerCase() === original.trim().toLowerCase();
  // Keeping your own current handle is always fine.
  const usernameStatus: UsernameStatus = unchanged ? "available" : rawStatus;

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
        .select("first_name,last_name,username,city,state,phone,marketing_opt_in,sms_opt_in")
        .eq("id", user.id)
        .maybeSingle();
      if (!active || !p.data) {
        if (active) setReady(true);
        return;
      }
      setFirstName((p.data.first_name as string) ?? "");
      setLastName((p.data.last_name as string) ?? "");
      setOriginal((p.data.username as string) ?? "");
      setUsername((p.data.username as string) ?? "");
      setCity((p.data.city as string) ?? "");
      setStateAbbr((p.data.state as string) ?? "");
      setPhone((p.data.phone as string) ?? "");
      setMarketing(Boolean(p.data.marketing_opt_in));
      setSms(Boolean(p.data.sms_opt_in));
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [user, loading, router]);

  const canSave =
    usernameStatus === "available" &&
    firstName.trim() &&
    lastName.trim() &&
    city.trim() &&
    stateAbbr.trim() &&
    !busy;

  async function save() {
    if (!canSave || !user) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: upErr } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        username: username.trim().toLowerCase(),
        city: city.trim(),
        state: stateAbbr.trim().toUpperCase(),
        phone: phone.trim() || null,
        marketing_opt_in: marketing,
        sms_opt_in: sms,
      })
      .eq("id", user.id);
    setBusy(false);
    if (upErr) {
      setError(
        upErr.message.toLowerCase().includes("duplicate")
          ? "That username was just taken — try another."
          : upErr.message
      );
      return;
    }
    router.replace("/profile");
  }

  if (loading || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f1]">
        <p className="text-3xl">⛳</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f6f1]">
      <header className="relative z-50 border-b border-sand-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <BrandHeaderMark />
          <AccountMenu />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="font-anton text-4xl tracking-tight text-ink">Edit Profile</h1>
        <p className="mt-1 text-slate-500">
          Update your handle, location, and notification preferences.
        </p>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>First name</label>
              <input
                className={inp}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="TJ"
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className={lbl}>Last name</label>
              <input
                className={inp}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Stark"
                autoComplete="family-name"
              />
            </div>
          </div>

          <div>
            <label className={lbl}>Username</label>
            <input
              className={inp}
              value={username}
              onChange={(e) =>
                setUsername(
                  e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()
                )
              }
              placeholder="tjstark2"
              autoCapitalize="none"
            />
            {unchanged ? (
              <p className="mt-1.5 text-xs text-slate-400">
                Your current handle. Friends and tournaments stay linked if you
                change it.
              </p>
            ) : (
              <UsernameHint status={usernameStatus} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>City</label>
              <input
                className={inp}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="San Diego"
              />
            </div>
            <div>
              <label className={lbl}>State</label>
              <div className="mt-1.5">
                <StateSelect value={stateAbbr} onChange={setStateAbbr} />
              </div>
            </div>
          </div>

          <div>
            <label className={lbl}>Phone</label>
            <input
              className={inp}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-white border border-sand-100 p-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-fairway-900"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
            />
            <span className="text-sm text-slate-600">
              Email me product updates and tournament news.
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-white border border-sand-100 p-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-fairway-900"
              checked={sms}
              onChange={(e) => setSms(e.target.checked)}
            />
            <span className="text-sm text-slate-600">
              Text me tournament alerts (tee times, results).
            </span>
          </label>

          {error ? (
            <p className="text-sm font-bold text-red-600">{error}</p>
          ) : null}

          <div className="grid gap-2 pt-1">
            <button
              onClick={save}
              disabled={!canSave}
              className="w-full rounded-2xl bg-fairway-900 px-4 py-4 font-black text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
            <button
              onClick={() => router.push("/profile")}
              className="w-full rounded-2xl px-4 py-2 text-sm font-bold text-slate-500"
            >
              Cancel
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
