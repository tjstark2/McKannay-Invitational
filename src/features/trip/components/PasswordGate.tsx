"use client";

import { useEffect, useState } from "react";

export function PasswordGate({
  password,
  storageKey,
  title,
  subtitle,
  children,
}: {
  password: string;
  storageKey: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);

  // Check session unlock after mount (avoids any SSR/client mismatch).
  useEffect(() => {
    try {
      if (sessionStorage.getItem(storageKey) === "true") {
        setUnlocked(true);
      }
    } catch {
      // sessionStorage unavailable — just show the prompt.
    }
    setReady(true);
  }, [storageKey]);

  if (!ready) return null;
  if (unlocked) return <>{children}</>;

  function submit() {
    if (value === password) {
      try {
        sessionStorage.setItem(storageKey, "true");
      } catch {
        // ignore storage errors; unlock for this render anyway
      }
      setUnlocked(true);
    } else {
      setWrong(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-200 px-5">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-phone">
        <p className="text-3xl">⛳</p>
        <h1 className="mt-3 text-2xl font-black text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>

        <input
          type="password"
          autoFocus
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setWrong(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          placeholder="Password"
          className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-fairway-900"
        />

        {wrong ? (
          <p className="mt-2 text-sm font-bold text-red-600">
            Incorrect password. Try again.
          </p>
        ) : null}

        <button
          onClick={submit}
          className="mt-4 w-full rounded-xl bg-fairway-900 px-4 py-3 font-black text-white"
        >
          Enter
        </button>
      </div>
    </div>
  );
}