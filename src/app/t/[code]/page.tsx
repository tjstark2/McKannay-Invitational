"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { TripView } from "@/features/trip/TripApp";
import { AuthShell } from "@/features/auth/AuthShell";
import {
  resolveTrip,
  getMembership,
  canViewTrip,
  requestToJoin,
  type TripRef,
  type MembershipState,
} from "@/lib/supabase/memberships";

type Gate =
  | { kind: "loading" }
  | { kind: "notfound" }
  | { kind: "view" }
  | { kind: "join"; trip: TripRef; status: "none" | "pending" };

export default function TripCodePage() {
  const params = useParams();
  const code = String(params.code ?? "");
  const { user, loading } = useAuth();
  const router = useRouter();
  const [gate, setGate] = useState<Gate>({ kind: "loading" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/signin?next=/t/${encodeURIComponent(code)}`);
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      setGate({ kind: "view" }); // seed mode / no backend — let it render
      return;
    }
    let active = true;
    (async () => {
      const trip = await resolveTrip(supabase, code);
      if (!active) return;
      if (!trip) {
        setGate({ kind: "notfound" });
        return;
      }
      const m: MembershipState = await getMembership(supabase, trip, user.id);
      if (!active) return;
      if (canViewTrip(m)) {
        setGate({ kind: "view" });
      } else {
        setGate({
          kind: "join",
          trip,
          status: m.status === "pending" ? "pending" : "none",
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [user, loading, code, router]);

  if (gate.kind === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f1]">
        <p className="text-3xl">⛳</p>
      </div>
    );
  }

  if (gate.kind === "view") {
    return <TripView code={code} />;
  }

  if (gate.kind === "notfound") {
    return (
      <AuthShell>
        <div className="text-center">
          <p className="text-4xl">🔍</p>
          <h1 className="mt-3 text-2xl font-black text-ink">
            Tournament not found
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            We couldn&apos;t find a tournament for the code{" "}
            <b className="text-ink">{code}</b>. Double-check the link.
          </p>
          <button
            onClick={() => router.push("/home")}
            className="mt-6 w-full rounded-2xl bg-fairway-900 px-4 py-3.5 font-black text-white"
          >
            Back to My Tournaments
          </button>
        </div>
      </AuthShell>
    );
  }

  // join gate
  async function ask() {
    if (gate.kind !== "join" || !user || busy) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setBusy(true);
    const res = await requestToJoin(supabase, gate.trip.id, user.id);
    setBusy(false);
    setGate({ kind: "join", trip: gate.trip, status: "pending" });
    void res;
  }

  return (
    <AuthShell>
      <div className="text-center">
        <p className="text-4xl">🏌️</p>
        <h1 className="mt-3 text-2xl font-black text-ink">{gate.trip.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {[gate.trip.location, gate.trip.dates].filter(Boolean).join(" · ")}
        </p>

        {gate.status === "pending" ? (
          <div className="mt-6 rounded-2xl border border-sand-100 bg-white p-5">
            <p className="font-black text-fairway-900">Request sent ✓</p>
            <p className="mt-1 text-sm text-slate-500">
              The organizer needs to approve you. You&apos;ll see this
              tournament on your dashboard once you&apos;re in.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-5 text-slate-600">
              You&apos;re not part of this tournament yet. Ask the organizer to
              let you in.
            </p>
            <button
              onClick={ask}
              disabled={busy}
              className="mt-6 w-full rounded-2xl bg-accent px-4 py-4 font-black text-ink disabled:opacity-50"
            >
              {busy ? "Sending…" : "Request to join"}
            </button>
          </>
        )}

        <button
          onClick={() => router.push("/home")}
          className="mt-3 w-full rounded-2xl border border-sand-100 bg-white px-4 py-3 text-sm font-bold text-fairway-900"
        >
          ← My Tournaments
        </button>
      </div>
    </AuthShell>
  );
}
