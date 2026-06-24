"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { BrandHeaderMark } from "@/features/trip/components/Brand";
import { AccountMenu } from "@/features/account/AccountMenu";
import {
  resolveTrip,
  listJoinRequests,
  listActiveMembers,
  approveMember,
  removeMember,
  memberName,
  type TripRef,
  type MemberRow,
} from "@/lib/supabase/memberships";
import { handleAndLocation } from "@/lib/supabase/friends";

export default function ManagePage() {
  const params = useParams();
  const code = String(params.code ?? "");
  const { user, loading } = useAuth();
  const router = useRouter();

  const [trip, setTrip] = useState<TripRef | null>(null);
  const [requests, setRequests] = useState<MemberRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const refresh = useCallback(
    async (t: TripRef) => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      setRequests(await listJoinRequests(supabase, t.id));
      setMembers(await listActiveMembers(supabase, t.id));
    },
    []
  );

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/signin?next=/manage/${encodeURIComponent(code)}`);
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let active = true;
    (async () => {
      const t = await resolveTrip(supabase, code);
      if (!active) return;
      if (!t) {
        setReady(true);
        setTrip(null);
        return;
      }
      if (t.ownerId !== user.id) {
        setAuthorized(false);
        setReady(true);
        return;
      }
      setTrip(t);
      await refresh(t);
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [user, loading, code, router, refresh]);

  if (loading || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f1]">
        <p className="text-3xl">⛳</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <Shell>
        <h1 className="text-2xl font-black text-ink">Not your tournament</h1>
        <p className="mt-2 text-slate-500">
          Only the organizer can manage members for this tournament.
        </p>
        <button
          onClick={() => router.push("/home")}
          className="mt-6 rounded-2xl bg-fairway-900 px-5 py-3 font-black text-white"
        >
          Back to My Tournaments
        </button>
      </Shell>
    );
  }

  if (!trip) {
    return (
      <Shell>
        <h1 className="text-2xl font-black text-ink">Tournament not found</h1>
        <button
          onClick={() => router.push("/home")}
          className="mt-6 rounded-2xl bg-fairway-900 px-5 py-3 font-black text-white"
        >
          Back to My Tournaments
        </button>
      </Shell>
    );
  }

  async function decide(membershipId: string, approve: boolean) {
    const supabase = getSupabaseClient();
    if (!supabase || !trip) return;
    if (approve) await approveMember(supabase, membershipId);
    else await removeMember(supabase, membershipId);
    await refresh(trip);
  }

  async function kick(membershipId: string) {
    const supabase = getSupabaseClient();
    if (!supabase || !trip) return;
    await removeMember(supabase, membershipId);
    await refresh(trip);
  }

  return (
    <Shell>
      <p className="text-xs font-extrabold uppercase tracking-wide text-accent-dark">
        Manage tournament
      </p>
      <h1 className="mt-1 text-3xl font-black text-ink">{trip.name}</h1>
      <p className="mt-1 text-slate-500">
        Share code <b className="text-fairway-900">{trip.joinCode}</b> · approve
        who gets in.
      </p>

      {/* requests */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-xl font-black text-fairway-900">
          Join requests
          {requests.length > 0 ? (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-black text-ink">
              {requests.length}
            </span>
          ) : null}
        </h2>
        {requests.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">No pending requests.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {requests.map((r) => (
              <Row key={r.membershipId} r={r}>
                <div className="flex gap-2">
                  <button
                    onClick={() => decide(r.membershipId, true)}
                    className="inline-flex items-center gap-1 rounded-full bg-fairway-900 px-3 py-2 text-sm font-extrabold text-white"
                  >
                    <Check className="h-4 w-4" /> Approve
                  </button>
                  <button
                    onClick={() => decide(r.membershipId, false)}
                    className="inline-flex items-center gap-1 rounded-full border border-sand-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </Row>
            ))}
          </div>
        )}
      </section>

      {/* members */}
      <section className="mt-9">
        <h2 className="text-xl font-black text-fairway-900">
          Members <span className="text-slate-400">({members.length})</span>
        </h2>
        <div className="mt-3 space-y-2">
          {members.map((m) => (
            <Row key={m.membershipId} r={m}>
              {m.role === "owner" ? (
                <span className="rounded-full bg-sand-50 px-3 py-1.5 text-xs font-black uppercase text-slate-500">
                  Owner
                </span>
              ) : confirmId === m.membershipId ? (
                <div className="flex items-center gap-2">
                  <span className="hidden text-xs font-bold text-slate-500 sm:block">
                    Remove?
                  </span>
                  <button
                    onClick={() => {
                      kick(m.membershipId);
                      setConfirmId(null);
                    }}
                    className="rounded-full bg-red-600 px-3 py-2 text-sm font-extrabold text-white"
                  >
                    Yes, remove
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="rounded-full border border-sand-200 bg-white px-3 py-2 text-sm font-bold text-slate-500"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmId(m.membershipId)}
                  className="rounded-full border border-sand-200 bg-white px-3 py-2 text-sm font-bold text-slate-400 hover:text-red-600"
                >
                  Remove
                </button>
              )}
            </Row>
          ))}
        </div>
      </section>

      <div className="mt-10 grid gap-2">
        <button
          onClick={() => router.push(`/t/${trip.joinCode}`)}
          className="w-full rounded-2xl bg-fairway-900 px-4 py-3.5 font-black text-white"
        >
          Open tournament
        </button>
        <button
          onClick={() => router.push("/home")}
          className="w-full rounded-2xl border border-sand-100 bg-white px-4 py-3.5 font-black text-fairway-900"
        >
          ← My Tournaments
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f6f1]">
      <header className="border-b border-sand-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <BrandHeaderMark />
          <AccountMenu />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8">{children}</main>
    </div>
  );
}

function Row({ r, children }: { r: MemberRow; children: React.ReactNode }) {
  const initial = (r.profile.username || r.profile.first_name || "?")
    .charAt(0)
    .toUpperCase();
  return (
    <div className="flex items-center justify-between rounded-2xl border border-sand-100 bg-white px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fairway-900 font-black text-white">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate font-black text-ink">{memberName(r.profile)}</p>
          <p className="truncate text-sm text-slate-500">
            {handleAndLocation(r.profile)}
          </p>
        </div>
      </div>
      <div className="shrink-0 pl-3">{children}</div>
    </div>
  );
}
