"use client";

import { useState } from "react";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { BrandLockup } from "@/features/trip/components/Brand";

/* Brand-only login. The Access Code IS the trip's join code - entering a valid
   code loads that tournament. No trip name is shown here on purpose, so the same
   screen works when one code routes to different trips. */
export function EntryGate({ children }: { children: React.ReactNode }) {
  const { activeJoinCode } = useTripState();
  if (activeJoinCode) return <>{children}</>;
  return <EntryLogin />;
}

function EntryLogin() {
  const { enterCode } = useTripState();
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [wrong, setWrong] = useState(false);

  async function submit() {
    if (checking) return;
    const code = value.trim();
    if (!code) return;
    setChecking(true);
    setWrong(false);
    let ok = false;
    try {
      ok = await enterCode(code);
    } catch {
      ok = false;
    }
    setChecking(false);
    if (!ok) setWrong(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-sand-50 px-6">
      <div className="w-full max-w-sm">
        <BrandLockup />

        <div className="mt-8">
          <label className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
            Access Code
          </label>
          <input
            type="text"
            autoFocus
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setWrong(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            placeholder="Enter your code"
            className="mt-2 w-full rounded-2xl border-[1.5px] border-sand-200 bg-white px-4 py-3.5 text-base outline-none focus:border-fairway-900"
          />

          {wrong ? (
            <p className="mt-2 text-sm font-bold text-red-600">
              That code didn&apos;t match a tournament. Check it and try again.
            </p>
          ) : null}

          <button
            onClick={submit}
            disabled={checking}
            className="mt-3 w-full rounded-2xl bg-fairway-900 px-4 py-4 font-black text-white disabled:opacity-60"
          >
            {checking ? "Checking…" : "Enter"}
          </button>
        </div>
      </div>
    </div>
  );
}
