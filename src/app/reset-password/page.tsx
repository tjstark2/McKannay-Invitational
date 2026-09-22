"use client";

// Where the password reset email lands.
//
// The link can arrive three ways depending on how the email is set up: a
// one-time code (the default), a token hash (the cross-device version), or
// tokens in the address. All three are handled, and if the link has expired or
// was opened on a different device, it says so plainly instead of failing
// silently.

import { useEffect, useState } from "react";
import { AuthShell } from "@/features/auth/AuthShell";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";

type Stage = "checking" | "ready" | "invalid" | "done";

export default function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const [stage, setStage] = useState<Stage>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setStage("invalid");
      return;
    }
    let settled = false;
    const ok = () => {
      if (!settled) {
        settled = true;
        setStage("ready");
      }
    };

    // Tokens in the address are picked up by the client automatically; this
    // catches the moment it does.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") ok();
    });

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const tokenHash = params.get("token_hash");
      try {
        if (tokenHash) {
          const { error: e } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
          if (e) throw e;
          ok();
          return;
        }
        if (code) {
          const { error: e } = await supabase.auth.exchangeCodeForSession(code);
          if (e) throw e;
          ok();
          return;
        }
        const { data } = await supabase.auth.getSession();
        if (data.session) ok();
        else window.setTimeout(() => !settled && setStage("invalid"), 2500);
      } catch {
        settled = true;
        setStage("invalid");
      }
    })();

    return () => sub.subscription.unsubscribe();
  }, []);

  async function save() {
    if (busy) return;
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("Those passwords don't match.");
    setBusy(true);
    setError(null);
    const result = await updatePassword(password);
    setBusy(false);
    if (!result.ok) return setError(result.error ?? "Couldn't save your new password. Try again.");
    setStage("done");
    window.setTimeout(() => (window.location.href = "/home"), 1200);
  }

  return (
    <AuthShell>
      {stage === "checking" ? (
        <p className="text-sm text-slate-500">Checking your link…</p>
      ) : stage === "invalid" ? (
        <div>
          <h1 className="font-anton text-3xl tracking-tight text-fairway-900">This link didn&apos;t work</h1>
          <p className="mt-2 text-sm text-slate-600">
            Reset links expire after an hour, and they only work in the same browser you asked for them
            in. Request a new one from the sign-in screen and open it on the same device.
          </p>
          <a
            href="/signin"
            className="mt-6 inline-block w-full rounded-2xl bg-fairway-900 px-4 py-3.5 text-center font-black text-white"
          >
            Back to sign in
          </a>
        </div>
      ) : stage === "done" ? (
        <div>
          <h1 className="font-anton text-3xl tracking-tight text-fairway-900">Password updated</h1>
          <p className="mt-2 text-sm text-slate-600">Taking you in…</p>
        </div>
      ) : (
        <div>
          <h1 className="font-anton text-3xl tracking-tight text-fairway-900">Set a new password</h1>
          <p className="mt-1 text-sm text-slate-500">At least 8 characters.</p>
          <div className="mt-6 space-y-4">
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              autoComplete="new-password"
              aria-label="New password"
            />
            <input
              className={inputClass}
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Type it again"
              autoComplete="new-password"
              aria-label="Confirm new password"
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
            {error ? <p className="text-sm font-bold text-red-600">{error}</p> : null}
            <button
              onClick={save}
              disabled={busy || !password || !confirm}
              className="w-full rounded-2xl bg-fairway-900 px-4 py-4 font-black text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save new password"}
            </button>
          </div>
        </div>
      )}
    </AuthShell>
  );
}

const inputClass =
  "w-full rounded-2xl border-[1.5px] border-sand-200 bg-white px-4 py-3.5 text-base outline-none focus:border-fairway-900";
