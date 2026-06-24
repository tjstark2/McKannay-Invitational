"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  loadMyTrips,
  joinTripByCode,
  type MyTripSummary,
} from "@/lib/supabase/queries";
import { BrandHeaderMark } from "@/features/trip/components/Brand";

export function AccountHome() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [trips, setTrips] = useState<MyTripSummary[] | null>(null);
  const [firstName, setFirstName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinErr, setJoinErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/signin");
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let active = true;
    (async () => {
      const prof = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .maybeSingle();
      if (active) setFirstName((prof.data?.first_name as string) ?? "");
      const my = await loadMyTrips(supabase, user.id);
      if (active) setTrips(my);
    })();
    return () => {
      active = false;
    };
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f1]">
        <p className="text-3xl">⛳</p>
      </div>
    );
  }

  async function join() {
    const code = joinCode.trim();
    if (!code || joinBusy) return;
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    setJoinBusy(true);
    setJoinErr(null);
    const ok = await joinTripByCode(supabase, code, user.id);
    setJoinBusy(false);
    if (!ok) {
      setJoinErr("No tournament found for that code.");
      return;
    }
    router.push(`/t/${code}`);
  }

  return (
    <div className="min-h-screen bg-[#f7f6f1]">
      <header className="border-b border-sand-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <BrandHeaderMark />
          <button
            onClick={async () => {
              await signOut();
              router.replace("/signin");
            }}
            className="text-sm font-bold text-slate-500 hover:text-fairway-900"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="text-3xl font-black text-ink">
          Welcome{firstName ? `, ${firstName}` : ""} 👋
        </h1>
        <p className="mt-1 text-slate-500">
          Your tournaments live here. Create one or jump back in.
        </p>

        {/* actions */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => router.push("/create")}
            className="flex items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-4 text-base font-black text-ink shadow-sm"
          >
            + Create a tournament
          </button>
          <div className="flex items-center gap-2 rounded-2xl border border-sand-100 bg-white px-3 py-2">
            <input
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value);
                setJoinErr(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") join();
              }}
              placeholder="Enter a code to join"
              className="min-w-0 flex-1 bg-transparent px-2 py-2 text-base outline-none"
            />
            <button
              onClick={join}
              disabled={joinBusy}
              className="shrink-0 rounded-xl bg-fairway-900 px-4 py-2.5 font-black text-white disabled:opacity-50"
            >
              {joinBusy ? "…" : "Join"}
            </button>
          </div>
        </div>
        {joinErr ? (
          <p className="mt-2 text-sm font-bold text-red-600">{joinErr}</p>
        ) : null}

        {/* my tournaments */}
        <div className="mt-9 flex items-center gap-2">
          <span className="h-[18px] w-2 rounded-[3px] bg-accent" />
          <h2 className="text-xl font-black text-fairway-900">My Tournaments</h2>
        </div>

        {trips === null ? (
          <p className="mt-4 text-slate-400">Loading…</p>
        ) : trips.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-sand-200 bg-white p-8 text-center">
            <p className="text-4xl">🏆</p>
            <p className="mt-3 font-black text-fairway-900">
              No tournaments yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Create your first tournament or join one with a code.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {trips.map((t) => (
              <button
                key={t.id}
                onClick={() => router.push(`/t/${t.joinCode}`)}
                className="rounded-2xl border border-sand-100 bg-white p-5 text-left shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-sand-50 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-slate-500">
                    {t.role}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {t.joinCode}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-black text-ink">{t.name}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {[t.location, t.dates].filter(Boolean).join(" · ") || "—"}
                </p>
                <p className="mt-3 text-sm font-black text-fairway-900">
                  Open ›
                </p>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
