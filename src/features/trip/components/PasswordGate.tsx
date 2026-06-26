"use client";

import { useEffect, useState } from "react";
import { BrandLockup } from "@/features/trip/components/Brand";

export function PasswordGate({
  password,
  storageKey,
  label = "Access Code",
  heading,
  subtitle,
  brand = false,
  children,
}: {
  password: string;
  storageKey: string;
  label?: string;
  heading?: string;
  subtitle?: string;
  brand?: boolean;
  children: React.ReactNode;
}) {
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(storageKey) === "true") {
        setUnlocked(true);
      }
    } catch {
      // sessionStorage unavailable - just show the prompt.
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-sand-50 px-6">
      <div className="w-full max-w-sm">
        {brand ? (
          <BrandLockup />
        ) : (
          <div className="text-center">
            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg">
              <img
                src="/logo-icon.png"
                alt="TourneyBirdie"
                className="h-[82%] w-[82%] object-contain"
              />
            </span>
            {heading ? (
              <h1 className="text-2xl font-black text-fairway-900">{heading}</h1>
            ) : null}
            {subtitle ? (
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            ) : null}
          </div>
        )}

        <div className="mt-8">
          <label className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
            {label}
          </label>
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
            placeholder="••••"
            className="mt-2 w-full rounded-2xl border-[1.5px] border-sand-200 bg-white px-4 py-3.5 text-base outline-none focus:border-fairway-900"
          />

          {wrong ? (
            <p className="mt-2 text-sm font-bold text-red-600">
              Incorrect code. Try again.
            </p>
          ) : null}

          <button
            onClick={submit}
            className="mt-3 w-full rounded-2xl bg-fairway-900 px-4 py-4 font-black text-white"
          >
            Enter
          </button>
        </div>
      </div>
    </div>
  );
}
