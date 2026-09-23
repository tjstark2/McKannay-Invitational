"use client";

// The series: the trophy, career records, and head to head across every year.
//
// This is what makes the next trip personal before a shot is hit - Wade leads
// Colum 3-1 across two years, and the trophy has a holder rather than
// appearing from nowhere at the end of a weekend.

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { loadSeriesOverview, type SeriesOverview } from "@/lib/supabase/series";
import { headToHead, tripResultLine } from "@/features/series/career";

export default function SeriesPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const router = useRouter();
  const { user, loading } = useAuth();
  const [data, setData] = useState<SeriesOverview | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/signin?next=/series/${encodeURIComponent(id)}`);
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) return setState("missing");
    let active = true;
    (async () => {
      const res = await loadSeriesOverview(supabase, id).catch(() => null);
      if (!active) return;
      setData(res);
      setState(res ? "ready" : "missing");
    })();
    return () => {
      active = false;
    };
  }, [id, user, loading, router]);

  // Everyone who has ever played, for the head-to-head pickers.
  const people = useMemo(() => {
    if (!data) return [];
    const byAccount = new Map<string, string>();
    for (const p of data.players) if (p.accountId) byAccount.set(p.accountId, p.name);
    return [...byAccount.entries()].map(([accountId, name]) => ({ accountId, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const h2h = useMemo(() => {
    if (!data || !left || !right || left === right) return null;
    return headToHead(left, right, { players: data.players, matches: data.matches });
  }, [data, left, right]);

  const champion = useMemo(() => {
    if (!data) return null;
    const done = data.trips.filter((t) => t.winner && t.completedAt);
    return done.sort((a, b) => b.sequence - a.sequence)[0] ?? null;
  }, [data]);

  if (state === "loading") {
    return <div className="flex min-h-screen items-center justify-center bg-[#f7f6f1] text-3xl">⛳</div>;
  }
  if (state === "missing" || !data) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="font-anton text-3xl text-fairway-900">Series not found</h1>
        <p className="mt-2 text-sm text-slate-600">It may have been removed, or you aren&apos;t in any of its tournaments.</p>
        <a href="/home" className="mt-6 inline-block rounded-2xl bg-fairway-900 px-4 py-3 font-black text-white">
          My tournaments
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <button onClick={() => router.push("/home")} className="text-sm font-bold text-slate-500">
        ← My tournaments
      </button>
      <h1 className="mt-2 font-anton text-3xl tracking-tight text-fairway-900">{data.series.name}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {data.trips.length} {data.trips.length === 1 ? "trip" : "trips"} · {data.careers.length} players
      </p>

      {champion ? (
        <div className="mt-5 rounded-2xl border-2 border-fairway-900 bg-white p-5 text-center">
          <p className="text-4xl">🏆</p>
          <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-500">Current holder</p>
          <p className="mt-1 font-anton text-2xl text-ink">
            {champion.teamNames[champion.winner ?? ""] ?? `Team ${champion.winner}`}
          </p>
          <p className="mt-1 text-[13px] font-bold text-slate-500">
            {champion.name} · {tripResultLine(champion, (c) => champion.teamNames[c] ?? `Team ${c}`)}
          </p>
        </div>
      ) : null}

      <h2 className="mt-8 font-anton text-xl text-fairway-900">All time</h2>
      <div className="mt-2 overflow-hidden rounded-2xl border border-sand-100 bg-white">
        <div className="grid grid-cols-[1fr_2.2rem_2.2rem_2.6rem_3rem] gap-x-2 border-b border-sand-100 px-4 py-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
          <span>Player</span>
          <span className="text-right">Trips</span>
          <span className="text-right">Won</span>
          <span className="text-right">Points</span>
          <span className="text-right">Best</span>
        </div>
        {data.careers.map((r) => (
          <div key={r.accountId} className="grid grid-cols-[1fr_2.2rem_2.2rem_2.6rem_3rem] items-center gap-x-2 border-b border-sand-50 px-4 py-2 last:border-0">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-[14px] font-black text-ink">{r.name}</span>
              {r.trophies > 0 ? <span title={`${r.trophies} won`}>🏆</span> : null}
            </span>
            <span className="text-right text-[13px] font-bold text-slate-500">{r.trips}</span>
            <span className="text-right text-[13px] font-bold text-slate-500">{r.won}</span>
            <span className="text-right text-[14px] font-black text-ink">{r.points}</span>
            <span className="text-right text-[13px] font-bold text-slate-500">{r.bestGross ?? "-"}</span>
          </div>
        ))}
        {data.careers.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">No finished trips yet.</p>
        ) : null}
      </div>
      <p className="mt-2 text-[12px] text-slate-400">
        Points are match points. A round scored on net across the whole field goes to the team rather
        than through a match, so it counts towards the trip result but not an individual total.
      </p>

      {people.length > 1 ? (
        <>
          <h2 className="mt-8 font-anton text-xl text-fairway-900">Head to head</h2>
          <div className="mt-2 rounded-2xl border border-sand-100 bg-white p-4">
            <div className="grid grid-cols-2 gap-3">
              <select value={left} onChange={(e) => setLeft(e.target.value)} aria-label="First player" className={pick}>
                <option value="">Pick a player</option>
                {people.map((p) => (
                  <option key={p.accountId} value={p.accountId}>{p.name}</option>
                ))}
              </select>
              <select value={right} onChange={(e) => setRight(e.target.value)} aria-label="Second player" className={pick}>
                <option value="">Pick a player</option>
                {people.map((p) => (
                  <option key={p.accountId} value={p.accountId}>{p.name}</option>
                ))}
              </select>
            </div>
            {h2h ? (
              <div className="mt-4 text-center">
                <p className="font-anton text-3xl text-ink">
                  {h2h.wins} - {h2h.losses}
                  {h2h.halved ? <span className="text-slate-400"> ({h2h.halved} halved)</span> : null}
                </p>
                <p className="mt-1 text-[13px] font-bold text-slate-500">
                  {people.find((p) => p.accountId === left)?.name} vs{" "}
                  {people.find((p) => p.accountId === right)?.name} · {h2h.meetings.length}{" "}
                  {h2h.meetings.length === 1 ? "meeting" : "meetings"}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-center text-[13px] text-slate-400">Pick two players to see their record.</p>
            )}
          </div>
        </>
      ) : null}

      <h2 className="mt-8 font-anton text-xl text-fairway-900">Every trip</h2>
      <div className="mt-2 space-y-2">
        {data.trips.map((t) => (
          <button
            key={t.id}
            onClick={() => t.joinCode && router.push(`/t/${t.joinCode}`)}
            className="flex w-full items-center gap-3 rounded-2xl border border-sand-100 bg-white p-4 text-left"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate font-black text-ink">{t.name}</span>
              <span className="block text-[13px] font-bold text-slate-500">
                {tripResultLine(t, (c) => t.teamNames[c] ?? `Team ${c}`)}
              </span>
            </span>
            <span className="text-slate-300" aria-hidden="true">›</span>
          </button>
        ))}
      </div>
    </main>
  );
}

const pick =
  "w-full rounded-xl border-[1.5px] border-sand-200 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-fairway-900";
