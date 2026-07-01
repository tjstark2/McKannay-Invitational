"use client";

import { useEffect, useState } from "react";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  loadMyTrips,
  type MyTripSummary,
  type TripStatus,
} from "@/lib/supabase/queries";
import {
  resolveTrip,
  requestToJoin,
  loadPendingTrips,
  pendingCountsForTrips,
  loadInvitations,
  respondInvitation,
  type TripRef,
  type InvitationItem,
} from "@/lib/supabase/memberships";
import { BrandHeaderMark } from "@/features/trip/components/Brand";
import { GuidedTour, buildHomeTourSteps } from "@/features/trip/GuidedTour";
import { AccountMenu } from "@/features/account/AccountMenu";
import { EmptyState } from "@/components/ui/EmptyState";

const STATUS_META: Record<TripStatus, { label: string; cls: string; dot: string }> = {
  in_progress: { label: "In Progress", cls: "bg-mint/15 text-fairway-900", dot: "bg-mint" },
  not_started: { label: "Not Started", cls: "bg-sand-50 text-slate-500", dot: "bg-slate-300" },
  finished: { label: "Finished", cls: "bg-[#f3b50a]/15 text-[#8a6a00]", dot: "bg-[#f3b50a]" },
};
// In Progress first, then upcoming, then done.
const STATUS_ORDER: Record<TripStatus, number> = {
  in_progress: 0,
  not_started: 1,
  finished: 2,
};

export function AccountHome() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [trips, setTrips] = useState<MyTripSummary[] | null>(null);
  const [homeTour, setHomeTour] = useState<{ name: string; code: string; id: string } | null>(null);

  // After creating a tournament we land here with a flag. Start the owner
  // walkthrough on this home screen, then hand off into the tournament's Admin.
  useEffect(() => {
    if (!trips) return;
    let code: string | null = null;
    try {
      code = sessionStorage.getItem("tb_tour_home");
    } catch {
      /* storage unavailable */
    }
    if (!code) return;
    const t = trips.find((x) => x.joinCode === code);
    if (!t) return;
    try {
      sessionStorage.removeItem("tb_tour_home");
    } catch {
      /* ignore */
    }
    setHomeTour({ name: t.name, code: t.joinCode, id: t.id });
  }, [trips]);
  const [pending, setPending] = useState<TripRef[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [requestCounts, setRequestCounts] = useState<Record<string, number>>({});
  const [firstName, setFirstName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinErr, setJoinErr] = useState<string | null>(null);
  const [joinMsg, setJoinMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | TripStatus>("all");

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
      const ownedIds = my
        .filter((t) => t.role === "owner" || t.role === "admin")
        .map((t) => t.id);
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
      <LoadingScreen />
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
    setJoinMsg(`Request sent to ${trip.name} - waiting for approval.`);
  }

  async function respondInvite(membershipId: string, accept: boolean) {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    await respondInvitation(supabase, membershipId, accept);
    setTrips(await loadMyTrips(supabase, user.id));
    setInvitations(await loadInvitations(supabase, user.id));
  }

  const allTrips = trips ?? [];
  const statusCounts = {
    all: allTrips.length,
    in_progress: allTrips.filter((t) => t.status === "in_progress").length,
    not_started: allTrips.filter((t) => t.status === "not_started").length,
    finished: allTrips.filter((t) => t.status === "finished").length,
  };
  const visibleTrips = allTrips
    .filter((t) => statusFilter === "all" || t.status === statusFilter)
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        a.name.localeCompare(b.name)
    );

  return (
    <div className="min-h-screen bg-[#f7f6f1]">
      {homeTour ? (
        <GuidedTour
          steps={buildHomeTourSteps(homeTour.name)}
          onClose={() => {
            const { id, code } = homeTour;
            setHomeTour(null);
            try {
              sessionStorage.setItem("tb_tour_admin", id);
            } catch {
              /* ignore */
            }
            router.push(`/t/${code}`);
          }}
          onUpgrade={() => {}}
        />
      ) : null}
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
          <span className="h-5 w-2 rounded-[3px] bg-mint" />
          <h2 className="font-anton text-2xl tracking-tight text-ink">My Tournaments</h2>
        </div>

        {trips !== null && trips.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                ["all", "All"],
                ["in_progress", "In Progress"],
                ["not_started", "Not Started"],
                ["finished", "Finished"],
              ] as const
            ).map(([key, label]) => {
              const active = statusFilter === key;
              const count = statusCounts[key];
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-extrabold transition ${
                    active
                      ? "bg-fairway-900 text-white"
                      : "border border-sand-100 bg-white text-slate-500"
                  }`}
                >
                  {label}
                  <span
                    className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-black ${
                      active ? "bg-white/20 text-white" : "bg-sand-50 text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {trips === null ? (
          <p className="mt-4 text-slate-400">Loading…</p>
        ) : trips.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              img="/brand/no-tournaments.png"
              title="No Tournaments Yet"
              message="Create your first tournament or join one with a code."
            />
          </div>
        ) : visibleTrips.length === 0 ? (
          <p className="mt-6 text-center text-sm font-semibold text-slate-400">
            No {STATUS_META[statusFilter as TripStatus].label.toLowerCase()} tournaments.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {visibleTrips.map((t) => (
              <div
                key={t.id}
                className={`rounded-2xl border p-5 shadow-sm ${
                  t.isPro
                    ? "border-accent/40 bg-accent/10"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <button
                  onClick={() => router.push(`/t/${t.joinCode}`)}
                  className="block w-full text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black ${STATUS_META[t.status].cls}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[t.status].dot}`} />
                        {STATUS_META[t.status].label}
                      </span>
                      <span className="shrink-0 rounded-full bg-sand-50 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-slate-400">
                        {t.role}
                      </span>
                      {t.isPro ? (
                        <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-ink">
                          Pro
                        </span>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs font-bold text-slate-400">
                      {t.joinCode}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-black text-ink">{t.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {[t.location, t.dates].filter(Boolean).join(" · ") || "-"}
                  </p>
                  <p className="mt-2 text-xs font-bold text-slate-400">
                    {t.playerCount} {t.playerCount === 1 ? "player" : "players"} ·{" "}
                    {t.roundCount} {t.roundCount === 1 ? "round" : "rounds"}
                  </p>
                  <p className="mt-3 text-sm font-black text-fairway-900">
                    Open ›
                  </p>
                </button>
                {t.role === "owner" || t.role === "admin" ? (
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
              <h2 className="font-anton text-2xl tracking-tight text-slate-400">
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
