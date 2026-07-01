"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

export const US_STATES: { name: string; abbr: string }[] = [
  { name: "Alabama", abbr: "AL" },
  { name: "Alaska", abbr: "AK" },
  { name: "Arizona", abbr: "AZ" },
  { name: "Arkansas", abbr: "AR" },
  { name: "California", abbr: "CA" },
  { name: "Colorado", abbr: "CO" },
  { name: "Connecticut", abbr: "CT" },
  { name: "Delaware", abbr: "DE" },
  { name: "District of Columbia", abbr: "DC" },
  { name: "Florida", abbr: "FL" },
  { name: "Georgia", abbr: "GA" },
  { name: "Hawaii", abbr: "HI" },
  { name: "Idaho", abbr: "ID" },
  { name: "Illinois", abbr: "IL" },
  { name: "Indiana", abbr: "IN" },
  { name: "Iowa", abbr: "IA" },
  { name: "Kansas", abbr: "KS" },
  { name: "Kentucky", abbr: "KY" },
  { name: "Louisiana", abbr: "LA" },
  { name: "Maine", abbr: "ME" },
  { name: "Maryland", abbr: "MD" },
  { name: "Massachusetts", abbr: "MA" },
  { name: "Michigan", abbr: "MI" },
  { name: "Minnesota", abbr: "MN" },
  { name: "Mississippi", abbr: "MS" },
  { name: "Missouri", abbr: "MO" },
  { name: "Montana", abbr: "MT" },
  { name: "Nebraska", abbr: "NE" },
  { name: "Nevada", abbr: "NV" },
  { name: "New Hampshire", abbr: "NH" },
  { name: "New Jersey", abbr: "NJ" },
  { name: "New Mexico", abbr: "NM" },
  { name: "New York", abbr: "NY" },
  { name: "North Carolina", abbr: "NC" },
  { name: "North Dakota", abbr: "ND" },
  { name: "Ohio", abbr: "OH" },
  { name: "Oklahoma", abbr: "OK" },
  { name: "Oregon", abbr: "OR" },
  { name: "Pennsylvania", abbr: "PA" },
  { name: "Rhode Island", abbr: "RI" },
  { name: "South Carolina", abbr: "SC" },
  { name: "South Dakota", abbr: "SD" },
  { name: "Tennessee", abbr: "TN" },
  { name: "Texas", abbr: "TX" },
  { name: "Utah", abbr: "UT" },
  { name: "Vermont", abbr: "VT" },
  { name: "Virginia", abbr: "VA" },
  { name: "Washington", abbr: "WA" },
  { name: "West Virginia", abbr: "WV" },
  { name: "Wisconsin", abbr: "WI" },
  { name: "Wyoming", abbr: "WY" },
];

const inputClass =
  "w-full rounded-2xl border-[1.5px] border-sand-200 bg-white px-4 py-3.5 text-base outline-none focus:border-fairway-900";

/** Type to filter US states by name or abbreviation; stores/shows the abbr. */
export function StateSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (abbr: string) => void;
}) {
  const [text, setText] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setText(value || "");
  }, [value]);

  const q = text.trim().toLowerCase();
  const matches = q
    ? US_STATES.filter(
        (s) =>
          s.name.toLowerCase().startsWith(q) ||
          s.abbr.toLowerCase().startsWith(q) ||
          s.name.toLowerCase().includes(q)
      ).slice(0, 8)
    : US_STATES;

  return (
    <div className="relative">
      <input
        className={inputClass}
        value={text}
        placeholder="State"
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          setOpen(true);
          const exact = US_STATES.find(
            (s) =>
              s.abbr.toLowerCase() === v.trim().toLowerCase() ||
              s.name.toLowerCase() === v.trim().toLowerCase()
          );
          onChange(exact ? exact.abbr : "");
          if (exact) {
            setText(exact.abbr);
            setOpen(false);
          }
        }}
        onFocus={() => {
          setOpen(true);
          setTouched(false);
        }}
        onBlur={() => setTimeout(() => setTouched(true), 150)}
      />
      {open ? (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute z-40 mt-1 max-h-56 w-full overflow-auto rounded-2xl border border-sand-100 bg-white shadow-xl">
            {matches.length === 0 ? (
              <p className="px-4 py-2.5 text-sm text-slate-400">No match</p>
            ) : (
              matches.map((s) => (
                <button
                  key={s.abbr}
                  type="button"
                  onClick={() => {
                    onChange(s.abbr);
                    setText(s.abbr);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-sand-50"
                >
                  <span className="text-ink">{s.name}</span>
                  <span className="font-bold text-slate-400">{s.abbr}</span>
                </button>
              ))
            )}
          </div>
        </>
      ) : null}
      {touched && !value && text.trim() ? (
        <p className="mt-1 text-xs font-bold text-red-600">
          Pick a state from the list.
        </p>
      ) : null}
    </div>
  );
}

export type UsernameStatus =
  | "idle"
  | "invalid"
  | "checking"
  | "available"
  | "taken";

/** Live username availability check (debounced) against the DB function. */
export function useUsernameCheck(username: string): UsernameStatus {
  const [status, setStatus] = useState<UsernameStatus>("idle");

  useEffect(() => {
    const u = username.trim().toLowerCase();
    if (!u) {
      setStatus("idle");
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(u)) {
      setStatus("invalid");
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      setStatus("idle");
      return;
    }
    setStatus("checking");
    let active = true;
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc("username_available", {
        candidate: u,
      });
      if (!active) return;
      if (error) {
        setStatus("idle");
        return;
      }
      setStatus(data ? "available" : "taken");
    }, 350);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [username]);

  return status;
}

export function UsernameHint({ status }: { status: UsernameStatus }) {
  const map: Record<UsernameStatus, { text: string; cls: string } | null> = {
    idle: null,
    invalid: {
      text: "3-20 characters: letters, numbers, underscores",
      cls: "text-slate-400",
    },
    checking: { text: "Checking…", cls: "text-slate-400" },
    available: { text: "✓ Available", cls: "text-green font-bold" },
    taken: { text: "✗ Already taken", cls: "text-red-600 font-bold" },
  };
  const m = map[status];
  if (!m) return null;
  return <p className={`mt-1.5 text-xs ${m.cls}`}>{m.text}</p>;
}
