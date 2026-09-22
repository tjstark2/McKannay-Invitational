"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";

/** Where to go after signing in - usually the tournament an invite pointed at. */
function nextPath(): string {
  try {
    const p = new URLSearchParams(window.location.search).get("next");
    if (p && p.startsWith("/")) return p;
  } catch {
    // ignore
  }
  return "";
}

export function SignInForm() {
  const { signIn, requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Password reset did not exist. Someone who forgot theirs on the first tee
  // had no way back in without the organizer going into the database.
  const [mode, setMode] = useState<"signin" | "forgot" | "sent">("signin");
  // Read after mount, not during render: the server can't see the URL, and a
  // mismatched link can keep the server's version - dropping the invite.
  const [next, setNext] = useState("");
  useEffect(() => setNext(nextPath()), []);

  async function sendReset() {
    if (!email.trim() || busy) return;
    setBusy(true);
    setError(null);
    const result = await requestPasswordReset(email);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Couldn't send the link. Check the email address.");
      return;
    }
    setMode("sent");
  }

  const canSubmit = email.trim() && password && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const result = await signIn(email, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Couldn't sign in. Check your details.");
      return;
    }
    window.location.href = nextPath() || "/home";
  }

  if (mode === "sent") {
    return (
      <div>
        <h1 className="font-anton text-3xl tracking-tight text-fairway-900">Check your email</h1>
        <p className="mt-2 text-sm text-slate-600">
          If there&apos;s an account for <b className="text-ink">{email.trim()}</b>, a link to set a new
          password is on its way. It can take a minute, and it may land in spam.
        </p>
        <button
          onClick={() => setMode("signin")}
          className="mt-6 w-full rounded-2xl border border-sand-200 bg-white px-4 py-3 text-sm font-black text-fairway-900"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  if (mode === "forgot") {
    return (
      <div>
        <h1 className="font-anton text-3xl tracking-tight text-fairway-900">Reset your password</h1>
        <p className="mt-1 text-sm text-slate-500">We&apos;ll email you a link to set a new one.</p>
        <div className="mt-6 space-y-4">
          <input
            className={inputClass}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            aria-label="Email"
            onKeyDown={(e) => e.key === "Enter" && sendReset()}
          />
          {error ? <p className="text-sm font-bold text-red-600">{error}</p> : null}
          <button
            onClick={sendReset}
            disabled={!email.trim() || busy}
            className="w-full rounded-2xl bg-fairway-900 px-4 py-4 font-black text-white disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send reset link"}
          </button>
          <button
            onClick={() => {
              setMode("signin");
              setError(null);
            }}
            className="w-full text-center text-sm font-bold text-slate-500"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-anton text-3xl tracking-tight text-fairway-900">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-500">Sign in to your account.</p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
            Email
          </label>
          <input
            className={inputClass}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
            Password
          </label>
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setMode("forgot");
            setError(null);
          }}
          className="-mt-1 text-sm font-bold text-fairway-900"
        >
          Forgot your password?
        </button>

        {error ? (
          <p className="text-sm font-bold text-red-600">{error}</p>
        ) : null}

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="w-full rounded-2xl bg-fairway-900 px-4 py-4 font-black text-white disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-center text-sm text-slate-500">
          New to TourneyBirdie?{" "}
          <a
            href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
            className="font-black text-fairway-900"
          >
            Create an account
          </a>
        </p>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-2xl border-[1.5px] border-sand-200 bg-white px-4 py-3.5 text-base outline-none focus:border-fairway-900";
