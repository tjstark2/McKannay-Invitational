"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";

export function SignInForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    let next = "/home";
    try {
      const p = new URLSearchParams(window.location.search).get("next");
      if (p && p.startsWith("/")) next = p;
    } catch {
      // ignore
    }
    window.location.href = next;
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
          <a href="/signup" className="font-black text-fairway-900">
            Create an account
          </a>
        </p>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-2xl border-[1.5px] border-sand-200 bg-white px-4 py-3.5 text-base outline-none focus:border-fairway-900";
