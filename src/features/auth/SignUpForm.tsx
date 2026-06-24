"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import {
  StateSelect,
  useUsernameCheck,
  UsernameHint,
} from "@/features/account/identity";

export function SignUpForm() {
  const { signUp } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [city, setCity] = useState("");
  const [stateAbbr, setStateAbbr] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const usernameStatus = useUsernameCheck(username);

  const canSubmit =
    firstName.trim() &&
    lastName.trim() &&
    usernameStatus === "available" &&
    city.trim() &&
    stateAbbr.trim() &&
    email.trim() &&
    phone.trim() &&
    password.length >= 8 &&
    !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const result = await signUp({
      firstName,
      lastName,
      username,
      city,
      state: stateAbbr,
      email,
      phone,
      password,
      marketingOptIn,
      smsOptIn,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong. Please try again.");
      return;
    }
    if (result.needsConfirmation) {
      setSentTo(email.trim());
    } else {
      window.location.href = "/home";
    }
  }

  if (sentTo) {
    return (
      <div className="text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/20 text-2xl">
          📧
        </span>
        <h1 className="text-2xl font-black text-fairway-900">Check Your Email</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          We sent a confirmation link to <b>{sentTo}</b>. Click it to verify your
          account, then come back and sign in.
        </p>
        <a
          href="/signin"
          className="mt-6 inline-block w-full rounded-2xl bg-fairway-900 px-4 py-3.5 font-black text-white"
        >
          Go to sign in
        </a>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-fairway-900">Create Your Account</h1>
      <p className="mt-1 text-sm text-slate-500">
        Join TourneyBirdie to run and play in tournaments.
      </p>

      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <input
              className={inputClass}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Alex"
              autoComplete="given-name"
            />
          </Field>
          <Field label="Last name">
            <input
              className={inputClass}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Carter"
              autoComplete="family-name"
            />
          </Field>
        </div>
        <Field label="Username" hint="how friends find you">
          <input
            className={inputClass}
            value={username}
            onChange={(e) =>
              setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())
            }
            placeholder="tjstark2"
            autoCapitalize="none"
            autoComplete="off"
          />
          <UsernameHint status={usernameStatus} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City">
            <input
              className={inputClass}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="San Diego"
            />
          </Field>
          <Field label="State">
            <StateSelect value={stateAbbr} onChange={setStateAbbr} />
          </Field>
        </div>
        <Field label="Email">
          <input
            className={inputClass}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </Field>
        <Field label="Phone">
          <input
            className={inputClass}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            autoComplete="tel"
          />
        </Field>
        <Field label="Password" hint="At least 8 characters">
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
        </Field>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-sand-50 p-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-fairway-900"
            checked={marketingOptIn}
            onChange={(e) => setMarketingOptIn(e.target.checked)}
          />
          <span className="text-sm text-slate-600">
            Email me product updates and tournament news.
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-sand-50 p-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-fairway-900"
            checked={smsOptIn}
            onChange={(e) => setSmsOptIn(e.target.checked)}
          />
          <span className="text-sm text-slate-600">
            Text me tournament alerts (tee times, results). Message &amp; data
            rates may apply.
          </span>
        </label>

        {error ? (
          <p className="text-sm font-bold text-red-600">{error}</p>
        ) : null}

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="w-full rounded-2xl bg-fairway-900 px-4 py-4 font-black text-white disabled:opacity-50"
        >
          {busy ? "Creating account…" : "Create account"}
        </button>

        <p className="text-center text-xs leading-5 text-slate-400">
          By creating an account you agree to our Terms of Service and Privacy
          Policy.
        </p>
        <p className="text-center text-sm text-slate-500">
          Already have an account?{" "}
          <a href="/signin" className="font-black text-fairway-900">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}

const inputClass =
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
        {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}
