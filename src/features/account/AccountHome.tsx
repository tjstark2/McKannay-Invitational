"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  loadMyTrips,
  type MyTripSummary,
} from "@/lib/supabase/queries";
import {
  resolveTrip,
  requestToJoin,
  loadPendingTrips,
  pendingCountsForTrips,
  loadInvitations,
  approveMember,
  removeMember,
  type TripRef,
  type InvitationItem,
} from "@/lib/supabase/memberships";
import { BrandHeaderMark } from "@/features/trip/components/Brand";
import { AccountMenu } from "@/features/account/AccountMenu";

export function AccountHome() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [trips, setTrips] = useState<MyTripSummary[] | null>(null);
  const [pending, setPending] = useState<TripRef[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [requestCounts, setRequestCounts] = useState<Record<string, number>>({});
  const [firstName, setFirstName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinErr, setJoinErr] = useState<string | null>(null);
  const [joinMsg, setJoinMsg] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let active = true;
    (async () => {
      const prof = await supabase
        .from("profiles")
        .select("first_name,username")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      if (!prof.data?.username) {
        router.replace("/complete-profile");
        return;
      }
      setFirstName((prof.data?.first_name as string) ?? "");
      const my = await loadMyTrips(supabase, user.id);
      if (active) setTrips(my);
      const pend = await loadPendingTrips(supabase, user.id);
      if (active) setPending(pend);
      const ownedIds = my.filter((t) => t.role === "owner").map((t) => t.id);
      const counts = await pendingCountsForTrips(supabase, ownedIds);
      if (active) setRequestCounts(counts);
      const inv = await loadInvitations(supabase, user.id);
      if (active) setInvitations(inv);
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
    setJoinMsg(null);
    const trip = await resolveTrip(supabase, code);
    if (!trip) {
      setJoinBusy(false);
      setJoinErr("No tournament found for that code.");
      return;
    }
    if (trip.ownerId === user.id) {
      setJoinBusy(false);
      router.push(`/t/${trip.joinCode}`);
      return;
    }
    const res = await requestToJoin(supabase, trip.id, user.id);
    if (res.status === "active") {
      setJoinBusy(false);
      router.push(`/t/${trip.joinCode}`);
      return;
    }
    const pend = await loadPendingTrips(supabase, user.id);
    setPending(pend);
    setJoinBusy(false);
    setJoinCode("");
    setJoinMsg(`Request sent to ${trip.name} — waiting for approval.`);
  }

  async function respondInvite(membershipId: string, accept: boolean) {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    if (accept) await approveMember(supabase, membershipId);
    else await removeMember(supabase, membershipId);
    setTrips(await loadMyTrips(supabase, user.id));
    setInvitations(await loadInvitations(supabase, user.id));
  }

  return (
    <div className="min-h-screen bg-[#f7f6f1]">
      <header className="relative z-50 border-b border-sand-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <BrandHeaderMark />
          <AccountMenu />
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
            + Create a Tournament
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
              placeholder="Enter a code to request"
              className="min-w-0 flex-1 bg-transparent px-2 py-2 text-base outline-none"
            />
            <button
              onClick={join}
              disabled={joinBusy}
              className="shrink-0 rounded-xl bg-fairway-900 px-4 py-2.5 font-black text-white disabled:opacity-50"
            >
              {joinBusy ? "…" : "Request"}
            </button>
          </div>
        </div>
        {joinErr ? (
          <p className="mt-2 text-sm font-bold text-red-600">{joinErr}</p>
        ) : null}
        {joinMsg ? (
          <p className="mt-2 text-sm font-bold text-green">{joinMsg}</p>
        ) : null}

        {/* invitations */}
        {invitations.length > 0 ? (
          <div className="mt-8 rounded-2xl border border-accent/40 bg-accent/10 p-4">
            <h2 className="flex items-center gap-2 text-lg font-black text-ink">
              ✉️ Invitations
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-black text-ink">
                {invitations.length}
              </span>
            </h2>
            <div className="mt-3 space-y-2">
              {invitations.map((iv) => (
                <div
                  key={iv.membershipId}
                  className="flex items-center justify-between rounded-xl bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-black text-ink">{iv.trip.name}</p>
                    <p className="truncate text-sm text-slate-500">
                      You&apos;ve been invited to join
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2 pl-3">
                    <button
                      onClick={() => respondInvite(iv.membershipId, true)}
                      className="rounded-full bg-fairway-900 px-3.5 py-2 text-sm font-extrabold text-white"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => respondInvite(iv.membershipId, false)}
                      className="rounded-full border border-sand-200 bg-white px-3 py-2 text-sm font-bold text-slate-500"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
              <div
                key={t.id}
                className="rounded-2xl border border-sand-100 bg-white p-5 shadow-sm"
              >
                <button
                  onClick={() => router.push(`/t/${t.joinCode}`)}
                  className="block w-full text-left"
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
                {t.role === "owner" ? (
                  <button
                    onClick={() => router.push(`/manage/${t.joinCode}`)}
                    className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-extrabold ${
                      requestCounts[t.id]
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-sand-100 bg-sand-50 text-fairway-900"
                    }`}
                  >
                    Manage members
                    {requestCounts[t.id] ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-black text-white">
                        {requestCounts[t.id]}
                      </span>
                    ) : (
                      <span>›</span>
                    )}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {/* pending requests */}
        {pending.length > 0 ? (
          <>
            <div className="mt-9 flex items-center gap-2">
              <span className="h-[18px] w-2 rounded-[3px] bg-slate-300" />
              <h2 className="text-xl font-black text-slate-500">
                Awaiting Approval
              </h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {pending.map((t) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-dashed border-sand-200 bg-white p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-amber-700">
                      Pending
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {t.joinCode}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-black text-ink">{t.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Waiting for the organizer to approve you.
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
