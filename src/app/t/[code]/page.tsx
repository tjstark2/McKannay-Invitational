"use client";

import { useEffect, useState } from "react";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
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
  setMyHandicap,
  type TripRef,
  type MembershipState,
} from "@/lib/supabase/memberships";

type Gate =
  | { kind: "loading" }
  | { kind: "notfound" }
  | { kind: "view" }
  | { kind: "handicap"; trip: TripRef }
  | { kind: "join"; trip: TripRef; status: "none" | "pending" };

export default function TripCodePage() {
  const params = useParams();
  const code = String(params.code ?? "");
  const { user, loading } = useAuth();
  const router = useRouter();
  const [gate, setGate] = useState<Gate>({ kind: "loading" });
  const [viewer, setViewer] = useState({ canManage: false, isOwner: false });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/signin?next=/t/${encodeURIComponent(code)}`);
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      setGate({ kind: "view" }); // seed mode / no backend - let it render
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
      setViewer({ canManage: m.canManage, isOwner: m.isOwner });
      if (canViewTrip(m)) {
        if (!m.isOwner && !m.handicapConfirmed) {
          setGate({ kind: "handicap", trip });
        } else {
          setGate({ kind: "view" });
        }
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
      <LoadingScreen />
    );
  }

  if (gate.kind === "view") {
    return (
      <TripView
        code={code}
        canManage={viewer.canManage}
        isOwner={viewer.isOwner}
      />
    );
  }

  if (gate.kind === "notfound") {
    return (
      <AuthShell>
        <div className="text-center">
          <p className="text-4xl">🔍</p>
          <h1 className="mt-3 text-2xl font-black text-ink">
            Tournament Not Found
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

  if (gate.kind === "handicap") {
    return (
      <HandicapSetup
        trip={gate.trip}
        onDone={() => setGate({ kind: "view" })}
      />
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
            <p className="font-black text-fairway-900">Request Sent ✓</p>
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

function HandicapSetup({
  trip,
  onDone,
}: {
  trip: TripRef;
  onDone: () => void;
}) {
  const [value, setValue] = useState("");
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const num = Number(value);
  const valid = value.trim() !== "" && !Number.isNaN(num) && num >= -10 && num <= 54;
  const canConfirm = valid && ack && !busy;

  async function confirm() {
    if (!canConfirm) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const res = await setMyHandicap(supabase, trip.id, num);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "Couldn't save your handicap. Try again.");
      return;
    }
    onDone();
  }

  return (
    <AuthShell>
      <div>
        <p className="text-4xl">⛳</p>
        <h1 className="mt-3 text-2xl font-black text-ink">Set Your Handicap</h1>
        <p className="mt-1 text-sm text-slate-500">
          For <b className="text-ink">{trip.name}</b>. This is the handicap
          used for you in this tournament only.
        </p>

        <div className="mt-6">
          <label className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
            Your handicap
          </label>
          <input
            inputMode="decimal"
            value={value}
            onChange={(e) => {
              setValue(e.target.value.replace(/[^0-9.\-]/g, ""));
              setError(null);
            }}
            placeholder="e.g. 12.4"
            className="mt-1.5 w-full rounded-2xl border-[1.5px] border-sand-200 bg-white px-4 py-3.5 text-base outline-none focus:border-fairway-900"
          />
        </div>

        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-black">Heads up - this locks once you confirm.</p>
          <p className="mt-1">
            After you confirm, you won&apos;t be able to change your handicap.
            Only the tournament admin can adjust it.
          </p>
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-fairway-900"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
          />
          <span className="text-sm text-slate-600">
            I understand my handicap will be locked and only the admin can change
            it.
          </span>
        </label>

        {error ? (
          <p className="mt-3 text-sm font-bold text-red-600">{error}</p>
        ) : null}

        <button
          onClick={confirm}
          disabled={!canConfirm}
          className="mt-5 w-full rounded-2xl bg-fairway-900 px-4 py-4 font-black text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Confirm and enter"}
        </button>
      </div>
    </AuthShell>
  );
}
